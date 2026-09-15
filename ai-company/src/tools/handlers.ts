// AI HQ Phase 1: tool 実装 (handler)。
//
// definitions.ts で定義した各 tool の実装。 orchestration/turn.ts が tool_call を受け取り
// 本ファイルの handleXxx を呼ぶ。
//
// 全 tool は service_role Supabase client を使う (RLS bypass、admin-only のため)。

import type { AgentId, AgentMemoryRow, AiHqSupabase } from '../types'
import { longTermMemory, formatMemoryForPrompt } from '../memory/longterm'

export interface HandlerContext {
  admin: AiHqSupabase
  threadId: string
  /// tool を呼んだ agent (通常 'jurin')。
  callerAgent: AgentId
}

/// tool_call の arguments を JSON parse (エラー時は空 object)。
export function parseArgs(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

/// search_company_memory: agent_memory を category / keyword / tags で検索。
export async function handleSearchMemory(
  ctx: HandlerContext,
  args: Record<string, unknown>,
): Promise<string> {
  const rows: AgentMemoryRow[] = await longTermMemory.search(ctx.admin, {
    category: (args.category as never) ?? undefined,
    keyword: (args.keyword as string) ?? undefined,
    tags: Array.isArray(args.tags) ? (args.tags as string[]) : undefined,
    minImportance:
      typeof args.min_importance === 'number'
        ? (args.min_importance as number)
        : undefined,
  })
  return formatMemoryForPrompt(rows)
}

/// draft_decision: agent_decisions に INSERT。 message_type=decision_ref で agent_messages にも痕跡を残す。
export async function handleDraftDecision(
  ctx: HandlerContext,
  args: Record<string, unknown>,
): Promise<string> {
  const summary = String(args.summary ?? '').trim()
  const reason = String(args.reason ?? '').trim()
  if (!summary) return 'error: summary is empty'

  const { data, error } = await ctx.admin
    .from('agent_decisions')
    .insert({
      thread_id: ctx.threadId,
      decided_by: ctx.callerAgent,
      summary,
      reason,
    })
    .select('id')
    .single()
  if (error) {
    console.error('[ai-company/handlers] draft_decision error', error)
    return `error: ${error.message}`
  }

  // 参照レコードを thread stream にも残す
  await ctx.admin.from('agent_messages').insert({
    thread_id: ctx.threadId,
    sender_type: 'system',
    sender_agent: null,
    content: `【Decision】 ${summary}`,
    message_type: 'decision_ref',
    metadata: { decision_id: (data as { id: string }).id, reason },
  })
  return `decision_id: ${(data as { id: string }).id}`
}

/// draft_task: agent_tasks に INSERT (requires_approval=true default)。
/// Phase 2C: deliverable_type が指定された場合、metadata に deliverable_required=true を書き、
/// meeting 終了後の post-meeting hook で対応 agent が draft 生成する。
export async function handleDraftTask(
  ctx: HandlerContext,
  args: Record<string, unknown>,
): Promise<string> {
  const title = String(args.title ?? '').trim()
  if (!title) return 'error: title is empty'
  const description = String(args.description ?? '').trim()
  const assignedTo = args.assigned_to as AgentId | undefined
  const priority =
    typeof args.priority === 'number' ? Math.max(1, Math.min(5, args.priority)) : 3
  const deliverableType = args.deliverable_type as string | undefined
  const metadata: Record<string, unknown> = {}
  if (deliverableType && typeof deliverableType === 'string') {
    metadata.deliverable_required = true
    metadata.deliverable_type = deliverableType
    metadata.revision_count = 0
  }

  const { data, error } = await ctx.admin
    .from('agent_tasks')
    .insert({
      title,
      description,
      assigned_to: assignedTo ?? null,
      created_by: ctx.callerAgent,
      status: 'open',
      priority,
      requires_approval: true,
      metadata,
    })
    .select('id')
    .single()
  if (error) {
    console.error('[ai-company/handlers] draft_task error', error)
    return `error: ${error.message}`
  }

  await ctx.admin.from('agent_messages').insert({
    thread_id: ctx.threadId,
    sender_type: 'system',
    sender_agent: null,
    content: `【Task 案】 ${title}${assignedTo ? ` → ${assignedTo}` : ''} (approval required)`,
    message_type: 'task_ref',
    metadata: { task_id: (data as { id: string }).id, assigned_to: assignedTo, priority },
  })
  return `task_id: ${(data as { id: string }).id}`
}

/// request_peer (Phase 2A): specialist が meeting 中に別 specialist を呼ぶ。
/// meeting_state で limit 強制、reject 時は tool result に理由を返す。
export async function handleRequestPeer(
  ctx: HandlerContext,
  args: Record<string, unknown>,
): Promise<string> {
  const target = String(args.agent_id ?? '').trim() as AgentId
  const question = String(args.question ?? '').trim()
  const contextSummary = String(args.context_summary ?? '').trim()
  if (!target || !question) return 'error: agent_id and question required'

  // Lazy import to avoid circular dep
  const [{ loadMeetingState, saveMeetingState, checkAddPeer, applyAddPeer, recordQuestion }, { callSpecialistOnce }] =
    await Promise.all([
      import('../meetings/state'),
      import('../orchestration/specialist'),
    ])

  const state = await loadMeetingState(ctx.admin, ctx.threadId)
  const check = checkAddPeer(state, ctx.callerAgent, target, question)
  if (!check.ok) return `reject: ${check.reason}`

  const next = recordQuestion(applyAddPeer(state, ctx.callerAgent, target), ctx.callerAgent, target, question)
  await saveMeetingState(ctx.admin, ctx.threadId, next)

  // peer を meeting 内で 1 turn 呼び出す。 peer 側は SPECIALIST_MEETING_TOOLS を使える。
  const answer = await callSpecialistOnce({
    admin: ctx.admin,
    threadId: ctx.threadId,
    specialistId: target,
    question,
    contextSummary,
    model: 'gpt-5.6-terra',
    enablePeerTool: true,
  })
  return answer
}

/// conclude_turn: 最終まとめを agent_messages に投稿 (sender=agent, agent=caller)。
export async function handleConcludeTurn(
  ctx: HandlerContext,
  args: Record<string, unknown>,
): Promise<string> {
  const finalSummary = String(args.final_summary ?? '').trim()
  if (!finalSummary) return 'error: final_summary is empty'

  await ctx.admin.from('agent_messages').insert({
    thread_id: ctx.threadId,
    sender_type: 'agent',
    sender_agent: ctx.callerAgent,
    content: finalSummary,
    message_type: 'message',
    metadata: { role: 'final_summary' },
  })
  return 'ok'
}
