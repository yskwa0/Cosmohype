// =============================================================================
// lib/brandAdminDate.ts
//
// Brand Admin 表示専用の日時フォーマッタ。
//
// 方針:
//   DB は timestamptz を UTC で保持 (変更禁止)。表示層でのみ JST に変換する。
//   Intl.DateTimeFormat({ timeZone: 'Asia/Tokyo' }) を使い、
//   各ページで手動 +9h するのは禁止 (夏時間・境界越え等の事故防止)。
//
//   期間計算・DB query 条件は UTC のまま維持し、
//   ここは「ユーザーに見える文字列を作る」責務だけを持つ。
//
// server / client 両方から import されるため、'server-only' は付けない。
// =============================================================================

const JST_TIMEZONE = 'Asia/Tokyo'

// 内部: UTC/ISO 文字列 or Date を安全に Date に。
// 不正値は null を返し、呼び出し側で '—' 等にフォールバックさせる。
function toDate(input: string | number | Date | null | undefined): Date | null {
  if (input == null) return null
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return null
  return d
}

// "2026/08/12 15:08" (JST, minute 精度)
export function formatJSTDateTime(
  input: string | number | Date | null | undefined,
  fallback = '—'
): string {
  const d = toDate(input)
  if (!d) return fallback
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: JST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? ''
  const hh = get('hour') === '24' ? '00' : get('hour')
  return `${get('year')}/${get('month')}/${get('day')} ${hh}:${get('minute')}`
}

// "2026/08/12" (JST, 日付のみ)
export function formatJSTDate(
  input: string | number | Date | null | undefined,
  fallback = '—'
): string {
  const d = toDate(input)
  if (!d) return fallback
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: JST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}/${get('month')}/${get('day')}`
}
