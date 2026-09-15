// AI HQ Phase 1: short-term memory (session / thread 履歴)。
//
// thread 内の直近 N 件のメッセージを取得して agent へ context として渡す。
// Phase 1 は 20 件 default (tool_call は除外し、message / decision_ref / task_ref のみ)。
// ※ hidden thought / private chain-of-thought は DB に保存しない policy (2026-09-15)。

import type { AgentMessageRow, AiHqSupabase } from '../types'

const DEFAULT_LIMIT = 20

export async function fetchThreadHistory(
  supabase: AiHqSupabase,
  threadId: string,
  limit: number = DEFAULT_LIMIT,
): Promise<AgentMessageRow[]> {
  const { data, error } = await supabase
    .from('agent_messages')
    .select('*')
    .eq('thread_id', threadId)
    .in('message_type', ['message', 'decision_ref', 'task_ref'])
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[ai-company/session] fetchThreadHistory error', error)
    return []
  }
  return (data as AgentMessageRow[]).reverse()
}

/// history を prompt 用テキストに整形する。 metadata は Phase 1 では省略。
export function formatHistoryForPrompt(history: AgentMessageRow[]): string {
  if (history.length === 0) return '(まだ会話履歴はありません)'
  return history
    .map((m) => {
      const who =
        m.sender_type === 'human'
          ? 'CEO'
          : m.sender_type === 'system'
            ? 'SYSTEM'
            : (m.sender_agent ?? 'agent').toUpperCase()
      return `[${who}] ${m.content}`
    })
    .join('\n')
}
