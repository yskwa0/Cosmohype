// AI HQ Phase 2A: KPI snapshot 取得。 KPI_DEFINITIONS の各 KPI に対し
// current_24h と 7d_avg を計算、agent_kpi_snapshots に保存し、
// { kpi_id, current, avg7d, verdict } を配列で返す。
//
// SQL は 1 KPI につき 1 query (シンプル)。 存在しない table は skip して continue。

import { KPI_DEFINITIONS, verdict, type AnomalyVerdict } from './definitions'
import { jstDateString } from '../quiet-hours'
import type { AiHqSupabase } from '../types'

export interface KpiSnapshotResult {
  kpi_id: string
  description: string
  current_24h: number
  avg_7d: number
  verdict: AnomalyVerdict
}

async function scalar(admin: AiHqSupabase, sql: string): Promise<number> {
  // Supabase JS client は raw SQL を直接叩けないため、Supabase Management API を使わずに
  // 単純な count を .from().select({count: 'exact', head: true}) で取る形に落とす方が良いが、
  // 本 helper では filter 系 SQL を柔軟に受けたいので RPC を使わず fetch を直接叩く。
  // ここでは serverless で service_role 前提のため、Supabase の POST /rest/v1/rpc は不要、
  // 代わりに count 系は個別 .from() で処理する (呼び出し側で組み立てる)。
  throw new Error('scalar() should not be called; use fromCount()')
}

async function fromCount(
  admin: AiHqSupabase,
  table: string,
  createdAtCol: string,
  since: string,
  until: string | null,
  filter?: string,
): Promise<number> {
  // supabase-js の `.from(table).select('*', { count:'exact', head:true }).gte(col, since)` を使う。
  // filter 追加条件は「column=value / column IS NULL」の単純パターンのみサポート (KPI 側で保証)。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q: any = (admin as any).from(table).select('*', { count: 'exact', head: true }).gte(createdAtCol, since)
  if (until) q.lt(createdAtCol, until)
  if (filter === 'deleted_at IS NULL') q.is('deleted_at', null)
  const { count, error } = await q
  if (error) throw error
  return count ?? 0
}

/// 24h window の current と、7 日間の per-day count を平均した avg7d を返す。
export async function computeKpiSnapshot(
  admin: AiHqSupabase,
  nowUtc: Date = new Date(),
): Promise<KpiSnapshotResult[]> {
  const results: KpiSnapshotResult[] = []
  const jst_date = jstDateString(nowUtc)
  const cur_since = new Date(nowUtc.getTime() - 24 * 3600 * 1000).toISOString()
  const cur_until = nowUtc.toISOString()
  const prev_since = new Date(nowUtc.getTime() - 8 * 24 * 3600 * 1000).toISOString()
  const prev_until = new Date(nowUtc.getTime() - 24 * 3600 * 1000).toISOString()

  for (const kpi of KPI_DEFINITIONS) {
    try {
      const current = await fromCount(admin, kpi.table, kpi.createdAtCol, cur_since, cur_until, kpi.filter)
      const prev7d = await fromCount(admin, kpi.table, kpi.createdAtCol, prev_since, prev_until, kpi.filter)
      const avg = prev7d / 7
      const v = verdict(current, avg)
      results.push({ kpi_id: kpi.id, description: kpi.description, current_24h: current, avg_7d: avg, verdict: v })

      // snapshot に保存 (UNIQUE(kpi_id, jst_date, 24) で idempotent)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from('agent_kpi_snapshots').upsert(
        { kpi_id: kpi.id, jst_date, value: current, window_hours: 24, meta: { avg_7d: avg, prev7d } },
        { onConflict: 'kpi_id,jst_date,window_hours' },
      )
    } catch (err) {
      // table が Prod に無い等: warn to console, skip
      console.warn(`[kpi] skip ${kpi.id}:`, (err as Error).message)
    }
  }
  return results
}
