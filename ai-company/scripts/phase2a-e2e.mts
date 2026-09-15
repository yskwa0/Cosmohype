// AI HQ Phase 2A: TEST A〜H を Test env に対して実 invoke する。
//
// 実行:
//   source /tmp/aihq-testenv.sh   # SUPABASE_URL=Test, keys=Test, OPENAI_API_KEY
//   npx tsx ai-company/scripts/phase2a-e2e.mts
//
// 各 TEST は独立 case として run + summary print。

import { createClient } from '@supabase/supabase-js'
import type { AgentEventRow, AiHqSupabase } from '../src/types.ts'
import { runSpontaneousMeeting } from '../src/meetings/spontaneous.ts'
import { runScheduledSlot } from '../src/meetings/scheduled.ts'
import { isQuietHoursJst } from '../src/quiet-hours.ts'

function need(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`env ${name} required`)
  return v
}
const url = need('SUPABASE_URL')
const sr = need('SUPABASE_SERVICE_ROLE_KEY')
need('OPENAI_API_KEY')

if (!url.includes('scrddddtgvnbptkwgqml')) {
  console.error('SAFETY: SUPABASE_URL must point at Test env (scrddddtgvnbptkwgqml). Got:', url)
  process.exit(1)
}

const admin = createClient(url, sr, { auth: { autoRefreshToken: false, persistSession: false } }) as unknown as AiHqSupabase

async function insertEvent(fields: Partial<AgentEventRow> & { event_type: AgentEventRow['event_type']; title: string; summary: string; severity: AgentEventRow['severity'] }): Promise<AgentEventRow> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('agent_events')
    .insert({ source: 'phase2a-test', payload: {}, ...fields })
    .select('*')
    .single()
  if (error) throw error
  return data as AgentEventRow
}

async function countAgentMessages(threadId: string): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (admin as any)
    .from('agent_messages')
    .select('*', { count: 'exact', head: true })
    .eq('thread_id', threadId)
  return count ?? 0
}

async function summarizeThread(threadId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: msgs } = await (admin as any)
    .from('agent_messages')
    .select('sender_type, sender_agent, message_type')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: decisions } = await (admin as any)
    .from('agent_decisions').select('id').eq('thread_id', threadId)
  const participants = new Set<string>()
  for (const m of msgs ?? []) {
    if (m.sender_agent) participants.add(m.sender_agent)
  }
  return {
    msg_count: msgs?.length ?? 0,
    participants: [...participants],
    decisions: decisions?.length ?? 0,
  }
}

async function testA_MorningEmpty() {
  console.log('\n===== TEST A: Morning Meeting (empty state) =====')
  // clean any prior scheduled_run for today so we can re-run this test
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('agent_scheduled_runs').delete().eq('slot', 'morning').eq('jst_date', new Date().toISOString().slice(0, 10))
  const r = await runScheduledSlot(admin, 'morning')
  console.log('result:', r.status, 'threadId:', r.threadId)
  if (r.threadId) console.log(await summarizeThread(r.threadId))
}

async function testB_KpiAnomaly() {
  console.log('\n===== TEST B: KPI anomaly → HARVEY spontaneous meeting =====')
  const ev = await insertEvent({
    event_type: 'kpi_anomaly',
    severity: 'high',
    title: '新規登録の急減',
    summary: '7 日平均比 −60%。 昨日以降、登録画面手前の流入が原因の可能性あり。',
    payload: { kpi_id: 'new_users', current_24h: 1, avg_7d: 5.0 },
  })
  const m = await runSpontaneousMeeting(admin, ev)
  console.log('meeting:', m)
  if (m) console.log(await summarizeThread(m.threadId))
}

async function testC_MayaTrend() {
  console.log('\n===== TEST C: MAYA research signal (low sev, JURIN 不参加想定) =====')
  const ev = await insertEvent({
    event_type: 'research_signal',
    severity: 'low',
    title: 'US Gen-Z ショートフォーマット動画で "outfit-only cinema" 系が伸びている',
    summary: 'TikTok 界隈で movie-title-poster を模した OOTD が急伸。 Cosmohype のブランド観点で参考価値あり。',
    payload: {},
  })
  const m = await runSpontaneousMeeting(admin, ev)
  console.log('meeting:', m)
  if (m) console.log(await summarizeThread(m.threadId))
}

async function testD_CoconaRisk() {
  console.log('\n===== TEST D: COCONA business risk → HARVEY 相談 + JURIN escalation =====')
  const ev = await insertEvent({
    event_type: 'business_risk',
    severity: 'high',
    title: '検討中の広告施策で CPA が想定を超える恐れ',
    summary: '想定 CPA 800円だが直近 test 環境データでは 2,400円。 継続判断が必要。',
    payload: { assumed_cpa: 800, observed_cpa: 2400 },
  })
  const m = await runSpontaneousMeeting(admin, ev)
  console.log('meeting:', m)
  if (m) console.log(await summarizeThread(m.threadId))
}

async function testE_QuietHours() {
  console.log('\n===== TEST E: Quiet Hours pending event =====')
  // Quiet Hours 判定を強制するため、event を manual insert (no_dispatch=true 相当) して runSpontaneous を通さない。
  const ev = await insertEvent({
    event_type: 'product_signal',
    severity: 'medium',
    title: '深夜観測: ユーザーが onboarding step2 で離脱',
    summary: '直近 4 件連続で step2 abandoned。 UX 検証必要だが Quiet Hours のため翌朝処理予定。',
    payload: {},
  })
  console.log('inserted event:', ev.id, 'status:', ev.status)
  // 実際の Quiet Hours 判定は clock 依存。 ここでは isQuietHoursJst() の現状値を表示するだけ。
  console.log('isQuietHoursJst (right now):', isQuietHoursJst())
  console.log('この event は Morning Meeting が pending events を drain する経路で処理される想定。')
}

async function testF_LoopProtection() {
  console.log('\n===== TEST F: peer chain limit =====')
  // manual event を injecting し、meeting_state を人工的に max に近づけて request_peer が reject されるか確認
  const ev = await insertEvent({
    event_type: 'manual',
    severity: 'medium',
    title: 'peer loop protection test',
    summary: 'HARVEY が peer request を連発した場合 limit で reject される必要あり。',
    payload: {},
  })
  const m = await runSpontaneousMeeting(admin, ev)
  console.log('meeting:', m)
  if (m) {
    const summary = await summarizeThread(m.threadId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: t } = await (admin as any)
      .from('agent_threads').select('metadata').eq('id', m.threadId).single()
    console.log('summary:', summary)
    console.log('meeting_state:', t?.metadata?.meeting_state)
    console.log('participants <= 4:', summary.participants.length <= 4)
  }
}

async function testG_Idempotency() {
  console.log('\n===== TEST G: same slot twice → second is skipped =====')
  const today = new Date().toISOString().slice(0, 10)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('agent_scheduled_runs').delete().eq('slot', 'progress').eq('jst_date', today)
  const r1 = await runScheduledSlot(admin, 'progress')
  console.log('first  run status:', r1.status)
  const r2 = await runScheduledSlot(admin, 'progress')
  console.log('second run status:', r2.status)
  console.log('idempotent:', r1.status === 'completed' && r2.status === 'skipped')
}

async function testH_JstDateBoundary() {
  console.log('\n===== TEST H: JST date boundary — 23:00 UTC = 08:00 JST next day =====')
  // fake clock via arg-passing to jstDateString
  const { jstDateString, inferSlotFromUtc } = await import('../src/quiet-hours.ts')
  const cases: Array<[string, string, string | null]> = [
    ['2026-09-15T22:59:00Z', '2026-09-16', null],
    ['2026-09-15T23:00:00Z', '2026-09-16', 'morning'],
    ['2026-09-15T14:59:00Z', '2026-09-15', null],
    ['2026-09-15T13:00:00Z', '2026-09-15', 'daily'],
    ['2026-09-15T03:00:00Z', '2026-09-15', 'kpi'],
    ['2026-09-15T09:00:00Z', '2026-09-15', 'progress'],
  ]
  for (const [iso, expectDate, expectSlot] of cases) {
    const d = new Date(iso)
    const dateStr = jstDateString(d)
    const slot = inferSlotFromUtc(d)
    const okDate = dateStr === expectDate
    const okSlot = slot === expectSlot
    console.log(`  ${iso}: date=${dateStr}(${okDate ? 'ok' : `expected ${expectDate}`}) slot=${slot}(${okSlot ? 'ok' : `expected ${expectSlot}`})`)
  }
}

async function main() {
  const cases = process.argv[2] ? process.argv[2].split(',') : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  for (const c of cases) {
    try {
      if (c === 'A') await testA_MorningEmpty()
      if (c === 'B') await testB_KpiAnomaly()
      if (c === 'C') await testC_MayaTrend()
      if (c === 'D') await testD_CoconaRisk()
      if (c === 'E') await testE_QuietHours()
      if (c === 'F') await testF_LoopProtection()
      if (c === 'G') await testG_Idempotency()
      if (c === 'H') await testH_JstDateBoundary()
    } catch (err) {
      console.error(`TEST ${c} FAILED:`, err)
    }
  }
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
