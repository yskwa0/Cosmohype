// =============================================================================
// lib/hype/turnstile.ts
//
// Cloudflare Turnstile server-side token verify。
//
// - Client 側で widget から取得した token (cf-turnstile-response) を submit
// - Server 側で https://challenges.cloudflare.com/turnstile/v0/siteverify に POST
// - Secret は server-only env var (TURNSTILE_SECRET_KEY)
// - Test 環境: Cloudflare 公式 test key で「常に PASS」「常に FAIL」を選択可能
//     - PASS  site  = 1x00000000000000000000AA
//     - PASS  secret= 1x0000000000000000000000000000000AA
//     - FAIL  site  = 2x00000000000000000000AB
//     - FAIL  secret= 2x0000000000000000000000000000000AA
// - Production: Cloudflare dashboard で発行した real key に差し替え
// =============================================================================

import 'server-only'

interface VerifyResult {
  ok: boolean
  reason?: 'missing_token' | 'verify_failed' | 'timeout' | 'invalid_secret'
  errorCodes?: string[]
}

// If secret is missing (dev), verification is bypassed. Set TURNSTILE_ENFORCE=strict
// to fail-closed even without a secret. Prod deploys MUST set the secret.
export async function verifyTurnstile(params: {
  token:  string | null | undefined
  ip?:    string | null
}): Promise<VerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim() || ''
  const strict = process.env.TURNSTILE_ENFORCE === 'strict'

  if (!secret) {
    if (strict) return { ok: false, reason: 'invalid_secret' }
    // dev: secret 未設定 = bypass (Test/dev 環境の初期セットアップ用)
    return { ok: true }
  }

  const raw = (params.token ?? '').toString().trim()
  if (raw.length === 0) return { ok: false, reason: 'missing_token' }

  const body = new URLSearchParams()
  body.set('secret',   secret)
  body.set('response', raw)
  if (params.ip) body.set('remoteip', params.ip)

  const controller = new AbortController()
  const to = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: controller.signal,
    })
    if (!res.ok) return { ok: false, reason: 'verify_failed' }
    const json = await res.json() as {
      success: boolean
      'error-codes'?: string[]
    }
    if (json.success) return { ok: true }
    return { ok: false, reason: 'verify_failed', errorCodes: json['error-codes'] }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return { ok: false, reason: 'timeout' }
    return { ok: false, reason: 'verify_failed' }
  } finally {
    clearTimeout(to)
  }
}
