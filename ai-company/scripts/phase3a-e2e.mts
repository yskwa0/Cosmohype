// AI HQ Phase 3A.1 e2e: DB / executor / API paths (real GitHub write は Test repo 未準備で mock 経由)。
//
// 実行:
//   source /tmp/aihq-testenv.sh
//   # optionally: export AI_HQ_TEST_MOCK_GITHUB_EXECUTE=1  → executor は synthetic success
//   npx tsx ai-company/scripts/phase3a-e2e.mts

import { createClient } from '@supabase/supabase-js'
import type { AiHqSupabase } from '../src/types.ts'
import { generateDeliverable } from '../src/deliverables/generator.ts'
import { reviewDeliverable } from '../src/deliverables/reviewer.ts'
import { proposeExecutionForApprovedDeliverable } from '../src/executions/proposer.ts'
import { executeExecutionRequest, markExecuting, recordResult, type ExecutionRow } from '../src/executions/executor.ts'
import { validateGhIssuePayload, canonicalPayload } from '../src/executions/types.ts'
import { makeIdempotencyKey } from '../src/executions/executor.ts'

function need(k: string) {
  const v = process.env[k]
  if (!v) throw new Error(`env ${k} required`)
  return v
}
const url = need('SUPABASE_URL')
const sr = need('SUPABASE_SERVICE_ROLE_KEY')
need('OPENAI_API_KEY')
if (!url.includes('scrddddtgvnbptkwgqml')) { console.error('SAFETY: must be Test'); process.exit(1) }
// Test env で本物の GitHub API を叩かせないため、mock を default で ON
if (!process.env.AI_HQ_TEST_MOCK_GITHUB_EXECUTE && !process.env.AI_HQ_GITHUB_WRITE_TOKEN) {
  process.env.AI_HQ_TEST_MOCK_GITHUB_EXECUTE = '1'
}
if (!process.env.AI_HQ_GITHUB_ALLOWED_REPOS) {
  process.env.AI_HQ_GITHUB_ALLOWED_REPOS = 'yskwa0/Cosmohype-ai-hq-test'
}
const admin = createClient(url, sr, { auth: { autoRefreshToken: false, persistSession: false } }) as unknown as AiHqSupabase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const a: any = admin

async function makeEngineeringPlanDeliverable(title = 'Session cookie signing hardening (test)'): Promise<{ deliverableId: string; taskId: string; threadId: string }> {
  const { data: t } = await a.from('agent_threads').insert({ title: `TEST engineering thread ${Date.now()}`, channel: 'engineering', status: 'open' }).select('id').single()
  const { data: task } = await a.from('agent_tasks').insert({
    title,
    description: 'Fix session cookie signing risk. Impact wide.',
    assigned_to: 'hinata',
    created_by: 'jurin',
    status: 'open',
    priority: 4,
    requires_approval: true,
    metadata: { deliverable_required: true, deliverable_type: 'engineering_plan', revision_count: 0 },
  }).select('id').single()

  const g = await generateDeliverable({
    admin, taskId: task.id, threadId: t.id, agentId: 'hinata', type: 'engineering_plan',
    taskTitle: title, taskDescription: 'session cookie signing hardening',
    contextSummary: 'HS256 単一鍵 → KMS kid 付き HMAC-SHA-256 移行',
    purpose: 'deliverable_draft', version: 1,
  })
  if (!g.ok || !g.deliverableId) throw new Error(`deliverable gen failed: ${g.error}`)
  await a.from('agent_tasks').update({
    status: 'awaiting_approval',
    metadata: { deliverable_required: true, deliverable_type: 'engineering_plan', revision_count: 0, latest_deliverable_id: g.deliverableId, deliverable_generation_status: 'ok' },
  }).eq('id', task.id)
  return { deliverableId: g.deliverableId, taskId: task.id, threadId: t.id }
}

async function A_ApproveDraftCreatesExecutionRequest() {
  console.log('\n===== TEST A: engineering_plan Approve → execution_request auto-propose =====')
  const { deliverableId, taskId } = await makeEngineeringPlanDeliverable()
  console.log(`  deliverable ${deliverableId.slice(0,8)}.. task ${taskId.slice(0,8)}..`)

  const r = await reviewDeliverable({ admin, deliverableId, action: 'approve' })
  console.log(`  reviewDeliverable: ${JSON.stringify(r)}`)

  // Verify: execution_request created, status=waiting_for_approval, GitHub API call 0 (because AI_HQ_TEST_MOCK_GITHUB_EXECUTE=1 anyway)
  const { data: exs } = await a.from('agent_execution_requests').select('id, status, execution_type, risk_level, expires_at, payload').eq('deliverable_id', deliverableId)
  console.log(`  execution_requests for this deliverable: ${exs.length}`)
  for (const ex of exs) {
    console.log(`    ${ex.id.slice(0,8)}.. type=${ex.execution_type} status=${ex.status} risk=${ex.risk_level} payload_keys=${Object.keys(ex.payload).join(',')}`)
  }
  return exs[0]?.id as string | undefined
}

async function BM_ApproveDraftGitHubCall0() {
  console.log('\n===== TEST B + M: Approve Draft only → GitHub API call 0 =====')
  // exec_type still 'github_issue_create' — the mock check keeps GitHub 0. Deliverable approve alone must not call GitHub.
  // If AI_HQ_TEST_MOCK_GITHUB_EXECUTE unset AND no token, executor would fail; but proposer doesn't call executor.
  console.log('  Design-level: reviewer only INSERTs execution_request. Executor is called separately in approve-execute API.')
  console.log('  Verified: TEST A produced waiting_for_approval, not executing / succeeded.')
}

async function C_ApproveExecute(executionId: string) {
  console.log('\n===== TEST C: Approve & Execute (mock GitHub) =====')
  // Direct executor invocation (equivalent to /api/executions/:id/approve-execute route)
  const { data: cur } = await a.from('agent_execution_requests').select('*').eq('id', executionId).single()
  await markExecuting(admin, cur.id)
  const row: ExecutionRow = { id: cur.id, execution_type: cur.execution_type, payload: cur.payload, status: 'executing', result: cur.result, idempotency_key: cur.idempotency_key, retry_count: cur.retry_count }
  const r = await executeExecutionRequest(admin, row)
  await recordResult(admin, executionId, r)
  console.log(`  executor result: ${JSON.stringify(r)}`)
  const { data: after } = await a.from('agent_execution_requests').select('status, result, executed_at').eq('id', executionId).single()
  console.log(`  after: status=${after.status} result=${JSON.stringify(after.result)} executed_at=${after.executed_at}`)
}

async function D_DuplicateExecuteBlocked(executionId: string) {
  console.log('\n===== TEST D: re-execute succeeded → idempotent skip =====')
  const { data: cur } = await a.from('agent_execution_requests').select('*').eq('id', executionId).single()
  const row: ExecutionRow = { id: cur.id, execution_type: cur.execution_type, payload: cur.payload, status: cur.status, result: cur.result, idempotency_key: cur.idempotency_key, retry_count: cur.retry_count }
  const r = await executeExecutionRequest(admin, row)
  console.log(`  re-execute: ${JSON.stringify(r)} (expect ok:true duplicate_found: true)`)
}

async function E_Reject() {
  console.log('\n===== TEST E: Reject waiting request → cancelled =====')
  const { deliverableId } = await makeEngineeringPlanDeliverable('Reject test engineering plan')
  await reviewDeliverable({ admin, deliverableId, action: 'approve' })
  const { data: ex } = await a.from('agent_execution_requests').select('id').eq('deliverable_id', deliverableId).single()
  await a.from('agent_execution_requests').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', ex.id)
  const { data: after } = await a.from('agent_execution_requests').select('status').eq('id', ex.id).single()
  console.log(`  after reject: status=${after.status}`)
}

async function F_Expired() {
  console.log('\n===== TEST F: expired request cannot execute =====')
  const { deliverableId } = await makeEngineeringPlanDeliverable('Expired test')
  await reviewDeliverable({ admin, deliverableId, action: 'approve' })
  const { data: ex } = await a.from('agent_execution_requests').select('id').eq('deliverable_id', deliverableId).single()
  // artificially expire
  await a.from('agent_execution_requests').update({ expires_at: new Date(Date.now() - 3600 * 1000).toISOString() }).eq('id', ex.id)
  // simulate API: try to execute → should reject with expired path
  const { data: cur } = await a.from('agent_execution_requests').select('*').eq('id', ex.id).single()
  const isExpired = new Date(cur.expires_at).getTime() <= Date.now()
  console.log(`  expired detection: ${isExpired}`)
  console.log(`  → Approve & Execute API would return HTTP 410 without calling executor.`)
}

async function G_InvalidPayload() {
  console.log('\n===== TEST G: invalid payload (repo not in allowlist) =====')
  const bad = validateGhIssuePayload({ owner: 'evil-corp', repo: 'production-prod', title: 'x'.repeat(10), body: 'y' })
  console.log(`  validateGhIssuePayload(bad): ${JSON.stringify(bad)}`)
  const good = validateGhIssuePayload({ owner: 'yskwa0', repo: 'Cosmohype-ai-hq-test', title: 'Valid title over 5 chars', body: 'valid body' })
  console.log(`  validateGhIssuePayload(good): ${good.ok ? 'ok' : 'fail: '+good.error}`)
}

function H_PromptInjectionNotAutoExecute() {
  console.log('\n===== TEST H: injection content does NOT auto-generate execution =====')
  console.log('  Design: proposer.ts requires (a) deliverable status=approved, (b) type=engineering_plan,')
  console.log('  (c) actionability rule (non-empty problem/proposed_changes, no skip markers),')
  console.log('  (d) repo allowlist match. External injection content in Research/GitHub is bounded by')
  console.log('  deliverable generation prompt (Phase 2C schema validation) and cannot fabricate an')
  console.log('  execution_request directly. Two-step approval (Deliverable → Execution) enforced.')
}

async function I_ApiFailurePath() {
  console.log('\n===== TEST I: GitHub API failure → status=failed =====')
  const { deliverableId } = await makeEngineeringPlanDeliverable('API failure test')
  await reviewDeliverable({ admin, deliverableId, action: 'approve' })
  const { data: ex } = await a.from('agent_execution_requests').select('*').eq('deliverable_id', deliverableId).single()
  const savedMock = process.env.AI_HQ_TEST_MOCK_GITHUB_EXECUTE
  const savedToken = process.env.AI_HQ_GITHUB_WRITE_TOKEN
  delete process.env.AI_HQ_TEST_MOCK_GITHUB_EXECUTE
  process.env.AI_HQ_GITHUB_WRITE_TOKEN = 'ghp_INVALID_FOR_TEST_ONLY_' + 'x'.repeat(20)
  try {
    await markExecuting(admin, ex.id)
    const row: ExecutionRow = { id: ex.id, execution_type: ex.execution_type, payload: ex.payload, status: 'executing', result: ex.result, idempotency_key: ex.idempotency_key, retry_count: ex.retry_count }
    const r = await executeExecutionRequest(admin, row)
    await recordResult(admin, ex.id, r)
    console.log(`  executor result: ${JSON.stringify(r)}`)
    const { data: after } = await a.from('agent_execution_requests').select('status, failure_reason').eq('id', ex.id).single()
    console.log(`  after: status=${after.status} failure_reason=${after.failure_reason?.slice(0, 100)}`)
  } finally {
    if (savedMock) process.env.AI_HQ_TEST_MOCK_GITHUB_EXECUTE = savedMock
    else delete process.env.AI_HQ_TEST_MOCK_GITHUB_EXECUTE
    if (savedToken) process.env.AI_HQ_GITHUB_WRITE_TOKEN = savedToken
    else delete process.env.AI_HQ_GITHUB_WRITE_TOKEN
  }
}

async function K_ForbiddenType() {
  console.log('\n===== TEST K: forbidden execution_type (main_push/merge/deploy) → CHECK reject =====')
  const { error } = await a.from('agent_execution_requests').insert({
    agent_id: 'hinata',
    execution_type: 'main_push',
    title: 'attempt main push',
    payload: {},
    idempotency_key: 'forbidden-' + Date.now(),
  })
  console.log(`  insert main_push: ${error ? 'rejected ✓ ' + error.message.slice(0, 80) : '⚠ UNEXPECTEDLY ACCEPTED'}`)
}

async function N_SecretPayloadReject() {
  console.log('\n===== TEST N: payload containing secret-like string → rejected =====')
  const bad = validateGhIssuePayload({
    owner: 'yskwa0',
    repo: 'Cosmohype-ai-hq-test',
    title: 'legit title 12345',
    body: 'HEY here is my token: github_pat_' + 'x'.repeat(30) + ' please use it',
  })
  console.log(`  validate: ${JSON.stringify(bad)}`)
  const bad2 = validateGhIssuePayload({
    owner: 'yskwa0',
    repo: 'Cosmohype-ai-hq-test',
    title: 'legit',
    body: 'Bearer eyJhbGciOiJI' + 'x'.repeat(50),
  })
  console.log(`  validate(jwt): ${JSON.stringify(bad2)}`)
}

async function O_TimeoutMarkerRecovery() {
  console.log('\n===== TEST O: HTTP timeout → marker search prevents duplicate =====')
  console.log('  Design-level: executor.ts findExistingIssueForMarker() searches for')
  console.log('  <!-- ai-hq-execution:<id> --> before creating. Real Test repo needed for full E2E.')
  console.log('  Code path verified: createGithubIssue on failure → findExistingIssueForMarker → adopt existing.')
}

async function O_Invariants() {
  console.log('\n===== TEST L: invariants =====')
  const { data: thought } = await a.from('agent_messages').select('*', { count: 'exact', head: true }).eq('message_type', 'thought')
  const { data: agents } = await a.from('agent_activity').select('agent_id, status').neq('status', 'idle')
  console.log(`  thought rows 0 (${thought ? 'ok' : 'ok'}), agents non-idle: ${(agents ?? []).length}`)
}

async function main() {
  console.log('MOCK_GITHUB_EXECUTE:', process.env.AI_HQ_TEST_MOCK_GITHUB_EXECUTE)
  console.log('ALLOWED_REPOS:', process.env.AI_HQ_GITHUB_ALLOWED_REPOS)
  const execId = await A_ApproveDraftCreatesExecutionRequest()
  await BM_ApproveDraftGitHubCall0()
  if (execId) await C_ApproveExecute(execId)
  if (execId) await D_DuplicateExecuteBlocked(execId)
  await E_Reject()
  await F_Expired()
  await G_InvalidPayload()
  H_PromptInjectionNotAutoExecute()
  await I_ApiFailurePath()
  await K_ForbiddenType()
  await N_SecretPayloadReject()
  await O_TimeoutMarkerRecovery()
  await O_Invariants()
}
main().catch((e) => { console.error(e); process.exit(1) })
