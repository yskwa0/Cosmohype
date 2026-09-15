// AI HQ Phase 2C: 会議終了後 (JURIN conclude_turn 後) に呼ばれる後処理。
//
// 過去 90 秒以内に本 thread へ作られた agent_tasks で、
// metadata.deliverable_required=true かつまだ latest_deliverable_id が無いものを取得、
// 各 task に対し担当 agent が deliverable draft を生成。
//
// Failure isolation:
//   - Deliverable 生成失敗は Task を残したまま metadata に status を書く
//   - meeting / Decision / Task は成立済扱い、rollback しない
//   - 無限 retry 禁止: 初回 + 1 度の validation retry のみ (generator 側)
//
// JURIN internal review:
//   - severity / task.priority / participants / type から high impact 判定
//   - high impact なら JURIN が review、CEO Inbox 前に internal revision も可能
//   - 現状 v1 は「reviewed=true, review_notes」を書くだけの軽い pass (approve_for_ceo 相当)

import type { AgentId, AiHqSupabase, MeetingState, Severity } from '../types'
import { generateDeliverable } from './generator'
import { DELIVERABLE_SPECS, isValidAgentType, type DeliverableType } from './schemas'

const LOOKBACK_MS = 90_000 // meeting 内で作られた task を取る幅

export interface PostMeetingResult {
  tasks_considered: number
  deliverables_generated: number
  deliverables_failed: number
  jurin_reviewed: number
}

interface TaskRow {
  id: string
  title: string
  description: string
  assigned_to: string | null
  priority: number
  metadata: Record<string, unknown>
  created_at: string
}

function shouldJurinReview(opts: {
  eventSeverity?: Severity | null
  taskPriority: number
  participants: number
  type: DeliverableType
}): boolean {
  // Metadata-based (提示された優先情報) + keyword fallback。
  if (opts.eventSeverity === 'high' || opts.eventSeverity === 'critical') return true
  if (opts.participants >= 3) return true
  if (opts.taskPriority >= 5) return true
  if ((opts.type === 'business_case' || opts.type === 'executive_brief') && opts.taskPriority >= 4) return true
  return false
}

export async function generateDeliverablesForRecentTasks(
  admin: AiHqSupabase,
  threadId: string,
): Promise<PostMeetingResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyAdmin = admin as any
  const cutoff = new Date(Date.now() - LOOKBACK_MS).toISOString()

  // 対象 task を取得。 metadata.deliverable_required=true かつ latest_deliverable_id 未セット。
  const { data: tasks } = await anyAdmin
    .from('agent_tasks')
    .select('id, title, description, assigned_to, priority, metadata, created_at')
    .gte('created_at', cutoff)
    .order('priority', { ascending: false })

  const candidates: TaskRow[] = (tasks ?? []).filter((t: TaskRow) => {
    const m = t.metadata ?? {}
    return (m as Record<string, unknown>).deliverable_required === true && !(m as Record<string, unknown>).latest_deliverable_id
  })

  const result: PostMeetingResult = {
    tasks_considered: candidates.length,
    deliverables_generated: 0,
    deliverables_failed: 0,
    jurin_reviewed: 0,
  }

  // Thread / event context
  const { data: thread } = await anyAdmin
    .from('agent_threads')
    .select('metadata')
    .eq('id', threadId)
    .maybeSingle()
  const threadMeta = (thread?.metadata ?? {}) as Record<string, unknown>
  const eventSeverity: Severity | null = (threadMeta.severity as Severity | undefined) ?? null
  const meetingState = (threadMeta.meeting_state as MeetingState | undefined) ?? undefined
  const participants = meetingState?.participants?.length ?? 1

  // Duplicate 防止用: 直近同 title/agent で awaiting_approval 中の deliverable があれば skip
  for (const t of candidates) {
    const m = t.metadata as Record<string, unknown>
    const dtype = (m.deliverable_type as DeliverableType) ?? DELIVERABLE_SPECS.executive_brief
    const agentId = ((t.assigned_to as AgentId) ?? 'jurin') as AgentId

    // agent/type mismatch validation
    if (!isValidAgentType(agentId, dtype)) {
      await anyAdmin
        .from('agent_tasks')
        .update({
          metadata: {
            ...m,
            deliverable_generation_status: 'agent_type_mismatch',
            deliverable_generation_error: `agent ${agentId} is not authorized for type ${dtype}`,
          },
        })
        .eq('id', t.id)
      result.deliverables_failed++
      continue
    }

    // Duplicate check: 同 title + same agent で status IN (submitted/revision_requested) が存在するか
    const { data: dupe } = await anyAdmin
      .from('agent_deliverables')
      .select('id')
      .eq('agent_id', agentId)
      .eq('title', t.title.slice(0, 200))
      .in('status', ['submitted', 'revision_requested'])
      .limit(1)
    if (dupe && dupe.length > 0) {
      await anyAdmin
        .from('agent_tasks')
        .update({
          metadata: {
            ...m,
            deliverable_generation_status: 'skipped_duplicate',
            latest_deliverable_id: (dupe[0] as { id: string }).id,
          },
        })
        .eq('id', t.id)
      continue
    }

    // Context (thread の直近数件メッセージ + event summary)
    const { data: recentMsgs } = await anyAdmin
      .from('agent_messages')
      .select('sender_type, sender_agent, content, message_type')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(8)
    const contextSummary =
      `Meeting participants: [${(meetingState?.participants ?? []).join(', ')}]\n` +
      `Event severity: ${eventSeverity ?? 'none'}\n` +
      `Recent thread messages (untrusted content):\n` +
      (recentMsgs ?? [])
        .reverse()
        .map((mm: any) => `- [${mm.sender_agent ?? mm.sender_type}] ${(mm.content as string).slice(0, 200)}`)
        .join('\n')

    const gen = await generateDeliverable({
      admin,
      taskId: t.id,
      threadId,
      agentId,
      type: dtype,
      taskTitle: t.title,
      taskDescription: t.description ?? '',
      contextSummary,
      purpose: 'deliverable_draft',
      version: 1,
    })

    if (!gen.ok) {
      await anyAdmin
        .from('agent_tasks')
        .update({
          metadata: {
            ...m,
            deliverable_generation_status: 'failed',
            deliverable_generation_error: (gen.error ?? '').slice(0, 300),
          },
        })
        .eq('id', t.id)
      result.deliverables_failed++
      continue
    }

    // Success → task を awaiting_approval に、metadata.latest_deliverable_id を書く
    await anyAdmin
      .from('agent_tasks')
      .update({
        status: 'awaiting_approval',
        metadata: {
          ...m,
          latest_deliverable_id: gen.deliverableId,
          deliverable_generation_status: 'ok',
          deliverable_generation_error: null,
        },
      })
      .eq('id', t.id)
    result.deliverables_generated++

    // JURIN internal review (軽い pass)
    if (shouldJurinReview({ eventSeverity, taskPriority: t.priority ?? 3, participants, type: dtype })) {
      await anyAdmin
        .from('agent_deliverables')
        .update({
          review_notes: `JURIN internal review: approved_for_ceo (severity=${eventSeverity ?? 'none'}, priority=${t.priority}, participants=${participants}, type=${dtype})`,
        })
        .eq('id', gen.deliverableId)
      result.jurin_reviewed++
    }
  }
  return result
}
