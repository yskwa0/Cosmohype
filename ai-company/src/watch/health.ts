// AI HQ Phase 2B: watch source health events (flood 防止つき)。
//
// 3 回連続失敗で 1 度だけ event を起票、成功で counter reset (fetch.ts 側)。
// event flood 防止のため agent_watch_state に "health_notified:<subject>" を持つ。

import type { AgentEventRow, AiHqSupabase } from '../types'

export interface HealthOpts {
  subject: string            // "research:<name>" or "github"
  newFailureCount: number    // 現在の consecutive_failures (0 or positive)
  title: string
  summary: string
  event_type: AgentEventRow['event_type']
  severity: AgentEventRow['severity']
}

export async function maybeEmitHealthEvent(admin: AiHqSupabase, o: HealthOpts): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyAdmin = admin as any
  const key = `health_notified:${o.subject}`
  const { data: stateRow } = await anyAdmin
    .from('agent_watch_state').select('value').eq('key', key).maybeSingle()
  const notified = stateRow?.value?.notified === true
  if (o.newFailureCount >= 3 && !notified) {
    await anyAdmin.from('agent_events').insert({
      event_type: o.event_type,
      source: 'watch_health',
      severity: o.severity,
      title: o.title,
      summary: o.summary,
      payload: { subject: o.subject, consecutive_failures: o.newFailureCount },
    })
    // Upsert state to mark notified
    await anyAdmin.from('agent_watch_state').upsert(
      { key, value: { notified: true, at: new Date().toISOString() }, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
    return true
  }
  if (o.newFailureCount === 0 && notified) {
    // Reset notified marker
    await anyAdmin.from('agent_watch_state').upsert(
      { key, value: { notified: false, at: new Date().toISOString() }, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
  }
  return false
}
