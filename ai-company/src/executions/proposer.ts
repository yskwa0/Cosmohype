// AI HQ Phase 3A.1: deliverable approved 時の execution_request auto-proposal。
//
// engineering_plan の approved deliverable に対してのみ、github_issue_create を提案。
// deterministic rule (追加 LLM call 0) で「Issue 化する価値があるか」を判定:
//   - task.priority >= 3
//   - content.problem / proposed_changes が非空 (実質的な engineering work)
//   - content 内 "not applicable", "skip", "already resolved" 等の keyword があれば skip
// 判定を通ったものだけ execution_request を INSERT (status=waiting_for_approval)。

import type { AiHqSupabase } from '../types'
import { canonicalPayload, allowedRepos } from './types'
import { makeIdempotencyKey } from './executor'

interface DeliverableSlim {
  id: string
  task_id: string | null
  thread_id: string | null
  agent_id: string
  deliverable_type: string
  title: string
  content: Record<string, unknown>
}

interface TaskSlim {
  id: string
  priority: number
  title: string
  description: string | null
}

const NON_ACTIONABLE_MARKERS = [
  'already resolved',
  'not applicable',
  'no action needed',
  '対応不要',
  '既に解決',
  '調査のみ',
  '様子を見る',
  '情報不足',
]

function isActionableEngineeringPlan(content: Record<string, unknown>, task: TaskSlim | null): { ok: boolean; reason?: string } {
  const problem = String(content.problem ?? '').trim()
  const proposed = String(content.proposed_changes ?? '').trim()
  if (problem.length < 30) return { ok: false, reason: 'problem too short' }
  if (proposed.length < 40) return { ok: false, reason: 'proposed_changes too short' }
  const combined = `${problem}\n${proposed}\n${String(content.suspected_cause ?? '')}`.toLowerCase()
  for (const marker of NON_ACTIONABLE_MARKERS) {
    if (combined.includes(marker.toLowerCase())) return { ok: false, reason: `contains non-actionable marker: ${marker}` }
  }
  if (task && task.priority < 3) return { ok: false, reason: `task priority ${task.priority} < 3` }
  return { ok: true }
}

function buildIssueBody(content: Record<string, unknown>): string {
  const sections: Array<[string, string]> = [
    ['Problem', String(content.problem ?? '').trim()],
    ['Suspected Cause', String(content.suspected_cause ?? '').trim()],
    ['Proposed Changes', String(content.proposed_changes ?? '').trim()],
    ['Risks', String(content.risks ?? '').trim()],
    ['Test Plan', String(content.test_plan ?? '').trim()],
    ['Rollback Plan', String(content.rollback_plan ?? '').trim()],
  ]
  const nonEmpty = sections.filter(([, v]) => v.length > 0)
  const bodyLines = nonEmpty.map(([k, v]) => `## ${k}\n${v}`)
  bodyLines.push('---')
  bodyLines.push('Generated from an approved Cosmohype AI HQ engineering draft.')
  return bodyLines.join('\n\n').slice(0, 7500)
}

/// deliverable approved 時に呼ぶ。 対象外なら null を返す (execution_request 作らない)。
export async function proposeExecutionForApprovedDeliverable(
  admin: AiHqSupabase,
  deliverableId: string,
): Promise<{ execution_request_id: string; created: true } | { created: false; reason: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyAdmin = admin as any

  const { data: d } = await anyAdmin
    .from('agent_deliverables')
    .select('id, task_id, thread_id, agent_id, deliverable_type, title, content, status')
    .eq('id', deliverableId)
    .maybeSingle()
  if (!d) return { created: false, reason: 'deliverable not found' }
  if (d.status !== 'approved') return { created: false, reason: `deliverable status ${d.status}, expected approved` }
  if (d.deliverable_type !== 'engineering_plan') return { created: false, reason: `type ${d.deliverable_type} not eligible for auto-proposal` }

  const del = d as DeliverableSlim & { status: string }

  // Task を取得
  let task: TaskSlim | null = null
  if (del.task_id) {
    const { data: t } = await anyAdmin.from('agent_tasks').select('id, priority, title, description').eq('id', del.task_id).maybeSingle()
    task = (t as TaskSlim | null) ?? null
  }

  const actionable = isActionableEngineeringPlan(del.content, task)
  if (!actionable.ok) return { created: false, reason: `non-actionable: ${actionable.reason}` }

  // repo allowlist 検証
  const allow = allowedRepos()
  if (allow.length === 0) return { created: false, reason: 'AI_HQ_GITHUB_ALLOWED_REPOS unset (no repo allowlist)' }
  // Phase 3A.1 は最初の allowlist entry を default target とする (通常 1 個運用)
  const first = allow[0]
  const [owner, repo] = first.split('/')
  if (!owner || !repo) return { created: false, reason: `allowlist entry ${first} invalid (expected owner/repo)` }

  // Labels は env override 可能 (Test env で既存 label のみ使うケース)。
  //   default: 'ai-hq,ai-suggested' (Prod 想定)
  //   env AI_HQ_ISSUE_LABELS が設定されていればそれを優先 (comma-separated、trim)
  const labelsEnv = process.env.AI_HQ_ISSUE_LABELS
  const labels = (labelsEnv ? labelsEnv.split(',').map((s) => s.trim()).filter(Boolean) : ['ai-hq', 'ai-suggested'])
  const payload = {
    owner,
    repo,
    title: (del.title ?? task?.title ?? 'AI HQ engineering suggestion').slice(0, 256),
    body: buildIssueBody(del.content),
    labels,
  }
  const idempotencyKey = makeIdempotencyKey('github_issue_create', canonicalPayload(payload), del.id)

  // 既存 duplicate 確認 (UNIQUE 制約に頼らず先に SELECT で丁寧に)
  const { data: existing } = await anyAdmin
    .from('agent_execution_requests')
    .select('id, status')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()
  if (existing) {
    return { created: false, reason: `duplicate idempotency_key (existing status=${existing.status})` }
  }

  const summary = `Create GitHub Issue in ${owner}/${repo}. No code change, no merge, no deploy.`
  const { data: ins, error } = await anyAdmin
    .from('agent_execution_requests')
    .insert({
      deliverable_id: del.id,
      task_id: del.task_id,
      agent_id: del.agent_id,
      execution_type: 'github_issue_create',
      title: payload.title,
      summary,
      payload,
      risk_level: 'low',
      status: 'waiting_for_approval',
      requires_ceo_approval: true,
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single()
  if (error) return { created: false, reason: `insert failed: ${error.message}` }
  return { execution_request_id: (ins as { id: string }).id, created: true }
}
