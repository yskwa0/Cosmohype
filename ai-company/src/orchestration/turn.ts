// AI HQ Phase 1: 1 turn 実行 helper。
//
// call_specialist は特殊 tool として本ファイル内で処理する
// (specialist 呼び出しは orchestration の中心概念で、handlers.ts に置くとレイヤーが混ざるため)。
//
// tool loop は最大 6 iteration (無限ループ防止)。 3 往復程度の会話を想定。

import { call, type ChatMessage, type ToolDef } from '../providers/openai'
import type { AgentId, AiHqSupabase } from '../types'
import {
  handleSearchMemory,
  handleDraftDecision,
  handleDraftTask,
  handleConcludeTurn,
  parseArgs,
  type HandlerContext,
} from '../tools/handlers'
import { callSpecialistOnce } from './specialist'
import { logUsage } from '../usage'

const MAX_TOOL_ITERATIONS = 6

export interface RunTurnParams {
  admin: AiHqSupabase
  threadId: string
  /// 呼び出し agent (通常 'jurin')。
  agentId: AgentId
  model: string
  systemPrompt: string
  history: ChatMessage[]
  ceoLatestMessage: string
  tools: ToolDef[]
}

export interface TurnLog {
  toolCallsExecuted: number
  concluded: boolean
  finalText: string | null
}

export async function runManagerTurn(params: RunTurnParams): Promise<TurnLog> {
  const messages: ChatMessage[] = [
    { role: 'system', content: params.systemPrompt },
    ...params.history,
    { role: 'user', content: `【CEO からの依頼】\n${params.ceoLatestMessage}` },
  ]

  const ctx: HandlerContext = {
    admin: params.admin,
    threadId: params.threadId,
    callerAgent: params.agentId,
  }

  let toolCallsExecuted = 0
  let concluded = false
  let finalText: string | null = null

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    const res = await call({
      model: params.model,
      messages,
      tools: params.tools,
      toolChoice: 'auto',
      temperature: 0.7,
      maxTokens: 900,
    })

    // Phase 2A follow-up: manager turn (JURIN) の openai 呼出も usage 計測。
    // specialist の usage は callSpecialistOnce 内で別途記録されるため二重にならない。
    if (res.usage) {
      await logUsage(params.admin, {
        agentId: params.agentId,
        model: params.model,
        promptTokens: res.usage.prompt_tokens,
        completionTokens: res.usage.completion_tokens,
        threadId: params.threadId,
        purpose: 'manager_turn',
      })
    }

    // model が普通のテキストで返してきた場合 (tool call なし)
    if (res.toolCalls.length === 0) {
      finalText = res.content ?? ''
      break
    }

    // tool_calls がある場合は assistant message として履歴に積み、それぞれ実行して tool result を返す。
    messages.push({
      role: 'assistant',
      content: res.content ?? null,
      tool_calls: res.toolCalls,
    })

    for (const tc of res.toolCalls) {
      toolCallsExecuted++
      const args = parseArgs(tc.function.arguments)
      let result = ''

      try {
        switch (tc.function.name) {
          case 'call_specialist':
            result = await callSpecialistOnce({
              admin: params.admin,
              threadId: params.threadId,
              specialistId: args.agent_id as AgentId,
              question: String(args.question ?? ''),
              contextSummary: String(args.context_summary ?? ''),
              model: params.model,
            })
            break
          case 'search_company_memory':
            result = await handleSearchMemory(ctx, args)
            break
          case 'draft_decision':
            result = await handleDraftDecision(ctx, args)
            break
          case 'draft_task':
            result = await handleDraftTask(ctx, args)
            break
          case 'conclude_turn':
            result = await handleConcludeTurn(ctx, args)
            finalText = String(args.final_summary ?? '')
            concluded = true
            break
          default:
            result = `error: unknown tool ${tc.function.name}`
        }
      } catch (err) {
        console.error('[ai-company/turn] tool error', tc.function.name, err)
        result = `error: ${(err as Error).message}`
      }

      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: result,
      })
    }

    if (concluded) break
  }

  return { toolCallsExecuted, concluded, finalText }
}
