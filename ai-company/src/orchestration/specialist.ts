// AI HQ Phase 1: specialist 呼び出し (JURIN が call_specialist tool 経由で使う)。
// AI HQ Phase 2A: meeting 内 (`enablePeerTool=true`) では REQUEST_PEER を許可する。
//
// specialist は Phase 1 では tool を持たない = 自分の意見を content で返すだけ。
//   1. specialist が specialist を呼ぶ循環会話を防ぐ
//   2. 3 往復以内の会議に収まる
//   3. 発言はすべて agent_messages に自動記録される (thread stream)
//
// Phase 2A: meeting_state で bounded な peer request (max 2/agent, chain depth <=2) を許可。

import { call, type ChatMessage } from '../providers/openai'
import { getAgent } from '../agents/registry'
import { modelForAgent } from '../agents/modelPolicy'
import type { AgentId, AiHqSupabase } from '../types'
import { SPECIALIST_MEETING_TOOLS } from '../tools/definitions'
import { logUsage } from '../usage'
import { setAgentStatus, resetToIdle } from '../activity'

export interface CallSpecialistParams {
  admin: AiHqSupabase
  threadId: string
  specialistId: AgentId
  question: string
  contextSummary: string
  model: string
  /// Phase 2A: meeting context 中は REQUEST_PEER を許可。
  enablePeerTool?: boolean
}

export async function callSpecialistOnce(params: CallSpecialistParams): Promise<string> {
  if (params.specialistId === 'jurin') {
    return 'error: JURIN cannot call itself as a specialist'
  }
  const agent = getAgent(params.specialistId)
  const model = modelForAgent(params.specialistId)
  const meetingMode = !!params.enablePeerTool

  const meetingClauses = meetingMode
    ? `

# Phase 2A: meeting mode
- 現在は spontaneous meeting の途中です。 必要なら "request_peer" tool で 1 人だけ別 specialist に相談できます。
- ただし peer 呼び出しの目的は「自分の担当外の観点が必要な時」だけ。 追加意見が不要なら request_peer を使わずに結論を書いてください。
- 1 メンバーあたり peer 呼び出しは最大 2 回、depth 上限あり、超えると reject されます。 「相談したから満足」的な連発は無駄。
- 会議は 3 round 以内で終わる想定。 冗長な議論は避けてください。`
    : ''

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `${agent.personaMarkdown}

# 重要
あなたは JURIN または他社員からの依頼に答える立場です。 出力は 200〜500 文字を目安に、
まず結論 → 根拠の順で書いてください。 冗長な前置きは省略。
根拠のない架空データを会話に混ぜないでください。 確認していないことは「確認していない」と明言してください。${meetingClauses}`,
    },
    {
      role: 'user',
      content: `【依頼】
${params.question}

【背景】
${params.contextSummary || '(背景情報なし)'}`,
    },
  ]

  await setAgentStatus(params.admin, params.specialistId, 'meeting', { threadId: params.threadId })

  let content = ''
  let toolCallCount = 0
  const tools = meetingMode ? SPECIALIST_MEETING_TOOLS : undefined
  const maxIters = meetingMode ? 3 : 1

  try {
    // tool を持たせる時は tool loop を回す。 通常は 1 発。
    const runningMessages = [...messages]
    for (let iter = 0; iter < maxIters; iter++) {
      const res = await call({
        model,
        messages: runningMessages,
        tools,
        toolChoice: tools ? 'auto' : undefined,
        temperature: 0.7,
        maxTokens: 700,
      })
      if (res.usage) {
        await logUsage(params.admin, {
          agentId: params.specialistId,
          model,
          promptTokens: res.usage.prompt_tokens,
          completionTokens: res.usage.completion_tokens,
          threadId: params.threadId,
          purpose: meetingMode ? 'peer_or_meeting' : 'call_specialist',
        })
      }

      if (!res.toolCalls || res.toolCalls.length === 0) {
        content = (res.content ?? '').trim()
        break
      }

      // tool_call があれば assistant として履歴に積み、handler を呼んで tool result を返す
      runningMessages.push({
        role: 'assistant',
        content: res.content ?? null,
        tool_calls: res.toolCalls,
      })
      for (const tc of res.toolCalls) {
        toolCallCount++
        let result = ''
        if (tc.function.name === 'request_peer') {
          try {
            const args = JSON.parse(tc.function.arguments || '{}')
            const { handleRequestPeer } = await import('../tools/handlers')
            result = await handleRequestPeer(
              { admin: params.admin, threadId: params.threadId, callerAgent: params.specialistId },
              args,
            )
          } catch (err) {
            result = `error: ${(err as Error).message}`
          }
        } else {
          result = `error: tool ${tc.function.name} not available in specialist meeting mode`
        }
        runningMessages.push({ role: 'tool', tool_call_id: tc.id, content: result })
      }
    }
  } catch (err) {
    console.error('[ai-company/specialist] OpenAI call failed for', params.specialistId, err)
    content = `(${agent.displayName} からの応答取得に失敗しました。)`
  } finally {
    await resetToIdle(params.admin, params.specialistId)
  }

  if (!content) content = '(応答なし)'

  await params.admin.from('agent_messages').insert({
    thread_id: params.threadId,
    sender_type: 'agent',
    sender_agent: params.specialistId,
    content,
    message_type: 'message',
    metadata: {
      in_reply_to: meetingMode ? 'peer' : 'jurin',
      question: params.question,
      tool_calls_within: toolCallCount,
    },
  })

  return content
}
