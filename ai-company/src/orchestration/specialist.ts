// AI HQ Phase 1: specialist 呼び出し (JURIN が call_specialist tool 経由で使う)。
//
// specialist は tool を持たない = 自分の意見を content で返すだけ (Phase 1)。
// これで:
//   1. specialist が specialist を呼ぶ循環会話を防ぐ
//   2. 3 往復以内の会議に収まる
//   3. 発言はすべて agent_messages に自動記録される (thread stream)

import { call, type ChatMessage } from '../providers/openai'
import { getAgent } from '../agents/registry'
import { modelForAgent } from '../agents/modelPolicy'
import type { AgentId, AiHqSupabase } from '../types'

export interface CallSpecialistParams {
  admin: AiHqSupabase
  threadId: string
  specialistId: AgentId
  question: string
  contextSummary: string
  model: string // JURIN の model (specialist は modelForAgent で別途決定)
}

export async function callSpecialistOnce(
  params: CallSpecialistParams,
): Promise<string> {
  if (params.specialistId === 'jurin') {
    return 'error: JURIN cannot call itself as a specialist'
  }
  const agent = getAgent(params.specialistId)
  const model = modelForAgent(params.specialistId)

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `${agent.personaMarkdown}

# 重要 (Phase 1 制約)

あなたは今、JURIN からの依頼に単発で答える立場です。 tool は使えません。
あなたの回答は 1 発言で完結する必要があります。 他の specialist を呼ぶことはできません。
JURIN が最終まとめを行うので、あなたは自分の専門領域の見解だけを簡潔に返してください。

出力は 200〜500 文字を目安に、まず結論 → 根拠の順で書いてください。 冗長な前置きは省略。`,
    },
    {
      role: 'user',
      content: `【JURIN からの質問】
${params.question}

【背景 (JURIN が集約)】
${params.contextSummary || '(背景情報なし)'}`,
    },
  ]

  let content = ''
  try {
    const res = await call({
      model,
      messages,
      temperature: 0.7,
      maxTokens: 600,
    })
    content = (res.content ?? '').trim()
  } catch (err) {
    console.error(
      '[ai-company/specialist] OpenAI call failed for',
      params.specialistId,
      err,
    )
    content = `(${agent.displayName} からの応答取得に失敗しました。しばらくしてから再試行してください。)`
  }

  // specialist の発言を thread stream にも保存する
  await params.admin.from('agent_messages').insert({
    thread_id: params.threadId,
    sender_type: 'agent',
    sender_agent: params.specialistId,
    content,
    message_type: 'message',
    metadata: { in_reply_to: 'jurin', question: params.question },
  })

  // JURIN に返す tool_result は content そのまま
  return content
}
