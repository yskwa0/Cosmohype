// AI HQ Phase 2A: KPI anomaly → agent_events INSERT。
// anomaly ありなら 1 event を per-KPI で起票、無ければ何もしない。

import { computeKpiSnapshot } from './snapshot'
import type { AgentEventRow, AiHqSupabase } from '../types'

export interface DetectResult {
  anomalies: number
  events: string[] // 起票した event id list
  skipped: number
}

export async function detectKpiAnomaliesAndEmit(admin: AiHqSupabase): Promise<DetectResult> {
  const snapshots = await computeKpiSnapshot(admin)
  const anomalies = snapshots.filter((s) => s.verdict.isAnomaly)
  const events: string[] = []
  for (const s of anomalies) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any).from('agent_events').insert({
      event_type: 'kpi_anomaly',
      source: 'kpi_check',
      severity: s.verdict.severity,
      title: `${s.description}: ${s.verdict.reason}`,
      summary: `24h=${s.current_24h}, 7d_avg=${s.avg_7d.toFixed(1)}, verdict=${s.verdict.reason}`,
      payload: { kpi_id: s.kpi_id, current_24h: s.current_24h, avg_7d: s.avg_7d, verdict: s.verdict },
    }).select('id').single()
    if (!error && data) events.push((data as { id: string }).id)
  }
  return {
    anomalies: anomalies.length,
    events,
    skipped: snapshots.length - anomalies.length,
  }
}
