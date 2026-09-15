// AI HQ Phase 1: JURIN manager orchestration。
//
// 呼び出し側 (API route) はここの `runJurinTurn()` を叩くだけで、
// specialist 呼び出し / tool 実行 / decision / task の DRAFT / 最終まとめまですべて自動化。
//
// フロー:
//   1. CEO のメッセージを agent_messages に INSERT (sender=human)
//   2. thread history + relevant memory を prompt に組み立て
//   3. JURIN model で runManagerTurn を実行 (tool loop)
//   4. JURIN が conclude_turn を呼んだ / または通常テキストで返した = 完了
//   5. 通常テキスト fallback: agent_messages に JURIN 発言として保存

import type { AiHqSupabase } from '../types'
import { getAgent } from '../agents/registry'
import {
  resolveDefaultModel,
  resolveReasoningModel,
  shouldUseReasoningModel,
} from '../agents/modelPolicy'
import { JURIN_TOOLS } from '../tools/definitions'
import { fetchThreadHistory, formatHistoryForPrompt } from '../memory/session'
import { longTermMemory, formatMemoryForPrompt } from '../memory/longterm'
import { runManagerTurn } from './turn'
import type { ChatMessage } from '../providers/openai'
import { setAgentStatus, resetToIdle } from '../activity'

export interface RunJurinParams {
  admin: AiHqSupabase
  threadId: string
  ceoMessage: string
}

export interface RunJurinResult {
  ok: boolean
  threadId: string
  toolCallsExecuted: number
  reasoningModelUsed: boolean
  finalText: string | null
}

export async function runJurinTurn(params: RunJurinParams): Promise<RunJurinResult> {
  // 1. CEO メッセージを保存
  const { error: insErr } = await params.admin.from('agent_messages').insert({
    thread_id: params.threadId,
    sender_type: 'human',
    sender_agent: null,
    content: params.ceoMessage,
    message_type: 'message',
    metadata: { author: 'CEO' },
  })
  if (insErr) {
    console.error('[ai-company/jurin] failed to insert CEO message', insErr)
    return {
      ok: false,
      threadId: params.threadId,
      toolCallsExecuted: 0,
      reasoningModelUsed: false,
      finalText: null,
    }
  }

  // 2. history + memory を集める
  const history = await fetchThreadHistory(params.admin, params.threadId, 20)
  const memory = await longTermMemory.search(params.admin, {
    keyword: params.ceoMessage.slice(0, 60),
    minImportance: 3,
    limit: 6,
  })

  const jurin = getAgent('jurin')

  // 3. reasoning model が必要か判定
  const useReasoning = shouldUseReasoningModel({
    agentId: 'jurin',
    specialistOpinionsCollected: 0,
    conflictDetected: false,
    ceoMessage: params.ceoMessage,
  })
  const model = useReasoning ? resolveReasoningModel() : resolveDefaultModel()

  const systemPrompt = `${jurin.personaMarkdown}

# 実行環境 (Phase 1)

あなたは Cosmohype AI HQ の JURIN です。 会社の 1 人 CEO を補助するのが目的です。
利用可能な tool:
  - call_specialist (agent_id, question, context_summary) — 他 6 人を 1 人ずつ呼ぶ
  - search_company_memory (category, keyword, tags, min_importance) — 長期記憶検索
  - draft_decision (summary, reason) — Decision を agent_decisions に記録
  - draft_task (title, description, assigned_to, priority) — Task を agent_tasks に DRAFT
  - conclude_turn (final_summary) — 最終まとめを thread に投稿してこの turn を終了

制約:
  - 1 turn 内で最大 3〜4 人程度の specialist を呼ぶ (全員は呼ばない、発散防止)
  - 各 specialist は tool を持たない = 1 発言で答える
  - 議論が発散したら早めに conclude_turn する
  - EXECUTE (本番反映 / SNS 投稿 / 課金変更 / deploy) は Phase 1 では絶対に行えない = すべて DRAFT
  - 最終まとめは「状況 / 各 specialist の要点 / 結論 / Next Action」の 4 セクション

# 現時点の会話履歴 (直近)
${formatHistoryForPrompt(history)}

# 関連する Company Memory (recent, importance>=3)
${formatMemoryForPrompt(memory)}
`

  const chatHistory: ChatMessage[] = [] // ここでは system + user は turn.ts 側で構築するので空

  // 4. turn 実行 (activity status を meeting に切替)
  await setAgentStatus(params.admin, 'jurin', 'meeting', { threadId: params.threadId })
  let result
  try {
    result = await runManagerTurn({
      admin: params.admin,
      threadId: params.threadId,
      agentId: 'jurin',
      model,
      systemPrompt,
      history: chatHistory,
      ceoLatestMessage: params.ceoMessage,
      tools: JURIN_TOOLS,
    })
  } finally {
    await resetToIdle(params.admin, 'jurin')
  }

  // 5. JURIN が conclude_turn を呼ばなかった場合の fallback:
  //    通常テキストで返してきた content を agent_messages に保存する。
  if (!result.concluded && result.finalText && result.finalText.trim().length > 0) {
    await params.admin.from('agent_messages').insert({
      thread_id: params.threadId,
      sender_type: 'agent',
      sender_agent: 'jurin',
      content: result.finalText.trim(),
      message_type: 'message',
      metadata: { role: 'jurin_reply', fallback: true },
    })
  }

  // thread の updated_at を更新
  await params.admin
    .from('agent_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', params.threadId)

  return {
    ok: true,
    threadId: params.threadId,
    toolCallsExecuted: result.toolCallsExecuted,
    reasoningModelUsed: useReasoning,
    finalText: result.finalText,
  }
}
