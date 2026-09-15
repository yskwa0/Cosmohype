// AI HQ Phase 2A: 定例会 (morning/kpi/progress/daily) orchestrator。
//
// 各 slot は agent_scheduled_runs へ (slot, jst_date) UNIQUE で INSERT を先に試み、
// 二重発火時は 23505 で ON CONFLICT → skip (idempotency)。
// 会議 thread を作成し、必要な agent だけ呼ぶ (JURIN 単独で終わることも許容)。

import type { AgentId, AiHqSupabase, ScheduledSlot } from '../types'
import { jstDateString } from '../quiet-hours'
import { runJurinTurn } from '../orchestration/jurin'
import { detectKpiAnomaliesAndEmit } from '../kpi/detector'
import { runSpontaneousMeeting } from './spontaneous'
import { computeKpiSnapshot } from '../kpi/snapshot'
import { callSpecialistOnce } from '../orchestration/specialist'

export interface ScheduledResult {
  slot: ScheduledSlot
  jst_date: string
  runId: string
  status: 'started' | 'completed' | 'skipped' | 'failed'
  threadId?: string
  detail: Record<string, unknown>
}

async function tryStartRun(
  admin: AiHqSupabase,
  slot: ScheduledSlot,
  jst_date: string,
): Promise<{ started: boolean; runId?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('agent_scheduled_runs')
    .insert({ slot, jst_date, status: 'started' })
    .select('id')
    .single()
  if (error) {
    // duplicate (23505) or other → not started
    return { started: false }
  }
  return { started: true, runId: (data as { id: string }).id }
}

async function completeRun(admin: AiHqSupabase, runId: string, threadId: string, detail: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('agent_scheduled_runs')
    .update({ status: 'completed', completed_at: new Date().toISOString(), thread_id: threadId, detail })
    .eq('id', runId)
}

async function failRun(admin: AiHqSupabase, runId: string, err: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('agent_scheduled_runs')
    .update({ status: 'failed', completed_at: new Date().toISOString(), error: err })
    .eq('id', runId)
}

async function createScheduledThread(
  admin: AiHqSupabase,
  slot: ScheduledSlot,
  jst_date: string,
): Promise<string> {
  const titles: Record<ScheduledSlot, string> = {
    morning: `Morning Meeting ${jst_date}`,
    kpi: `KPI Check ${jst_date}`,
    progress: `Progress Check ${jst_date}`,
    daily: `Daily Report ${jst_date}`,
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('agent_threads')
    .insert({
      title: titles[slot],
      channel: 'general',
      status: 'open',
      metadata: { slot, jst_date },
    })
    .select('id')
    .single()
  if (error) throw new Error(`thread create failed: ${(error as Error).message}`)
  return (data as { id: string }).id
}

// -----------------------------------------------------------------------------
// slot handlers
// -----------------------------------------------------------------------------

async function runMorning(admin: AiHqSupabase, threadId: string): Promise<Record<string, unknown>> {
  // 前日の open task / 昨日の Decision を軽く見る。 case が無ければ JURIN 単独で完結。
  const y = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: openTasks } = await (admin as any)
    .from('agent_tasks')
    .select('id, title, assigned_to, priority, status')
    .in('status', ['open', 'in_progress'])
    .order('priority', { ascending: false })
    .limit(10)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pendingEvents } = await (admin as any)
    .from('agent_events')
    .select('id, event_type, source, severity, title, summary, payload, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10)

  const ceoLike = `【Morning Meeting】${new Date().toISOString().slice(0, 10)}
前日以降の open task: ${openTasks?.length ?? 0} 件
Quiet Hours 中に発生した pending event: ${pendingEvents?.length ?? 0} 件

タスクの中で今日の Priority に含めるべきものを 3 個までピック。
pending event がある場合は spontaneous meeting へ回すか、朝会内で処理するか判断。
案件が無ければ JURIN のみで簡潔に終わってください (specialist を無理に呼ばない)。`

  const res = await runJurinTurn({ admin, threadId, ceoMessage: ceoLike })

  // pending events を drain (severity 順に順次 spontaneous meeting へ)
  const drained: string[] = []
  for (const ev of pendingEvents ?? []) {
    try {
      const r = await runSpontaneousMeeting(admin, ev as never)
      if (r) drained.push(r.threadId)
    } catch (err) {
      console.error('[morning] drain event failed', ev.id, err)
    }
  }
  return {
    open_tasks: openTasks?.length ?? 0,
    pending_events_drained: drained.length,
    jurin_result: res,
  }
}

async function runKpi(admin: AiHqSupabase, threadId: string): Promise<Record<string, unknown>> {
  const snapshot = await computeKpiSnapshot(admin)
  const anomalies = snapshot.filter((s) => s.verdict.isAnomaly)

  // まずは HARVEY 単独で数字を確認 (問題無ければここで終了)
  const context = snapshot
    .map((s) => `${s.description}: 24h=${s.current_24h}, 7d_avg=${s.avg_7d.toFixed(1)}, verdict=${s.verdict.reason}`)
    .join('\n')
  await callSpecialistOnce({
    admin,
    threadId,
    specialistId: 'harvey',
    question:
      anomalies.length === 0
        ? '本日の主要 KPI に大きな異常は見当たりません。 現状を CEO 向けに 2〜3 行で要約してください。'
        : `${anomalies.length} 件の指標で 7d 平均比の異常を検知。 内容を CEO 向けに 3〜5 行で要約し、対応方針を提示してください。`,
    contextSummary: `【24h KPI snapshot】\n${context}`,
    model: 'gpt-5.6-terra',
    enablePeerTool: false,
  })

  // anomaly ありなら detector で event を書いておく (spontaneous meeting は separate cycle)
  let events: string[] = []
  if (anomalies.length > 0) {
    const r = await detectKpiAnomaliesAndEmit(admin)
    events = r.events
  }
  return { anomalies: anomalies.length, kpi_events_emitted: events.length }
}

async function runProgress(admin: AiHqSupabase, threadId: string): Promise<Record<string, unknown>> {
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const iso = todayStart.toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: openTasks } = await (admin as any)
    .from('agent_tasks')
    .select('id, title, assigned_to, priority, status')
    .in('status', ['open', 'in_progress'])
    .order('priority', { ascending: false })
    .limit(20)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: todayDecisions } = await (admin as any)
    .from('agent_decisions')
    .select('id, summary, decided_by')
    .gte('created_at', iso)

  const ceoLike = `【Progress Check】${new Date().toISOString().slice(0, 10)}
open/in_progress task: ${openTasks?.length ?? 0}
今日作られた Decision: ${todayDecisions?.length ?? 0}

未着手 or blocked task があれば short summary を出し、担当と priority を確認。
Phase 1 制約: 実 execute はしないので "完了" 判定はしないこと。`
  const res = await runJurinTurn({ admin, threadId, ceoMessage: ceoLike })
  return { open_tasks: openTasks?.length ?? 0, today_decisions: todayDecisions?.length ?? 0, jurin_result: res }
}

async function runDaily(admin: AiHqSupabase, threadId: string, jst_date: string): Promise<Record<string, unknown>> {
  const dayStart = new Date()
  dayStart.setUTCHours(0, 0, 0, 0)
  const iso = dayStart.toISOString()

  const [tasksRes, decisionsRes, eventsRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('agent_tasks').select('id, title, status').gte('created_at', iso),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('agent_decisions').select('id, summary').gte('created_at', iso),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('agent_events').select('id, event_type, severity').gte('created_at', iso),
  ])

  const ceoLike = `【Daily Report】${jst_date}
今日作られた Task: ${tasksRes.data?.length ?? 0}
今日の Decision: ${decisionsRes.data?.length ?? 0}
検知された Event: ${eventsRes.data?.length ?? 0}

CEO 向けに簡潔に日報 (今日起きたこと / Decision / 作成 Task / 未解決 / 明日の Priority 候補) を書いてください。
長文にしない。 5-8 行程度。`
  const res = await runJurinTurn({ admin, threadId, ceoMessage: ceoLike })

  // 日報を agent_reports にも保存
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('agent_reports').insert({
    agent_id: 'jurin',
    report_type: 'daily_report',
    summary: `${jst_date} daily`,
    detail: res.finalText,
  })
  return {
    tasks_today: tasksRes.data?.length ?? 0,
    decisions_today: decisionsRes.data?.length ?? 0,
    events_today: eventsRes.data?.length ?? 0,
    jurin_result: res,
  }
}

// -----------------------------------------------------------------------------
// exported entry
// -----------------------------------------------------------------------------

export async function runScheduledSlot(
  admin: AiHqSupabase,
  slot: ScheduledSlot,
  nowUtc: Date = new Date(),
): Promise<ScheduledResult> {
  const jst_date = jstDateString(nowUtc)
  const start = await tryStartRun(admin, slot, jst_date)
  if (!start.started) {
    return { slot, jst_date, runId: '', status: 'skipped', detail: { reason: 'idempotent_skip' } }
  }
  const runId = start.runId!
  try {
    const threadId = await createScheduledThread(admin, slot, jst_date)
    let detail: Record<string, unknown> = {}
    if (slot === 'morning') detail = await runMorning(admin, threadId)
    else if (slot === 'kpi') detail = await runKpi(admin, threadId)
    else if (slot === 'progress') detail = await runProgress(admin, threadId)
    else if (slot === 'daily') detail = await runDaily(admin, threadId, jst_date)
    await completeRun(admin, runId, threadId, detail)
    return { slot, jst_date, runId, threadId, status: 'completed', detail }
  } catch (err) {
    await failRun(admin, runId, (err as Error).message)
    return { slot, jst_date, runId, status: 'failed', detail: { error: (err as Error).message } }
  }
}
