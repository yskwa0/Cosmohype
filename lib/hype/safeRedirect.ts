// =============================================================================
// lib/hype/safeRedirect.ts
//
// Open redirect 対策付きの内部 path validator。
// HYPE Owner 招待 flow の login callback で使う `?redirect=` param を検証する。
//
// 許可条件 (すべて満たすものだけ許可):
//   * `/` で始まる (相対 path)
//   * `//` で始まらない (protocol-relative URL 禁止 → open redirect 防止)
//   * `\\` を含まない (backslash 逃れ防止)
//   * prefix が allowlist に一致する
//
// 許可 prefix (invite flow 専用):
//   * /brand-admin/invite/setup
//   * /brand-admin/invite/accept
// =============================================================================

const ALLOWED_PREFIXES = [
  '/brand-admin/invite/setup',
  '/brand-admin/invite/accept',
] as const

const FALLBACK = '/brand-admin'

export function safeRedirect(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return FALLBACK
  const s = raw.trim()
  if (s.length === 0) return FALLBACK
  if (!s.startsWith('/')) return FALLBACK
  if (s.startsWith('//')) return FALLBACK
  if (s.includes('\\')) return FALLBACK
  for (const p of ALLOWED_PREFIXES) {
    if (s === p || s.startsWith(p + '?') || s.startsWith(p + '/')) {
      return s
    }
  }
  return FALLBACK
}
