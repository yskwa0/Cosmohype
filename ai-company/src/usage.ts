// AI HQ Phase 2A: OpenAI 呼出の token / cost を agent_usage に記録。
//
// OpenAI response の usage フィールドを取り、public price table (2025 概算) から
// estimated_cost_usd を算出。 estimated であることを明示する。
// price 未定 model の場合は 0 を入れ、meta に model 名を残す。

import type { AgentId, AiHqSupabase } from './types'

// 1M tokens 単価 USD (2025 参考値、公式 pricing に置換可能)。
const PRICE_TABLE: Record<string, { prompt: number; completion: number }> = {
  'gpt-5.6-terra': { prompt: 3.0, completion: 15.0 },
  'gpt-5.6': { prompt: 6.0, completion: 30.0 },
}

export interface UsageInput {
  agentId: AgentId | string
  model: string
  promptTokens: number
  completionTokens: number
  reasoningTokens?: number
  threadId?: string | null
  purpose?: string
}

export async function logUsage(admin: AiHqSupabase, u: UsageInput) {
  const price = PRICE_TABLE[u.model]
  const est = price
    ? (u.promptTokens * price.prompt + u.completionTokens * price.completion) / 1_000_000
    : 0
  await (admin as unknown as { from: (t: string) => { insert: (v: unknown) => Promise<unknown> } })
    .from('agent_usage')
    .insert({
      agent_id: u.agentId,
      model: u.model,
      prompt_tokens: u.promptTokens,
      completion_tokens: u.completionTokens,
      reasoning_tokens: u.reasoningTokens ?? 0,
      total_tokens: u.promptTokens + u.completionTokens + (u.reasoningTokens ?? 0),
      estimated_cost_usd: est.toFixed(6),
      thread_id: u.threadId ?? null,
      purpose: u.purpose ?? null,
    })
}
