// AI HQ Phase 3A.1: github_issue_create executor (server-only, deterministic)。
//
// - LLM を一切呼ばない
// - 固定 URL / 固定 method / 固定 body shape
// - Timeout 相当時は marker (HTML comment) で GitHub 側検索して duplicate 回避
// - retry_count は max 1 (呼び出し側で管理)
// - AI_HQ_TEST_MOCK_GITHUB_EXECUTE=1 の時は synthetic success (Test env で PAT 未準備時用)

import type { AiHqSupabase } from '../types'
import { validateGhIssuePayload, type GhIssueCreatePayload } from './types'
import { createHash } from 'node:crypto'

const GITHUB_API = 'https://api.github.com'
const USER_AGENT = 'CosmohypeAIHQExecutor/1.0'
const TIMEOUT_MS = 15000

export interface ExecutionRow {
  id: string
  execution_type: string
  payload: Record<string, unknown>
  status: string
  result: Record<string, unknown> | null
  idempotency_key: string
  retry_count: number
}

export interface ExecutorResult {
  ok: boolean
  external_id?: string
  external_url?: string
  failure_reason?: string
  duplicate_found?: boolean
}

function buildIssueMarker(executionRequestId: string): string {
  return `<!-- ai-hq-execution:${executionRequestId} -->`
}

async function abortableFetch(url: string, opts: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...opts, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function ghHeaders(): Record<string, string> {
  const token = process.env.AI_HQ_GITHUB_WRITE_TOKEN
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': USER_AGENT,
  }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

/// GitHub 側で既に同 execution_request marker を含む Issue が存在するか検索。
/// Round 2: Search API の eventual consistency (index lag) に依存せず、REST の
/// GET /repos/{owner}/{repo}/issues?state=all&per_page=100 で最新 Issue を直接 listing し、
/// body 内に marker があるかを一件ずつ scan する (deterministic、index lag なし)。
/// Phase 3A.1 は Issue 作成頻度が低いため 100 件で十分。 見つからなければ null を返し、
/// 呼び出し側は「安全側停止 (failed, manual_retry_required)」を選択できる。
async function findExistingIssueForMarker(owner: string, repo: string, executionRequestId: string): Promise<{ number: number; html_url: string } | null> {
  const marker = buildIssueMarker(executionRequestId)
  // REST list: recent 100 issues (state=all) を直接取得。 GraphQL / search API は使わない。
  // GitHub の pulls は同 endpoint に含まれるため、PR は body scan で marker が含まれない前提でも
  // 副作用ゼロ (marker は Issue 作成時にのみ埋め込むため PR にはヒットしない)。
  const url = `${GITHUB_API}/repos/${owner}/${repo}/issues?state=all&per_page=100&sort=created&direction=desc`
  try {
    const r = await abortableFetch(url, { headers: ghHeaders() })
    if (!r.ok) return null
    const j = await r.json()
    const items = Array.isArray(j) ? j : []
    for (const it of items) {
      if (typeof it.body === 'string' && it.body.includes(marker) && typeof it.number === 'number') {
        return { number: it.number as number, html_url: (it.html_url as string) ?? '' }
      }
    }
    return null
  } catch {
    return null
  }
}

async function createGithubIssue(
  owner: string,
  repo: string,
  title: string,
  body: string,
  labels: string[],
  executionRequestId: string,
): Promise<{ status: number; ok: boolean; data?: { number: number; html_url: string }; error?: string }> {
  const marker = buildIssueMarker(executionRequestId)
  const bodyWithMarker = `${body}\n\n${marker}`
  try {
    const r = await abortableFetch(`${GITHUB_API}/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body: bodyWithMarker, labels }),
    })
    if (!r.ok) {
      const errText = await r.text().catch(() => '')
      return { status: r.status, ok: false, error: `HTTP ${r.status}: ${errText.slice(0, 300)}` }
    }
    const j = await r.json()
    return { status: r.status, ok: true, data: { number: j.number as number, html_url: j.html_url as string } }
  } catch (err) {
    return { status: 0, ok: false, error: (err as Error).message }
  }
}

/// Main executor: 承認済 execution_request を受け取り、Issue を 1 件作成。
/// 既 succeeded の場合は skip (idempotency)。 timeout 相当時は marker search で duplicate 回避。
export async function executeExecutionRequest(admin: AiHqSupabase, req: ExecutionRow): Promise<ExecutorResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyAdmin = admin as any

  // Idempotency 事前チェック: 既に result.external_id があれば skip。
  if (req.status === 'succeeded' && req.result && (req.result as Record<string, unknown>).external_id) {
    return {
      ok: true,
      external_id: String((req.result as Record<string, unknown>).external_id),
      external_url: String((req.result as Record<string, unknown>).external_url ?? ''),
      duplicate_found: true,
    }
  }

  if (req.execution_type !== 'github_issue_create') {
    return { ok: false, failure_reason: `unsupported execution_type: ${req.execution_type}` }
  }

  const v = validateGhIssuePayload(req.payload)
  if (!v.ok) return { ok: false, failure_reason: `validation: ${v.error}` }
  const p = v.value

  // Test env / development mock (real GitHub write を発火させない)
  if (process.env.AI_HQ_TEST_MOCK_GITHUB_EXECUTE === '1') {
    const stubNum = Math.floor(Math.random() * 90000) + 10000
    return {
      ok: true,
      external_id: `mock-issue-${stubNum}`,
      external_url: `https://github.com/${p.owner}/${p.repo}/issues/${stubNum}`,
    }
  }

  // Round 2 recovery precheck: POST 前に一度 marker scan を行い、既に同 execution_request の
  // Issue が repo に存在するなら POST せず adopt する (前回 POST が実は成功していたケース対策)。
  const preexisting = await findExistingIssueForMarker(p.owner, p.repo, req.id)
  if (preexisting) {
    return { ok: true, external_id: String(preexisting.number), external_url: preexisting.html_url, duplicate_found: true }
  }

  // 1st attempt
  const first = await createGithubIssue(p.owner, p.repo, p.title, p.body, p.labels ?? [], req.id)
  if (first.ok && first.data) {
    return { ok: true, external_id: String(first.data.number), external_url: first.data.html_url }
  }

  // Failure or timeout → REST issue listing + body scan で marker recovery
  const existing = await findExistingIssueForMarker(p.owner, p.repo, req.id)
  if (existing) {
    return { ok: true, external_id: String(existing.number), external_url: existing.html_url, duplicate_found: true }
  }

  // Round 2 policy: marker 未発見なら duplicate 生成を避けるため安全側停止。
  // 自動再 POST は行わない。 CEO が状況確認後に手動で新 execution_request を作る流れ。
  return {
    ok: false,
    failure_reason: `${first.error ?? `HTTP ${first.status}`} — no matching issue found in recent 100. Manual retry required (do not auto-repost, to avoid duplicate).`,
  }
}

/// executor 実行前に UPDATE で status=executing にする。 呼び出し側で使う。
export async function markExecuting(admin: AiHqSupabase, id: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('agent_execution_requests').update({ status: 'executing', updated_at: new Date().toISOString() }).eq('id', id)
}

/// Success / Failure を DB に反映。
export async function recordResult(
  admin: AiHqSupabase,
  id: string,
  r: ExecutorResult,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyAdmin = admin as any
  const now = new Date().toISOString()
  if (r.ok) {
    await anyAdmin
      .from('agent_execution_requests')
      .update({
        status: 'succeeded',
        result: { external_id: r.external_id, external_url: r.external_url, executed_at: now, duplicate_found: r.duplicate_found ?? false },
        executed_at: now,
        updated_at: now,
      })
      .eq('id', id)
  } else {
    await anyAdmin
      .from('agent_execution_requests')
      .update({
        status: 'failed',
        failure_reason: (r.failure_reason ?? 'unknown').slice(0, 500),
        failed_at: now,
        updated_at: now,
      })
      .eq('id', id)
  }
}

/// Auto-proposal 用に execution_type + payload から idempotency_key を作る。
export function makeIdempotencyKey(execution_type: string, canonicalPayloadStr: string, deliverableId: string | null): string {
  return createHash('sha256').update(`${execution_type}|${canonicalPayloadStr}|${deliverableId ?? ''}`).digest('base64url').slice(0, 32)
}
