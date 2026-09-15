// AI HQ Phase 3A.1: execution types SoT。
//
// Phase 3A.1 は github_issue_create のみ。 他 type は DB CHECK 制約でも reject される。
// 将来 Phase 3A.2 / 3B で追加する場合は本 file + DB CHECK 制約両方を更新する。

export const EXECUTION_TYPES = ['github_issue_create'] as const
export type ExecutionType = (typeof EXECUTION_TYPES)[number]

export const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const
export type RiskLevel = (typeof RISK_LEVELS)[number]

// Phase 3A.1: low のみ実行可能、medium は CEO 明示 approve、high/critical は禁止。
export function isExecutableRisk(r: RiskLevel): boolean {
  return r === 'low' || r === 'medium'
}

// Test env / Prod で使う repo のホワイトリスト。
// Prod cutover 前は Test repo に絞る (env `AI_HQ_GITHUB_ALLOWED_REPOS` で override 可能)。
export function allowedRepos(): string[] {
  const env = process.env.AI_HQ_GITHUB_ALLOWED_REPOS
  if (env) return env.split(',').map((s) => s.trim()).filter(Boolean)
  return [] // 空 = 全 reject (env 未設定なら安全側)
}

// GitHub Issue create 時に payload に含めて良い label のホワイトリスト。
// Prod 用の `ai-hq / ai-suggested` に加えて、Test repo で既存の GitHub default labels
// (`bug / enhancement / question / documentation / good first issue / help wanted /
// duplicate / invalid / wontfix / accessibility`) も許可、そうすれば label 作成権限を
// PAT に要求せずに済む。
export const ALLOWED_LABELS = new Set([
  'ai-hq',
  'ai-hq-test',
  'ai-suggested',
  'bug',
  'enhancement',
  'question',
  'documentation',
  'good first issue',
  'help wanted',
  'duplicate',
  'invalid',
  'wontfix',
  'accessibility',
])

// payload schema for github_issue_create
export interface GhIssueCreatePayload {
  owner: string
  repo: string
  title: string
  body: string
  labels?: string[]
}

export function validateGhIssuePayload(p: unknown): { ok: true; value: GhIssueCreatePayload } | { ok: false; error: string } {
  if (!p || typeof p !== 'object') return { ok: false, error: 'payload must be object' }
  const o = p as Record<string, unknown>
  const owner = typeof o.owner === 'string' ? o.owner.trim() : ''
  const repo = typeof o.repo === 'string' ? o.repo.trim() : ''
  const title = typeof o.title === 'string' ? o.title.trim() : ''
  const body = typeof o.body === 'string' ? o.body : ''
  const labels = Array.isArray(o.labels) ? o.labels.filter((x): x is string => typeof x === 'string').map((s) => s.trim()) : []

  if (!owner || !repo) return { ok: false, error: 'owner and repo required' }
  const full = `${owner}/${repo}`
  const allow = allowedRepos()
  if (!allow.includes(full)) return { ok: false, error: `repo ${full} not in allowlist` }
  if (title.length < 5 || title.length > 256) return { ok: false, error: 'title must be 5-256 chars' }
  if (body.length > 8000) return { ok: false, error: 'body too long (max 8000 chars)' }
  const filteredLabels = labels.filter((l) => ALLOWED_LABELS.has(l))
  // Secret-like patterns scan (block obvious credential leaks in body).
  const secretPatterns: RegExp[] = [
    /sk-[A-Za-z0-9_-]{20,}/,           // OpenAI style
    /eyJhbGciOiJI[A-Za-z0-9_-]{30,}/,  // JWT
    /github_pat_[A-Za-z0-9_]{20,}/,    // GitHub PAT
    /ghp_[A-Za-z0-9]{30,}/,            // GitHub classic PAT
    /AKIA[0-9A-Z]{16}/,                // AWS access key
    /Bearer\s+[A-Za-z0-9_/+=-]{30,}/i,  // generic Bearer
  ]
  const combined = `${title}\n${body}`
  for (const re of secretPatterns) {
    if (re.test(combined)) return { ok: false, error: 'payload contains secret-like pattern' }
  }
  return { ok: true, value: { owner, repo, title, body, labels: filteredLabels } }
}

export function canonicalPayload(payload: Record<string, unknown>): string {
  // sort keys deterministically for hash
  const keys = Object.keys(payload).sort()
  const out: Record<string, unknown> = {}
  for (const k of keys) out[k] = payload[k]
  return JSON.stringify(out)
}
