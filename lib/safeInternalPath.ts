// =============================================================================
// lib/safeInternalPath.ts
//
// URL クエリで受け取る `redirect` / `next` 系 param を「同一 origin 内部 path」
// として安全に採用してよいか判定する共通 helper。
//
// 許可条件 (すべて満たすものだけ返す):
//   * string
//   * `/` で始まる (absolute path)
//   * `//` で始まらない (protocol-relative → 外部 URL 化を防止)
//   * `\` を含まない (バックスラッシュ経由の URL parser 迂回対策)
//
// 上記を満たさない値は null を返し、呼出側が独自 fallback を選択する。
// 通常 `?? '/feed'` や `?? '/cosmohype-admin'` などの用途別 default と組合せる。
//
// Edge runtime (middleware / proxy.ts) からも Server Action / Server Component
// からも安全に import できる (Node.js API に依存しない)。
// =============================================================================

export function safeInternalPath(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  if (s.length === 0) return null
  if (!s.startsWith('/')) return null
  if (s.startsWith('//')) return null
  if (s.includes('\\')) return null
  return s
}
