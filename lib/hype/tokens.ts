// =============================================================================
// lib/hype/tokens.ts
//
// HYPE Owner 招待の opaque token 生成 / sha256 hash。
// - raw token は 32 bytes URL-safe base64 (256 bit)
// - DB には sha256(raw) hex のみ保存 (raw は絶対に永続化しない)
// - accept 時に raw を hash して DB 側で照合
// =============================================================================

import 'server-only'
import { randomBytes, createHash } from 'node:crypto'

export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashOpaqueToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex')
}

/**
 * IP 文字列を invitation 監査用に片方向 hash。
 * ・生 IP を DB に保存しない (プライバシー配慮)
 * ・rate limit / dedup 用途に足りる程度の識別性を確保
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null
  const trimmed = ip.trim()
  if (!trimmed) return null
  return createHash('sha256').update(trimmed, 'utf8').digest('hex')
}
