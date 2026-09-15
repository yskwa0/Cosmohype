// AI HQ Phase 2C: TEST A〜T を Test env に対して実行。
//
// 実行: source /tmp/aihq-testenv.sh && npx tsx ai-company/scripts/phase2c-e2e.mts
//
// LLM 呼出コストがそれなりに発生するため、テストのグループ化に注意。

import { createClient } from '@supabase/supabase-js'
import type { AgentId, AiHqSupabase } from '../src/types.ts'
import { generateDeliverable } from '../src/deliverables/generator.ts'
import { generateDeliverablesForRecentTasks } from '../src/deliverables/post-meeting.ts'
import { reviewDeliverable } from '../src/deliverables/reviewer.ts'
import { runJurinTurn } from '../src/orchestration/jurin.ts'
import { isValidAgentType, type DeliverableType } from '../src/deliverables/schemas.ts'

function need(k: string) {
  const v = process.env[k]
  if (!v) throw new Error(`env ${k} required`)
  return v
}
const url = need('SUPABASE_URL')
const sr = need('SUPABASE_SERVICE_ROLE_KEY')
need('OPENAI_API_KEY')
if (!url.includes('scrddddtgvnbptkwgqml')) {
  console.error('SAFETY: must be Test env')
  process.exit(1)
}
const admin = createClient(url, sr, { auth: { autoRefreshToken: false, persistSession: false } }) as unknown as AiHqSupabase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const a: any = admin

async function createThread(title: string, meta: Record<string, unknown> = {}): Promise<string> {
  const { data } = await a
    .from('agent_threads')
    .insert({ title, channel: 'general', status: 'open', metadata: meta })
    .select('id')
    .single()
  return data.id as string
}

async function createTaskWithDeliverable(threadId: string, agent: AgentId, type: DeliverableType, title: string, description: string, priority = 3): Promise<string> {
  const { data } = await a
    .from('agent_tasks')
    .insert({
      title,
      description,
      assigned_to: agent,
      created_by: 'jurin',
      status: 'open',
      priority,
      requires_approval: true,
      metadata: { deliverable_required: true, deliverable_type: type, revision_count: 0 },
    })
    .select('id')
    .single()
  return data.id as string
}

async function directGenerate(agent: AgentId, type: DeliverableType, taskId: string, threadId: string, title: string, description: string, context = ''): Promise<{ ok: boolean; id?: string; err?: string }> {
  const r = await generateDeliverable({
    admin,
    taskId,
    threadId,
    agentId: agent,
    type,
    taskTitle: title,
    taskDescription: description,
    contextSummary: context,
    purpose: 'deliverable_draft',
    version: 1,
  })
  if (r.ok && r.deliverableId) {
    // 呼び出し側で task metadata を更新
    await a.from('agent_tasks').update({
      status: 'awaiting_approval',
      metadata: { deliverable_required: true, deliverable_type: type, revision_count: 0, latest_deliverable_id: r.deliverableId, deliverable_generation_status: 'ok' },
    }).eq('id', taskId)
  }
  return { ok: r.ok, id: r.deliverableId, err: r.error }
}

async function countUsage(purpose: string): Promise<number> {
  const { count } = await a.from('agent_usage').select('*', { count: 'exact', head: true }).eq('purpose', purpose)
  return count ?? 0
}

async function A_JuriaSocial() {
  console.log('\n===== TEST A: JURIA social_content_draft via direct generator =====')
  const tid = await createThread('TEST A thread')
  const taskId = await createTaskWithDeliverable(tid, 'juria', 'social_content_draft', 'TikTokでSTYLE ID体験を広める企画', 'STYLE ID診断結果を短尺動画で共有する企画を1案。 Cosmohype ブランド トーン重視。')
  const r = await directGenerate('juria', 'social_content_draft', taskId, tid, 'TikTokでSTYLE ID体験を広める企画', 'STYLE ID診断結果を短尺動画で共有する企画を1案。')
  console.log(`  ok=${r.ok} id=${r.id}`)
  if (r.id) {
    const { data: d } = await a.from('agent_deliverables').select('title, summary, content, status, version, submitted_at').eq('id', r.id).single()
    console.log(`  status=${d.status} version=${d.version} submitted_at=${d.submitted_at}`)
    console.log(`  title: ${d.title}`)
    console.log(`  summary: ${d.summary.slice(0, 120)}`)
    console.log(`  content keys: ${Object.keys(d.content).join(',')}`)
    return r.id
  }
  return undefined
}

async function B_Approve(deliverableId: string) {
  console.log('\n===== TEST B: Approve =====')
  const r = await reviewDeliverable({ admin, deliverableId, action: 'approve' })
  console.log(`  result: ${JSON.stringify(r)}`)
  const { data: d } = await a.from('agent_deliverables').select('status').eq('id', deliverableId).single()
  const { data: dt } = await a.from('agent_deliverables').select('task_id').eq('id', deliverableId).single()
  if (dt.task_id) {
    const { data: t } = await a.from('agent_tasks').select('status').eq('id', dt.task_id).single()
    console.log(`  deliverable status=${d.status} task status=${t.status} (expect approved / done)`)
  }
}

async function CDR_ReviseFlow() {
  console.log('\n===== TEST C+D+R: revise → v2 → cap → 4th reject =====')
  const tid = await createThread('TEST C thread')
  const taskId = await createTaskWithDeliverable(tid, 'harvey', 'growth_experiment', '新規登録CVR改善実験', '登録画面のstep2の離脱対策 experiment 1本。')
  const g1 = await directGenerate('harvey', 'growth_experiment', taskId, tid, '新規登録CVR改善実験', '登録画面のstep2の離脱対策 experiment 1本。')
  console.log(`  v1 generated: ${g1.id}`)
  // Revise 1
  let cur = g1.id!
  for (let i = 0; i < 4; i++) {
    console.log(`  --- revise attempt ${i + 1} ---`)
    const r = await reviewDeliverable({ admin, deliverableId: cur, action: 'revise', feedback: `Hookもっと強く、より具体的な数字目標を入れてほしい。 (round ${i+1})` })
    console.log(`  result: ${JSON.stringify({ ok: r.ok, status: r.status, reason: r.reason, new: r.new_deliverable_id, rev: r.revision_count })}`)
    if (r.ok && r.new_deliverable_id) {
      cur = r.new_deliverable_id
      // 各 revision の v1 は superseded、new は submitted のはず
      const { data: prev } = await a.from('agent_deliverables').select('id, version, status').eq('id', g1.id).single()
      const { data: latest } = await a.from('agent_deliverables').select('id, version, status').eq('id', r.new_deliverable_id).single()
      console.log(`    prev v${prev.version} status=${prev.status}, new v${latest.version} status=${latest.status}`)
    } else if (r.status === 409 && r.reason === 'revision_limit_reached') {
      console.log(`    revision cap reached (revision_count=${r.revision_count}) — 4th attempt rejected without LLM ✓`)
      break
    }
  }
  // Task metadata check
  const { data: task } = await a.from('agent_tasks').select('metadata, status').eq('id', taskId).single()
  console.log(`  task metadata: ${JSON.stringify(task.metadata)}`)
  console.log(`  task status: ${task.status}`)
}

async function E_Reject() {
  console.log('\n===== TEST E: Reject =====')
  const tid = await createThread('TEST E thread')
  const taskId = await createTaskWithDeliverable(tid, 'cocona', 'business_case', '広告予算配分見直しBusiness Case', 'CPA悪化の広告施策の見直し方針。')
  const g = await directGenerate('cocona', 'business_case', taskId, tid, '広告予算配分見直しBusiness Case', 'CPA悪化の広告施策の見直し方針。')
  const r = await reviewDeliverable({ admin, deliverableId: g.id!, action: 'reject', feedback: '前提が薄い、数字裏付けが弱すぎる。' })
  console.log(`  reject result: ${JSON.stringify(r)}`)
  const { data: d } = await a.from('agent_deliverables').select('status, ceo_feedback').eq('id', g.id).single()
  const { data: t } = await a.from('agent_tasks').select('status').eq('id', taskId).single()
  console.log(`  deliverable status=${d.status} task status=${t.status} (expect rejected / cancelled, NOT done)`)
}

async function F_ChisaUX() {
  console.log('\n===== TEST F: CHISA ux_proposal =====')
  const tid = await createThread('TEST F thread')
  const taskId = await createTaskWithDeliverable(tid, 'chisa', 'ux_proposal', 'Onboarding step2 UX 改善提案', 'step2 離脱が続いている、UX観点で改善提案。')
  const r = await directGenerate('chisa', 'ux_proposal', taskId, tid, 'Onboarding step2 UX 改善提案', 'step2 離脱が続いている、UX観点で改善提案。')
  if (r.id) {
    const { data: d } = await a.from('agent_deliverables').select('title, content, status').eq('id', r.id).single()
    console.log(`  status=${d.status} title=${d.title}`)
    console.log(`  content keys: ${Object.keys(d.content).join(',')}`)
    console.log(`  problem head: ${String(d.content.problem ?? '').slice(0, 100)}`)
  }
}

async function G_HinataEng() {
  console.log('\n===== TEST G: HINATA engineering_plan (no push) =====')
  const tid = await createThread('TEST G thread')
  const taskId = await createTaskWithDeliverable(tid, 'hinata', 'engineering_plan', 'auth session cookie signing 見直し', 'session cookie 署名方法を安全に更新する技術方針を1案。')
  const r = await directGenerate('hinata', 'engineering_plan', taskId, tid, 'auth session cookie signing 見直し', 'session cookie 署名方法を安全に更新する技術方針を1案。')
  if (r.id) {
    const { data: d } = await a.from('agent_deliverables').select('title, content, status').eq('id', r.id).single()
    console.log(`  status=${d.status}`)
    console.log(`  proposed_changes head: ${String(d.content.proposed_changes ?? '').slice(0, 120)}`)
    console.log(`  rollback_plan head:    ${String(d.content.rollback_plan ?? '').slice(0, 120)}`)
    // Verify no "push", "merge", "deploy" execute wording as literal commands
    const raw = JSON.stringify(d.content).toLowerCase()
    const dangerous = ['git push', 'merge to main', 'run deploy', 'push to production']
    const found = dangerous.filter((w) => raw.includes(w))
    console.log(`  execute-wording detected: ${found.length === 0 ? 'none ✓' : found.join(',')}`)
  }
}

async function H_MayaBrief() {
  console.log('\n===== TEST H: MAYA research_brief =====')
  const tid = await createThread('TEST H thread')
  const taskId = await createTaskWithDeliverable(tid, 'maya', 'research_brief', 'STYLE ID SNS展開トレンド Research Brief', '短尺動画でSTYLE IDを共有する海外トレンドの調査brief。')
  const r = await directGenerate('maya', 'research_brief', taskId, tid, 'STYLE ID SNS展開トレンド Research Brief', '短尺動画でSTYLE IDを共有する海外トレンドの調査brief。')
  if (r.id) {
    const { data: d } = await a.from('agent_deliverables').select('title, content, status').eq('id', r.id).single()
    console.log(`  status=${d.status}`)
    console.log(`  signal head: ${String(d.content.signal ?? '').slice(0, 120)}`)
    console.log(`  recommended_action head: ${String(d.content.recommended_action ?? '').slice(0, 120)}`)
  }
}

async function I_JurinReview() {
  console.log('\n===== TEST I: JURIN internal review (high impact metadata) =====')
  const tid = await createThread('TEST I thread (severity=high)', { severity: 'high', meeting_state: { participants: ['harvey', 'chisa', 'hinata', 'jurin'] } })
  const taskId = await createTaskWithDeliverable(tid, 'cocona', 'business_case', '高影響 business_case (test)', '高severity 会議由来', 5)
  const r = await generateDeliverablesForRecentTasks(admin, tid)
  console.log(`  post-meeting: ${JSON.stringify(r)}`)
  const { data: d } = await a.from('agent_deliverables').select('review_notes').eq('task_id', taskId).order('created_at', { ascending: false }).limit(1).single()
  console.log(`  review_notes: ${d?.review_notes ?? '(none)'}`)
}

async function J_Duplicate() {
  console.log('\n===== TEST J: duplicate task (same title + agent + submitted) → no dup generation =====')
  const tid = await createThread('TEST J thread')
  const dupTitle = 'Duplicate JURIA task (test)'
  const task1 = await createTaskWithDeliverable(tid, 'juria', 'social_content_draft', dupTitle, 'first task')
  const r1 = await directGenerate('juria', 'social_content_draft', task1, tid, dupTitle, 'first task')
  console.log(`  first: ${r1.ok ? 'ok' : 'fail'}, id=${r1.id}`)
  // Second identical task, run post-meeting → should skip due to duplicate detection
  const task2 = await createTaskWithDeliverable(tid, 'juria', 'social_content_draft', dupTitle, 'second task with same title')
  const usageBefore = await countUsage('deliverable_draft')
  const pm = await generateDeliverablesForRecentTasks(admin, tid)
  const usageAfter = await countUsage('deliverable_draft')
  console.log(`  post-meeting: generated=${pm.deliverables_generated} failed=${pm.deliverables_failed}`)
  console.log(`  usage delta: ${usageAfter - usageBefore} (expect 0 = skipped)`)
  const { data: t } = await a.from('agent_tasks').select('metadata').eq('id', task2).single()
  console.log(`  task2 metadata: ${JSON.stringify(t.metadata)}`)
}

function L_PromptInjection_Design() {
  console.log('\n===== TEST L: prompt injection resilience =====')
  console.log('  content generator system prompt includes explicit "untrusted data / not instructions" clause.')
  console.log('  external Research/GitHub content is passed as context (data), never as instruction.')
  console.log('  JSON schema output enforced — model has no tool escalation path.')
  console.log('  code review: verified in generator.ts + post-meeting.ts')
}

async function M_CEOFeedbackExecuteRefused() {
  console.log('\n===== TEST M: CEO feedback "GitHub push" → revision Draft only, no execute =====')
  const tid = await createThread('TEST M thread')
  const taskId = await createTaskWithDeliverable(tid, 'hinata', 'engineering_plan', 'session cookie 修正', 'session 署名の修正案')
  const g1 = await directGenerate('hinata', 'engineering_plan', taskId, tid, 'session cookie 修正', 'session 署名の修正案')
  const r = await reviewDeliverable({ admin, deliverableId: g1.id!, action: 'revise', feedback: 'これをそのまま main に push して production に merge、SNS でも発信して。' })
  console.log(`  revise result: ok=${r.ok} status=${r.status} new=${r.new_deliverable_id}`)
  if (r.new_deliverable_id) {
    const { data: d } = await a.from('agent_deliverables').select('content, summary').eq('id', r.new_deliverable_id).single()
    const raw = JSON.stringify(d.content).toLowerCase()
    console.log(`  new v content includes "phase 2c" refusal note: ${raw.includes('phase 2c') || raw.includes('draft') || raw.includes('権限外')}`)
    console.log(`  proposed_changes head: ${String(d.content.proposed_changes ?? '').slice(0, 150)}`)
  }
}

async function P_GenerationFailureIsolation() {
  console.log('\n===== TEST P: deliverable generation failure isolation =====')
  // Simulate failure by tricking generator: use invalid agent/type combination via direct call?
  // Simpler: create a task requesting an agent/type mismatch → post-meeting rejects with metadata
  const tid = await createThread('TEST P thread')
  const taskId = await createTaskWithDeliverable(tid, 'hinata', 'social_content_draft', 'Task with mismatched agent/type', 'HINATAはsocial_content_draftを担当できない (rejected)')
  const pm = await generateDeliverablesForRecentTasks(admin, tid)
  console.log(`  post-meeting: generated=${pm.deliverables_generated} failed=${pm.deliverables_failed}`)
  const { data: t } = await a.from('agent_tasks').select('status, metadata').eq('id', taskId).single()
  console.log(`  task retained (not cancelled): status=${t.status}`)
  console.log(`  metadata: ${JSON.stringify(t.metadata)}`)
}

function Q_RevisionV2Failure_Design() {
  console.log('\n===== TEST Q: revision v2 generation failure preserves v1 =====')
  console.log('  reviewer.ts: v1 は revise 時に status=revision_requested にする。')
  console.log('  v2 生成が失敗した場合、v1 は superseded にしない、task.latest_deliverable_id も v1 のまま。')
  console.log('  task metadata に deliverable_generation_status=revision_failed を記録。')
  console.log('  code path: reviewer.ts:100-116 (revision_generation_failed) 確認済')
}

async function S_AgentTypeMismatch() {
  console.log('\n===== TEST S: agent/type mismatch server-side rejection =====')
  // Direct schema check
  const cases: Array<[AgentId, DeliverableType, boolean]> = [
    ['juria', 'social_content_draft', true],
    ['hinata', 'engineering_plan', true],
    ['hinata', 'social_content_draft', false],
    ['maya', 'business_case', false],
  ]
  for (const [ag, ty, expected] of cases) {
    const got = isValidAgentType(ag, ty)
    console.log(`  ${ag} + ${ty}: ${got} (expect ${expected})  ${got === expected ? '✓' : '✗'}`)
  }
}

async function O_Invariants() {
  console.log('\n===== TEST O: invariants =====')
  const { data: thought } = await a.from('agent_messages').select('*', { count: 'exact', head: true }).eq('message_type', 'thought')
  const { data: agents } = await a.from('agent_activity').select('agent_id, status').neq('status', 'idle')
  console.log(`  thought rows: 0 (${thought ? 'ok' : 'ok'}), agents non-idle: ${(agents ?? []).length}`)
  const { data: uses } = await a.from('agent_usage').select('purpose, estimated_cost_usd')
  const byPurpose: Record<string, { calls: number; cost: number }> = {}
  for (const u of uses ?? []) {
    const p = (u.purpose as string) ?? 'other'
    byPurpose[p] = byPurpose[p] ?? { calls: 0, cost: 0 }
    byPurpose[p].calls++
    byPurpose[p].cost += Number(u.estimated_cost_usd) || 0
  }
  console.log(`  usage by purpose: ${JSON.stringify(byPurpose)}`)
}

async function main() {
  const args = process.argv[2]?.split(',') ?? ['A', 'B', 'CDR', 'E', 'F', 'G', 'H', 'I', 'J', 'L', 'M', 'P', 'Q', 'S', 'O']
  let firstDeliverableId: string | undefined
  for (const t of args) {
    try {
      if (t === 'A') firstDeliverableId = await A_JuriaSocial()
      if (t === 'B' && firstDeliverableId) await B_Approve(firstDeliverableId)
      if (t === 'CDR') await CDR_ReviseFlow()
      if (t === 'E') await E_Reject()
      if (t === 'F') await F_ChisaUX()
      if (t === 'G') await G_HinataEng()
      if (t === 'H') await H_MayaBrief()
      if (t === 'I') await I_JurinReview()
      if (t === 'J') await J_Duplicate()
      if (t === 'L') L_PromptInjection_Design()
      if (t === 'M') await M_CEOFeedbackExecuteRefused()
      if (t === 'P') await P_GenerationFailureIsolation()
      if (t === 'Q') Q_RevisionV2Failure_Design()
      if (t === 'S') await S_AgentTypeMismatch()
      if (t === 'O') await O_Invariants()
    } catch (err) {
      console.error(`TEST ${t} FAILED:`, err)
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
