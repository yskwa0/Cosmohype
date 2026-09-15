// AI HQ Phase 2B: Research Watch main entry (Round 2)。
//
// 変更点:
//   ・cold-start baseline: source ごとに watch_state に 'research:init:<source_id>' を持ち、
//     初回 run は fetch した item を「scored=true, score={baseline:true}」で保存し LLM を呼ばない。
//   ・通常 run: 新規挿入 (insertedIds) のみ MAYA scoring 対象。 backlog は自動処理しない。
//   ・event/meeting storm guard: 1 run あたり research_signal event 最大 5 件。
//   ・fetch cap は fetch.ts 側で per-source 30 件に既定。
//
// backlog (baseline 以外で scored=false のまま残っている item) は本 watcher では処理しない。
// 必要なら別途 maintenance function で明示的に呼び出す運用。

import type { AiHqSupabase } from '../types'
import { fetchSource, applyFetchResult, type SourceRow } from './fetch'
import { scoreBatch, type ItemRow } from './scorer'
import { maybeEmitHealthEvent } from '../watch/health'

export const MAX_EVENTS_PER_RUN = 5

export interface ResearchRunResult {
  sources_checked: number
  sources_ok: number
  sources_failed: number
  new_items: number
  baseline_items: number
  scored: number
  events_emitted: number
  events_suppressed_by_cap: number
  health_events: number
}

async function isInitialized(admin: AiHqSupabase, sourceId: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('agent_watch_state').select('value').eq('key', `research:init:${sourceId}`).maybeSingle()
  return !!data?.value?.initialized_at
}

async function markInitialized(admin: AiHqSupabase, sourceId: string, count: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('agent_watch_state').upsert(
    {
      key: `research:init:${sourceId}`,
      value: { initialized_at: new Date().toISOString(), initial_item_count: count },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  )
}

export async function runResearchWatch(admin: AiHqSupabase): Promise<ResearchRunResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyAdmin = admin as any
  const { data: sources } = await anyAdmin
    .from('agent_research_sources')
    .select('id, name, source_type, url, category, region, language, priority, enabled, etag, last_modified, consecutive_failures')
    .eq('enabled', true)
    .order('priority', { ascending: false })
  const srcList: SourceRow[] = sources ?? []

  const result: ResearchRunResult = {
    sources_checked: srcList.length,
    sources_ok: 0,
    sources_failed: 0,
    new_items: 0,
    baseline_items: 0,
    scored: 0,
    events_emitted: 0,
    events_suppressed_by_cap: 0,
    health_events: 0,
  }

  // 集めた「今回 run 新規挿入 (baseline でない)」item id を後で MAYA scoring に回す
  const insertedThisRun: string[] = []

  for (const s of srcList) {
    const r = await fetchSource(s)
    const fetchOk = r.status === 'ok_new' || r.status === 'ok_no_change' || r.status === 'not_modified'
    if (r.status === 'network_error' || r.status === 'parse_error') result.sources_failed++
    else if (r.status !== 'disabled') result.sources_ok++

    const already = await isInitialized(admin, s.id)
    const isBaseline = !already
    // fetch 失敗時は初期化 marker を作らず、items も挿入しない (applyFetchResult は
    // source metadata 更新のみ実行、item は 0 件返す)。
    // これにより Hypebeast の 403 のような一時失敗で「baseline 済」と誤認しなくなる。
    const { insertedIds } = await applyFetchResult(admin, r, { isBaseline: isBaseline && fetchOk })
    if (isBaseline && fetchOk) {
      result.baseline_items += insertedIds.length
      // baseline 化を marker として保存 (item 数 0 でも fetch 成功なら初期化済扱い)
      await markInitialized(admin, s.id, insertedIds.length)
    } else if (!isBaseline) {
      result.new_items += insertedIds.length
      insertedThisRun.push(...insertedIds)
    }
    // isBaseline && !fetchOk: marker 作らない、次回リトライ時に再度 baseline 経路へ入る

    // 3-fail health event (once per streak)
    const health = await maybeEmitHealthEvent(admin, {
      subject: `research:${s.name}`,
      newFailureCount: r.status === 'network_error' || r.status === 'parse_error' ? s.consecutive_failures + 1 : 0,
      title: `Research source ${s.name} が連続失敗`,
      summary: r.error ?? 'unknown fetch failure',
      event_type: 'technical_issue',
      severity: 'medium',
    })
    if (health) result.health_events++
  }

  // 通常 run: 「今回 run 新規挿入」のみ MAYA へ渡す (backlog は放置)
  if (insertedThisRun.length > 0) {
    const { data: items } = await anyAdmin
      .from('agent_research_items')
      .select('id, title, summary, url, published_at, source_id')
      .in('id', insertedThisRun)
    const itemsList: ItemRow[] = items ?? []
    if (itemsList.length > 0) {
      const scores = await scoreBatch(admin, itemsList)
      result.scored = scores.length

      // scored 保存 → emit を共有 helper 経由で行う (cap を必ず enforce)
      const forEmit: ScoredItemForEmit[] = []
      for (const s of scores) {
        const it = itemsList[s.index]
        if (!it) continue
        const scoreObj = {
          relevance: s.relevance,
          novelty: s.novelty,
          confidence: s.confidence,
          potential_impact: s.potential_impact,
          note: s.note ?? '',
        }
        await anyAdmin
          .from('agent_research_items')
          .update({ scored: true, score: scoreObj })
          .eq('id', it.id)
        forEmit.push({ id: it.id, title: it.title, url: it.url, source_id: it.source_id, score: scoreObj })
      }
      const emitRes = await emitResearchEvents(admin, forEmit)
      result.events_emitted = emitRes.emitted
      result.events_suppressed_by_cap = emitRes.suppressed
    }
  }
  return result
}

/// Round 3 extract: scored items から event を起票する emit loop。
/// runResearchWatch と test の両方で共有。 cap を必ず enforce する。
export interface ScoredItemForEmit {
  id: string
  title: string
  url: string
  source_id: string
  score: {
    relevance: number
    novelty: number
    confidence: number
    potential_impact: number
    note?: string
  }
}
export async function emitResearchEvents(
  admin: AiHqSupabase,
  items: ScoredItemForEmit[],
  cap: number = MAX_EVENTS_PER_RUN,
): Promise<{ emitted: number; suppressed: number; below_threshold: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyAdmin = admin as any
  let emitted = 0
  let suppressed = 0
  let belowThreshold = 0
  for (const it of items) {
    const s = it.score
    const passes = s.relevance >= 60 && s.potential_impact >= 50 && s.confidence >= 50
    if (!passes) { belowThreshold++; continue }
    if (emitted >= cap) { suppressed++; continue }
    await anyAdmin.from('agent_events').insert({
      event_type: 'research_signal',
      source: 'agent-maya',
      severity: s.potential_impact >= 80 ? 'high' : 'medium',
      title: it.title.slice(0, 120),
      summary: `${s.note ?? ''} [rel=${s.relevance}/nov=${s.novelty}/conf=${s.confidence}/impact=${s.potential_impact}]`,
      payload: { item_id: it.id, url: it.url, source_id: it.source_id, score: s },
    })
    emitted++
  }
  return { emitted, suppressed, below_threshold: belowThreshold }
}

/// Maintenance: 明示呼び出し用 (自動 cron からは呼ばれない)。
/// baseline でも通常でもない unscored item (稀) をまとめて処理する。
export async function backfillUnscored(admin: AiHqSupabase, maxBatch = 10): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyAdmin = admin as any
  const { data: items } = await anyAdmin
    .from('agent_research_items')
    .select('id, title, summary, url, published_at, source_id')
    .eq('scored', false)
    .order('fetched_at', { ascending: false })
    .limit(maxBatch)
  const list: ItemRow[] = items ?? []
  if (list.length === 0) return 0
  const scores = await scoreBatch(admin, list)
  for (const s of scores) {
    const it = list[s.index]
    if (!it) continue
    await anyAdmin
      .from('agent_research_items')
      .update({
        scored: true,
        score: {
          relevance: s.relevance,
          novelty: s.novelty,
          confidence: s.confidence,
          potential_impact: s.potential_impact,
          note: s.note ?? '',
        },
      })
      .eq('id', it.id)
  }
  return scores.length
}
