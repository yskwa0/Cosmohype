// AI HQ Phase 2B: GitHub READ-only fetcher。
//
// - Cosmohype repo は public のため、env AI_HQ_GITHUB_READ_TOKEN があれば Bearer で送るが、
//   無くても unauthenticated (rate 60/hr) で動く。
// - ETag 尊重 (Conditional GET) で 304 なら空応答 → 上位で LLM 0 call。
// - fetch 対象は commits / open PRs / open Issues / workflow runs のみ、write は絶対に呼ばない。

const OWNER = 'yskwa0'
const REPO = 'Cosmohype'
const API_BASE = 'https://api.github.com'
const UA = 'CosmohypeAIResearchBot/2.0'
const TIMEOUT_MS = 10000

export interface GhResponse<T> {
  status: number
  data: T | null
  etag: string | null
  rateRemaining: string | null
  rateLimit: string | null
  rateResetAt: string | null
  error?: string
}

function buildHeaders(etag?: string | null): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': UA,
  }
  const token = process.env.AI_HQ_GITHUB_READ_TOKEN
  if (token && token.length > 0) h.Authorization = `Bearer ${token}`
  if (etag) h['If-None-Match'] = etag
  return h
}

async function abortable(url: string, headers: Record<string, string>): Promise<Response> {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { headers, signal: c.signal })
  } finally {
    clearTimeout(t)
  }
}

async function get<T>(path: string, etag?: string | null): Promise<GhResponse<T>> {
  try {
    const res = await abortable(`${API_BASE}${path}`, buildHeaders(etag))
    const rateRemaining = res.headers.get('x-ratelimit-remaining')
    const rateLimit = res.headers.get('x-ratelimit-limit')
    const rateResetRaw = res.headers.get('x-ratelimit-reset')
    const rateResetAt = rateResetRaw ? new Date(Number(rateResetRaw) * 1000).toISOString() : null
    const newEtag = res.headers.get('etag')
    if (res.status === 304) {
      return { status: 304, data: null, etag: etag ?? null, rateRemaining, rateLimit, rateResetAt }
    }
    if (!res.ok) {
      return { status: res.status, data: null, etag: newEtag, rateRemaining, rateLimit, rateResetAt, error: `HTTP ${res.status}` }
    }
    const data = (await res.json()) as T
    return { status: 200, data, etag: newEtag, rateRemaining, rateLimit, rateResetAt }
  } catch (err) {
    return { status: 0, data: null, etag: null, rateRemaining: null, rateLimit: null, rateResetAt: null, error: (err as Error).message }
  }
}

export interface GhCommit {
  sha: string
  commit: { message: string; author?: { name?: string; date?: string } }
  html_url: string
  files?: Array<{ filename: string; status: string; additions: number; deletions: number }>
}
export interface GhPull {
  number: number
  title: string
  state: string
  updated_at: string
  html_url: string
  user: { login: string } | null
  draft: boolean
}
export interface GhIssue {
  number: number
  title: string
  state: string
  updated_at: string
  html_url: string
  user: { login: string } | null
  pull_request?: unknown
}
export interface GhRun {
  id: number
  name: string | null
  status: string
  conclusion: string | null
  head_sha: string
  html_url: string
  created_at: string
  updated_at: string
  head_branch: string | null
  event: string
}

export function listCommits(sinceIso: string, etag?: string | null) {
  const q = new URLSearchParams({ since: sinceIso, per_page: '20', sha: 'main' })
  return get<GhCommit[]>(`/repos/${OWNER}/${REPO}/commits?${q}`, etag)
}
export function listOpenPulls(etag?: string | null) {
  const q = new URLSearchParams({ state: 'open', sort: 'updated', direction: 'desc', per_page: '10' })
  return get<GhPull[]>(`/repos/${OWNER}/${REPO}/pulls?${q}`, etag)
}
export function listOpenIssues(etag?: string | null) {
  const q = new URLSearchParams({ state: 'open', sort: 'updated', direction: 'desc', per_page: '10' })
  return get<GhIssue[]>(`/repos/${OWNER}/${REPO}/issues?${q}`, etag)
}
export function listRuns(etag?: string | null) {
  const q = new URLSearchParams({ per_page: '15', branch: 'main' })
  return get<{ workflow_runs: GhRun[] }>(`/repos/${OWNER}/${REPO}/actions/runs?${q}`, etag)
}
