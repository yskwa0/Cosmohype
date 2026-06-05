export type TryOnRequest = {
  personImageUrl: string
  garmentImageUrl: string
  tryonId: string
}

export type TryOnResult =
  | { success: true; resultImageUrl: string }
  | { success: false; error: string }

type FashnRunResponse = {
  id?: string
  error?: { message?: string } | string | null
  message?: string
}

type FashnStatusResponse = {
  id?: string
  status?: string
  error?: { name?: string; message?: string } | null
  output?: string[]
}

export async function runTryOn(req: TryOnRequest): Promise<TryOnResult> {
  const apiKey = process.env.FASHN_API_KEY
  if (!apiKey) return { success: false, error: 'FASHN_API_KEY is not set' }

  // ── 1. ジョブ投入 ────────────────────────────────────────────────
  let runData: FashnRunResponse
  try {
    const res = await fetch('https://api.fashn.ai/v1/run', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_name: 'tryon-v1.6',
        inputs: {
          model_image: req.personImageUrl,
          garment_image: req.garmentImageUrl,
        },
      }),
    })
    runData = await res.json()
    if (!res.ok) {
      const msg = typeof runData.error === 'object'
        ? (runData.error?.message ?? runData.message)
        : (runData.message ?? 'API error')
      return { success: false, error: msg ?? 'API error' }
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' }
  }

  if (runData.error || !runData.id) {
    const msg = typeof runData.error === 'object'
      ? (runData.error?.message ?? 'Unknown error')
      : String(runData.error ?? 'No job ID returned')
    return { success: false, error: msg }
  }

  const jobId = runData.id

  // ── 2. ポーリング（3秒 × 最大40回 = 120秒） ─────────────────────
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000))

    let statusData: FashnStatusResponse
    try {
      const res = await fetch(`https://api.fashn.ai/v1/status/${jobId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      statusData = await res.json()
    } catch {
      continue
    }

    if (statusData.status === 'completed' && statusData.output?.[0]) {
      return { success: true, resultImageUrl: statusData.output[0] }
    }
    if (statusData.status === 'failed') {
      return { success: false, error: statusData.error?.message ?? 'Job failed' }
    }
    // 'starting' | 'processing' → 継続
  }

  return { success: false, error: 'AI処理がタイムアウトしました（120秒）' }
}
