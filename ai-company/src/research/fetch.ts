// AI HQ Phase 2B: RSS/Atom fetcher。
//
// - ETag / If-Modified-Since を尊重 (304 なら item 0 で早期 return → LLM 0 call)
// - User-Agent 明示 (CosmohypeAIResearchBot/2.0、mailto は含めない)
// - timeout 10s
// - fetch 失敗時は consecutive_failures をインクリメント、3 回連続で health event

import type { AiHqSupabase } from '../types'
import { parseFeed, type ParsedItem } from './parse'
import { createHash } from 'node:crypto'

const USER_AGENT = 'CosmohypeAIResearchBot/2.0 (+https://www.cosmohype.jp)'
const FETCH_TIMEOUT_MS = 10000
// Per-run insertion cap (Round 2): RSS 側が 100 件返しても 1 run で保存するのは 30 まで。
// 上位版は次回 run で自然に取り込まれる (published_at 順)。
const PER_RUN_ITEM_CAP = 30

export interface SourceRow {
  id: string
  name: string
  source_type: string
  url: string
  category: string
  region: string
  language: string
  priority: number
  enabled: boolean
  etag: string | null
  last_modified: string | null
  consecutive_failures: number
}

export interface FetchResult {
  source: SourceRow
  status: 'ok_new' | 'ok_no_change' | 'not_modified' | 'parse_error' | 'network_error' | 'disabled'
  items: ParsedItem[]
  etag: string | null
  lastModified: string | null
  error?: string
}

async function abortableFetch(url: string, headers: Record<string, string>, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { headers, signal: controller.signal, redirect: 'follow' })
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchSource(src: SourceRow): Promise<FetchResult> {
  if (!src.enabled) {
    return { source: src, status: 'disabled', items: [], etag: null, lastModified: null }
  }
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
  }
  if (src.etag) headers['If-None-Match'] = src.etag
  if (src.last_modified) headers['If-Modified-Since'] = src.last_modified

  try {
    const res = await abortableFetch(src.url, headers, FETCH_TIMEOUT_MS)
    if (res.status === 304) {
      return { source: src, status: 'not_modified', items: [], etag: src.etag, lastModified: src.last_modified }
    }
    if (!res.ok) {
      return { source: src, status: 'network_error', items: [], etag: null, lastModified: null, error: `HTTP ${res.status}` }
    }
    const etag = res.headers.get('etag')
    const lastModified = res.headers.get('last-modified')
    const xml = await res.text()
    let items: ParsedItem[]
    try {
      items = parseFeed(xml)
    } catch (err) {
      return { source: src, status: 'parse_error', items: [], etag, lastModified, error: (err as Error).message }
    }
    // Round 2: 保存対象を per-run cap で切る (dedup 前、feed 側最新順を優先)。
    const capped = items.slice(0, PER_RUN_ITEM_CAP)
    return { source: src, status: capped.length > 0 ? 'ok_new' : 'ok_no_change', items: capped, etag, lastModified }
  } catch (err) {
    return { source: src, status: 'network_error', items: [], etag: null, lastModified: null, error: (err as Error).message }
  }
}

export function contentHash(title: string, url: string, summary: string): string {
  return createHash('sha256').update(`${title}\n${url}\n${summary.slice(0, 200)}`).digest('base64url').slice(0, 32)
}

/// fetch 結果を DB へ適用: source の etag/last_modified/last_checked_at 更新 +
/// 新規 item を dedupe しつつ INSERT。 返り値は新規挿入した item id 一覧 (Round 2)。
/// isBaseline=true の場合、item は「baseline」として scored=true, score={baseline:true} で保存し、
/// 通常 scoring path から除外される (cold-start flood 防止)。
export async function applyFetchResult(
  admin: AiHqSupabase,
  r: FetchResult,
  opts: { isBaseline?: boolean } = {},
): Promise<{ insertedIds: string[]; skipped: number }> {
  const now = new Date().toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyAdmin = admin as any

  // Update source metadata
  const updates: Record<string, unknown> = { last_checked_at: now, updated_at: now }
  if (r.status === 'ok_new' || r.status === 'ok_no_change' || r.status === 'not_modified') {
    updates.last_success_at = now
    updates.consecutive_failures = 0
    updates.last_error = null
    if (r.etag !== null && r.etag !== undefined) updates.etag = r.etag
    if (r.lastModified !== null && r.lastModified !== undefined) updates.last_modified = r.lastModified
  } else if (r.status === 'network_error' || r.status === 'parse_error') {
    updates.consecutive_failures = r.source.consecutive_failures + 1
    updates.last_error = (r.error ?? r.status).slice(0, 300)
  }
  await anyAdmin.from('agent_research_sources').update(updates).eq('id', r.source.id)

  if (r.items.length === 0) return { insertedIds: [], skipped: 0 }

  const insertedIds: string[] = []
  let skipped = 0
  for (const it of r.items) {
    const h = contentHash(it.title, it.url, it.summary)
    const row: Record<string, unknown> = {
      source_id: r.source.id,
      external_id: it.externalId,
      title: it.title,
      summary: it.summary,
      url: it.url,
      published_at: it.publishedAt,
      content_hash: h,
      metadata: opts.isBaseline ? { baseline: true } : {},
    }
    if (opts.isBaseline) {
      row.scored = true
      row.score = { baseline: true, note: 'cold-start baseline, not evaluated' }
    }
    const { data, error } = await anyAdmin
      .from('agent_research_items')
      .upsert(row, { onConflict: 'source_id,external_id', ignoreDuplicates: true })
      .select('id')
    if (error) { skipped++; continue }
    if (Array.isArray(data) && data.length > 0) insertedIds.push((data[0] as { id: string }).id)
    else skipped++
  }
  return { insertedIds, skipped }
}
