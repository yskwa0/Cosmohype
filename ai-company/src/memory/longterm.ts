// AI HQ Phase 1: long-term memory (agent_memory) repository。
//
// Phase 1 は tag + trigram search で十分。 embedding / vector search は Phase 2 で。
// 上位 (orchestration) が本 interface のみに依存すれば、 Phase 2 で実装を差し替え可能。

import type { AgentMemoryRow, AiHqSupabase, MemoryCategory } from '../types'

export interface LongTermMemoryRepository {
  search(
    supabase: AiHqSupabase,
    params: SearchParams,
  ): Promise<AgentMemoryRow[]>
}

export interface SearchParams {
  category?: MemoryCategory
  tags?: string[]
  minImportance?: number
  keyword?: string
  limit?: number
}

/// Phase 1 実装: category / tags / trigram で検索。
export const longTermMemory: LongTermMemoryRepository = {
  async search(supabase, params) {
    let q = supabase
      .from('agent_memory')
      .select('*')
      .gte('importance', params.minImportance ?? 1)
      .order('importance', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(params.limit ?? 10)

    if (params.category) q = q.eq('category', params.category)
    if (params.tags && params.tags.length > 0) q = q.overlaps('tags', params.tags)
    if (params.keyword && params.keyword.trim().length >= 2) {
      // pg_trgm ILIKE (title + content にヒットさせる)
      const kw = `%${params.keyword.trim()}%`
      q = q.or(`title.ilike.${kw},content.ilike.${kw}`)
    }

    const { data, error } = await q
    if (error) {
      console.error('[ai-company/longterm] search error', error)
      return []
    }
    return data as AgentMemoryRow[]
  },
}

/// prompt に memory 一覧を差し込む用の整形。
export function formatMemoryForPrompt(rows: AgentMemoryRow[]): string {
  if (rows.length === 0) return '(関連する company memory はありません)'
  return rows
    .map(
      (m) =>
        `- [${m.category}/${m.importance}] ${m.title}\n  ${m.content.slice(0, 300)}`,
    )
    .join('\n')
}
