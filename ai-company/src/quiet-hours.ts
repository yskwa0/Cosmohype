// AI HQ Phase 2A: Quiet Hours (JST 22:30〜07:30) 判定。
//
// - Quiet Hours 内で発生した spontaneous event は critical 以外 hold (agent_events.status='pending'、quiet_queued=true)。
// - 翌 Morning Meeting (08:00 JST) で JURIN が drain。
// - Cronの JST slot (morning/kpi/progress/daily) 自体は Quiet Hours の影響を受けない (定時は動く)。

export function isQuietHoursJst(nowUtc: Date = new Date()): boolean {
  const jst = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000)
  const hour = jst.getUTCHours()
  const minute = jst.getUTCMinutes()
  const t = hour * 60 + minute
  const start = 22 * 60 + 30 // 22:30
  const end = 7 * 60 + 30    // 07:30
  // 跨ぎ: 22:30 <= t OR t < 07:30
  return t >= start || t < end
}

/// nowUtc から見て JST の "業務日" (Y-M-D)。 定例会 slot の jst_date と一致させる。
export function jstDateString(nowUtc: Date = new Date()): string {
  const jst = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000)
  const y = jst.getUTCFullYear()
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(jst.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/// UTC 時刻から JST slot を推定 (cron 実行時の slot 判定用、+/- 30 分の余裕)。
export function inferSlotFromUtc(nowUtc: Date = new Date()): 'morning' | 'kpi' | 'progress' | 'daily' | null {
  const jst = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000)
  const hour = jst.getUTCHours()
  const minute = jst.getUTCMinutes()
  const t = hour * 60 + minute
  const win = (target: number) => t >= target - 30 && t <= target + 30
  if (win(8 * 60)) return 'morning'
  if (win(12 * 60)) return 'kpi'
  if (win(18 * 60)) return 'progress'
  if (win(22 * 60)) return 'daily'
  return null
}
