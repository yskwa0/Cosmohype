// AI HQ passwordless secret-URL session。
//
// - accessKey (URL path segment) が env AI_HQ_ACCESS_KEY と timing-safe に一致した場合のみ
//   HttpOnly / Secure / SameSite=Lax cookie を発行する。
// - cookie は HMAC-SHA256 で署名し、以降の API route は cookie 署名のみで許可判定する。
// - accessKey 自体は client に返さない、cookie にも入れない (署名の secret に用途を留める)。

import { createHmac, timingSafeEqual } from 'node:crypto'

export const AIHQ_COOKIE_NAME = 'aihq_sess'
// 8 時間で失効。 短めにして、URL 漏洩時の影響時間を制限する。
export const AIHQ_COOKIE_MAX_AGE_SEC = 60 * 60 * 8

function getAccessKey(): string {
  const k = process.env.AI_HQ_ACCESS_KEY
  if (!k || k.length < 32) {
    // 未設定・短すぎる場合は動作を停止 (fail-closed)。
    throw new Error('AI_HQ_ACCESS_KEY missing or too short')
  }
  return k
}

function sign(payload: string): string {
  return createHmac('sha256', getAccessKey()).update(payload).digest('base64url')
}

// timing-safe に accessKey を比較。
export function accessKeyMatches(candidate: string): boolean {
  const secret = getAccessKey()
  const a = Buffer.from(candidate, 'utf8')
  const b = Buffer.from(secret, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function createSessionToken(): string {
  const issuedAt = Date.now()
  const expiresAt = issuedAt + AIHQ_COOKIE_MAX_AGE_SEC * 1000
  const payload = `${issuedAt}.${expiresAt}`
  const sig = sign(payload)
  return `${payload}.${sig}`
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [issuedAtStr, expiresAtStr, sig] = parts
  const payload = `${issuedAtStr}.${expiresAtStr}`
  const expected = sign(payload)
  const a = Buffer.from(sig, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) return false
  if (!timingSafeEqual(a, b)) return false
  const expiresAt = Number.parseInt(expiresAtStr, 10)
  if (!Number.isFinite(expiresAt)) return false
  if (Date.now() > expiresAt) return false
  return true
}
