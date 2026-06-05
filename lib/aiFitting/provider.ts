// FASHN.ai 連携のプロバイダー層。
// 本接続時はこのファイルだけを修正すればよい。

export type TryOnRequest = {
  personImageUrl: string
  garmentImageUrl: string
  tryonId: string
}

export type TryOnResult =
  | { success: true; resultImageUrl: string }
  | { success: false; error: string }

/**
 * バーチャル試着を実行する。
 *
 * ## FASHN.ai 本接続時の差し込み手順
 * 1. .env.local に FASHN_API_KEY を追加する
 * 2. 下記の TODO コメント箇所を実際のAPIコールに置き換える
 * 3. FASHN.ai は非同期ジョブなので、
 *    - POST /v1/run でジョブ投入 → job_id 取得
 *    - GET /v1/status/{job_id} をポーリング or Webhook で完了確認
 *    - 完了後 result_url を取得して返す
 * 4. API Route 側 (app/api/ai-fitting/route.ts) で status を completed/failed に更新する
 */
export async function runTryOn(req: TryOnRequest): Promise<TryOnResult> {
  // TODO: FASHN.ai API 本接続
  // const apiKey = process.env.FASHN_API_KEY
  // if (!apiKey) throw new Error('FASHN_API_KEY is not set')
  //
  // const res = await fetch('https://api.fashn.ai/v1/run', {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     model_image: req.personImageUrl,
  //     garment_image: req.garmentImageUrl,
  //     category: 'tops',       // or 'bottoms' | 'one-pieces'
  //   }),
  // })
  // const data = await res.json()
  // if (!res.ok) return { success: false, error: data.error ?? 'API error' }
  // // --- 非同期ポーリングの例 ---
  // for (let i = 0; i < 30; i++) {
  //   await new Promise(r => setTimeout(r, 2000))
  //   const status = await fetch(`https://api.fashn.ai/v1/status/${data.id}`, {
  //     headers: { Authorization: `Bearer ${apiKey}` },
  //   }).then(r => r.json())
  //   if (status.status === 'completed') return { success: true, resultImageUrl: status.output[0] }
  //   if (status.status === 'failed') return { success: false, error: status.error ?? 'Failed' }
  // }
  // return { success: false, error: 'Timeout' }

  // 現在はモック: pending のまま処理キューに積まれた扱いにする
  return { success: false, error: 'FASHN.ai API is not yet connected' }
}
