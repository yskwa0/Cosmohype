// AI HQ Phase 2A: agent_activity live status の書き込み helper。
//
// Fake status 禁止: turn 実行 / meeting 参加中の間だけ non-idle。
// orchestration が turn 開始/終了で必ず設定する。

import type { AgentId, AgentStatus, AiHqSupabase } from './types'

export async function setAgentStatus(
  admin: AiHqSupabase,
  agentId: AgentId,
  status: AgentStatus,
  opts?: { threadId?: string | null; taskId?: string | null },
) {
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (opts && 'threadId' in opts) patch.current_thread_id = opts.threadId
  if (opts && 'taskId' in opts) patch.current_task_id = opts.taskId
  await (admin as unknown as {
    from: (t: string) => {
      update: (v: Record<string, unknown>) => {
        eq: (col: string, val: string) => Promise<{ error: unknown }>
      }
    }
  })
    .from('agent_activity')
    .update(patch)
    .eq('agent_id', agentId)
}

export async function resetToIdle(admin: AiHqSupabase, agentId: AgentId) {
  await setAgentStatus(admin, agentId, 'idle', { threadId: null, taskId: null })
}
