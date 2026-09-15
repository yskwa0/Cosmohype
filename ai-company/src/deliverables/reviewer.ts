// AI HQ Phase 2C: CEO review workflow (approve / revise / reject)。
//
// - approve: deliverable.status=approved、task.status=done
// - revise:  revision_count が 3 未満なら agent が v_next を生成、以降 revision_count++
//            3 以上なら API level で HTTP 409 reject (LLM 0)
//   v2 生成成功後のみ v1 を superseded にする (failure 時は latest_deliverable_id 維持)
// - reject: deliverable.status=rejected、task.status=cancelled

import type { AgentId, AiHqSupabase } from '../types'
import { generateDeliverable } from './generator'
import type { DeliverableType } from './schemas'

const MAX_REVISION_COUNT = 3

export type ReviewAction = 'approve' | 'revise' | 'reject'

export interface ReviewInput {
  admin: AiHqSupabase
  deliverableId: string
  action: ReviewAction
  feedback?: string // for revise/reject
}

export interface ReviewResult {
  ok: boolean
  status: number // HTTP-style
  reason?: string
  new_deliverable_id?: string
  revision_count?: number
}

interface DeliverableRow {
  id: string
  task_id: string | null
  thread_id: string | null
  agent_id: AgentId
  deliverable_type: DeliverableType
  title: string
  summary: string
  content: Record<string, unknown>
  status: string
  version: number
  parent_deliverable_id: string | null
}

interface TaskRow {
  id: string
  title: string
  description: string
  metadata: Record<string, unknown>
}

export async function reviewDeliverable(input: ReviewInput): Promise<ReviewResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyAdmin = input.admin as any
  const { data: d } = await anyAdmin
    .from('agent_deliverables')
    .select('id, task_id, thread_id, agent_id, deliverable_type, title, summary, content, status, version, parent_deliverable_id')
    .eq('id', input.deliverableId)
    .maybeSingle()
  if (!d) return { ok: false, status: 404, reason: 'deliverable not found' }
  const del = d as DeliverableRow
  if (del.status !== 'submitted' && input.action !== 'reject') {
    // 既に処理済み or superseded など。 reject だけは常時許可 (record only)
    if (del.status === 'approved' || del.status === 'rejected' || del.status === 'superseded') {
      return { ok: false, status: 409, reason: `already ${del.status}` }
    }
  }

  const now = new Date().toISOString()

  if (input.action === 'approve') {
    await anyAdmin
      .from('agent_deliverables')
      .update({ status: 'approved', reviewed_at: now, updated_at: now })
      .eq('id', del.id)
    if (del.task_id) {
      await anyAdmin
        .from('agent_tasks')
        .update({ status: 'done', updated_at: now })
        .eq('id', del.task_id)
    }
    return { ok: true, status: 200 }
  }

  if (input.action === 'reject') {
    await anyAdmin
      .from('agent_deliverables')
      .update({ status: 'rejected', ceo_feedback: input.feedback ?? null, reviewed_at: now, updated_at: now })
      .eq('id', del.id)
    if (del.task_id) {
      // reject = task cancelled (done ではなく)
      await anyAdmin
        .from('agent_tasks')
        .update({ status: 'cancelled', updated_at: now })
        .eq('id', del.task_id)
    }
    return { ok: true, status: 200 }
  }

  // action === 'revise'
  if (!del.task_id) return { ok: false, status: 400, reason: 'revise requires task context' }
  const { data: taskRow } = await anyAdmin
    .from('agent_tasks')
    .select('id, title, description, metadata')
    .eq('id', del.task_id)
    .maybeSingle()
  if (!taskRow) return { ok: false, status: 404, reason: 'task not found' }
  const task = taskRow as TaskRow
  const meta = (task.metadata ?? {}) as Record<string, unknown>
  const revisionCount = (meta.revision_count as number) ?? 0

  if (revisionCount >= MAX_REVISION_COUNT) {
    // Revision 上限到達 → LLM 0、version 追加 0、現状維持
    return { ok: false, status: 409, reason: 'revision_limit_reached', revision_count: revisionCount }
  }

  // Step 1: v1 は revision_requested にする (feedback を保持)
  await anyAdmin
    .from('agent_deliverables')
    .update({
      status: 'revision_requested',
      ceo_feedback: input.feedback ?? null,
      reviewed_at: now,
      updated_at: now,
    })
    .eq('id', del.id)

  // Step 2: v_next を生成 (context に旧 content + CEO feedback を含める)
  const contextSummary =
    `Previous deliverable v${del.version}:\n` +
    JSON.stringify(del.content).slice(0, 1500) +
    `\n\nCEO feedback (trusted, top priority — but no EXECUTE):\n${input.feedback ?? '(no feedback provided)'}`
  const gen = await generateDeliverable({
    admin: input.admin,
    taskId: del.task_id,
    threadId: del.thread_id,
    agentId: del.agent_id,
    type: del.deliverable_type,
    taskTitle: task.title,
    taskDescription: task.description ?? '',
    contextSummary,
    purpose: 'deliverable_revision',
    parentDeliverableId: del.id,
    version: del.version + 1,
    ceoFeedback: input.feedback,
  })

  if (!gen.ok) {
    // v_next 失敗 → v1 は superseded にしない、revision_requested のままキープ (latest_deliverable_id 維持)
    await anyAdmin
      .from('agent_tasks')
      .update({
        metadata: {
          ...meta,
          deliverable_generation_status: 'revision_failed',
          deliverable_generation_error: (gen.error ?? '').slice(0, 300),
        },
      })
      .eq('id', task.id)
    return { ok: false, status: 500, reason: `revision_generation_failed: ${gen.error ?? 'unknown'}` }
  }

  // Step 3: v1 を superseded に、task metadata を更新
  await anyAdmin
    .from('agent_deliverables')
    .update({ status: 'superseded', updated_at: now })
    .eq('id', del.id)
  await anyAdmin
    .from('agent_tasks')
    .update({
      status: 'awaiting_approval',
      metadata: {
        ...meta,
        latest_deliverable_id: gen.deliverableId,
        revision_count: revisionCount + 1,
        deliverable_generation_status: 'ok',
        deliverable_generation_error: null,
      },
      updated_at: now,
    })
    .eq('id', task.id)

  return { ok: true, status: 200, new_deliverable_id: gen.deliverableId, revision_count: revisionCount + 1 }
}
