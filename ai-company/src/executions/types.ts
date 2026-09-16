// AI HQ Phase 3A.1: execution types SoT。
//
// Phase 3A.1 は github_issue_create のみ。 他 type は DB CHECK 制約でも reject される。
// 将来 Phase 3A.2 / 3B で追加する場合は本 file + DB CHECK 制約両方を更新する。

export const EXECUTION_TYPES = ['github_issue_create', 'github_draft_pr_create'] as const
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

// ============================================================
// Phase 3A.2: github_draft_pr_create 用 type / validation
// ============================================================

// Phase 3A.2 初期仕様: 既存ファイルの modify のみ許可。 create / delete / rename / その他は
// 全て validation で reject。 new file 追加は Phase 3A.2 スコープ外。
export const ALLOWED_CHANGE_TYPES = new Set(['modify'])

// Phase 3A.2 初期の変更上限。 超過時は patch を submitted 不可 + execution proposer も reject。
export const PATCH_MAX_FILES = 5
export const PATCH_MAX_TOTAL_DIFF_LINES = 400
export const PATCH_MAX_FILE_BYTES = 100 * 1024 // 100 KB per file

// 変更禁止 path pattern (regex / glob 相当)。 executor + proposer + patch validator 全層で reject。
const FORBIDDEN_PATH_PATTERNS: RegExp[] = [
  /^\.env(\..*)?$/i,               // .env, .env.local, .env.production, ...
  /^\.env\.local(\.save)?$/i,
  /\/\.env(\..*)?$/i,              // */.env
  /^\.github\/workflows\//i,       // GitHub Actions workflows
  /\/supabase\/migrations\//i,     // supabase migrations (Phase 3A.2 初期は禁止)
  /^supabase\/migrations\//i,
  /^package-lock\.json$/i,
  /^yarn\.lock$/i,
  /^pnpm-lock\.yaml$/i,
  /^bun\.lockb$/i,
  /\.(pem|p12|mobileprovision|cer|crt|key)$/i,
  /^ios\/.*\.(xcconfig|plist)$/i,  // iOS 側 build secret
  /^\.vercel\//i,
  /\.(enc|age)$/i,                 // encrypted files
  /^node_modules\//i,
  /^\.next\//i,
  /^dist\//i,
  /^build\//i,
  /\.\.\//,                        // path traversal
]

export function isForbiddenPath(path: string): boolean {
  if (!path || path.length > 500) return true
  if (path.startsWith('/')) return true // absolute path 禁止
  return FORBIDDEN_PATH_PATTERNS.some((re) => re.test(path))
}

// Approve 済み branch prefix 強制。 payload / LLM 出力の branch 名は必ずここを経由。
export const AIHQ_BRANCH_PREFIX = 'ai-hq/'
const BRANCH_SUFFIX_RE = /^[a-z0-9][a-z0-9-]{0,58}[a-z0-9]$/

export function sanitizeBranchName(candidate: string): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof candidate !== 'string') return { ok: false, error: 'branch name must be string' }
  let name = candidate.trim()
  // 既に prefix が付いている場合は剥がして再組立て
  if (name.startsWith(AIHQ_BRANCH_PREFIX)) name = name.slice(AIHQ_BRANCH_PREFIX.length)
  // 小文字化 + [^a-z0-9-] を - に置換 + 連続 - をまとめる + 前後の - を除去 + 60 chars 上限
  name = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/,'')
  if (!BRANCH_SUFFIX_RE.test(name)) return { ok: false, error: `sanitized branch name invalid: '${name}'` }
  return { ok: true, value: AIHQ_BRANCH_PREFIX + name }
}

// content の secret-like 検知パターン (Issue 側と共通 6 個 + Patch 独自 4 個)。
const CONTENT_SECRET_PATTERNS: RegExp[] = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /eyJhbGciOiJI[A-Za-z0-9_-]{30,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /ghp_[A-Za-z0-9]{30,}/,
  /AKIA[0-9A-Z]{16}/,
  /Bearer\s+[A-Za-z0-9_/+=-]{30,}/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"]?[A-Za-z0-9._-]{20,}/i,
  /NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*['"]?eyJ[A-Za-z0-9._-]{20,}/i,
  /OPENAI_API_KEY\s*=\s*['"]?sk-[A-Za-z0-9_-]{20,}/i,
]

function hasSecretPattern(text: string): boolean {
  return CONTENT_SECRET_PATTERNS.some((re) => re.test(text))
}

// binary 検出 (NUL byte を含む場合は binary 扱い)
function looksBinary(text: string): boolean {
  return text.includes('\0')
}

export interface GhDraftPrFile {
  path: string
  // Phase 3A.2 初期: 'modify' のみ。 create / delete / rename は禁止。
  change_type: 'modify'
  new_content: string       // 完全な変更後 content (utf-8 想定)
  new_content_hash?: string // sha256 hash (integrity; optional but recommended)
  diff: string              // unified diff (CEO 表示用、executor は new_content を優先)
  additions: number
  deletions: number
}

export interface GhDraftPrCreatePayload {
  owner: string
  repo: string
  base_branch: string       // 常に 'main' (server-side に強制)
  base_sha: string          // 生成時点の main HEAD、 executor 側で現行 main と比較
  branch_name: string       // 'ai-hq/<sanitized>' 形式、 server-side sanitize 済み
  commit_message: string
  pr_title: string
  pr_body: string           // marker は executor 側で末尾に追加
  files: GhDraftPrFile[]
  total_additions: number
  total_deletions: number
}

// Phase 3A.2 の Draft PR create 用 payload validation。 route + executor の両方で呼ぶ。
// 既存 validateGhIssuePayload と同じ pattern で 'ok' 分岐を返す。
export function validateGhDraftPrPayload(
  p: unknown,
): { ok: true; value: GhDraftPrCreatePayload } | { ok: false; error: string } {
  if (!p || typeof p !== 'object') return { ok: false, error: 'payload must be object' }
  const o = p as Record<string, unknown>

  const owner = typeof o.owner === 'string' ? o.owner.trim() : ''
  const repo = typeof o.repo === 'string' ? o.repo.trim() : ''
  if (!owner || !repo) return { ok: false, error: 'owner and repo required' }
  const allow = allowedRepos()
  if (!allow.includes(`${owner}/${repo}`)) return { ok: false, error: `repo ${owner}/${repo} not in allowlist` }

  // base_branch は必ず 'main' (server-side 強制)。 payload 改ざんによる develop/hotfix 変更を防ぐ。
  const base_branch = typeof o.base_branch === 'string' ? o.base_branch.trim() : ''
  if (base_branch !== 'main') return { ok: false, error: `base_branch must be 'main' (got '${base_branch}')` }

  const base_sha = typeof o.base_sha === 'string' ? o.base_sha.trim() : ''
  if (!/^[0-9a-f]{40}$/.test(base_sha)) return { ok: false, error: 'base_sha must be 40-char hex' }

  // branch_name は必ず ai-hq/ prefix + sanitize 結果に一致
  const branch_name_raw = typeof o.branch_name === 'string' ? o.branch_name : ''
  const sanitized = sanitizeBranchName(branch_name_raw)
  if (!sanitized.ok) return { ok: false, error: `branch_name: ${sanitized.error}` }
  if (sanitized.value !== branch_name_raw) return { ok: false, error: `branch_name must be pre-sanitized (expected '${sanitized.value}')` }

  const commit_message = typeof o.commit_message === 'string' ? o.commit_message.trim() : ''
  if (commit_message.length < 5 || commit_message.length > 200) return { ok: false, error: 'commit_message must be 5-200 chars' }

  const pr_title = typeof o.pr_title === 'string' ? o.pr_title.trim() : ''
  if (pr_title.length < 5 || pr_title.length > 256) return { ok: false, error: 'pr_title must be 5-256 chars' }

  const pr_body = typeof o.pr_body === 'string' ? o.pr_body : ''
  if (pr_body.length > 8000) return { ok: false, error: 'pr_body too long (max 8000 chars)' }

  const filesRaw = Array.isArray(o.files) ? o.files : []
  if (filesRaw.length === 0) return { ok: false, error: 'files must contain at least 1 entry' }
  if (filesRaw.length > PATCH_MAX_FILES) return { ok: false, error: `too many files (max ${PATCH_MAX_FILES})` }

  const files: GhDraftPrFile[] = []
  let total_additions = 0
  let total_deletions = 0
  const seenPaths = new Set<string>()

  for (const raw of filesRaw) {
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'file entry must be object' }
    const f = raw as Record<string, unknown>
    const path = typeof f.path === 'string' ? f.path.trim() : ''
    if (!path) return { ok: false, error: 'file.path required' }
    if (seenPaths.has(path)) return { ok: false, error: `duplicate file path '${path}'` }
    seenPaths.add(path)
    if (isForbiddenPath(path)) return { ok: false, error: `forbidden path '${path}'` }
    const change_type = typeof f.change_type === 'string' ? f.change_type : ''
    // Phase 3A.2 初期仕様: modify のみ許可。 create / delete / rename / unknown は全て reject。
    if (!ALLOWED_CHANGE_TYPES.has(change_type)) {
      return { ok: false, error: `change_type '${change_type}' not allowed in Phase 3A.2 (only 'modify' — new file / delete / rename are out of scope)` }
    }
    const new_content = typeof f.new_content === 'string' ? f.new_content : ''
    if (new_content.length === 0) return { ok: false, error: `file '${path}' new_content empty` }
    if (new_content.length > PATCH_MAX_FILE_BYTES) return { ok: false, error: `file '${path}' new_content exceeds ${PATCH_MAX_FILE_BYTES}B` }
    if (looksBinary(new_content)) return { ok: false, error: `file '${path}' looks binary (NUL byte)` }
    if (hasSecretPattern(new_content)) return { ok: false, error: `file '${path}' contains secret-like pattern` }
    const diff = typeof f.diff === 'string' ? f.diff : ''
    if (diff.length > 20000) return { ok: false, error: `file '${path}' diff too long` }
    if (hasSecretPattern(diff)) return { ok: false, error: `file '${path}' diff contains secret-like pattern` }
    const additions = typeof f.additions === 'number' && f.additions >= 0 ? Math.floor(f.additions) : 0
    const deletions = typeof f.deletions === 'number' && f.deletions >= 0 ? Math.floor(f.deletions) : 0
    total_additions += additions
    total_deletions += deletions
    const new_content_hash = typeof f.new_content_hash === 'string' ? f.new_content_hash : undefined
    files.push({ path, change_type: 'modify', new_content, new_content_hash, diff, additions, deletions })
  }

  if (total_additions + total_deletions > PATCH_MAX_TOTAL_DIFF_LINES) {
    return { ok: false, error: `total diff lines ${total_additions + total_deletions} > max ${PATCH_MAX_TOTAL_DIFF_LINES}` }
  }
  if (hasSecretPattern(`${pr_title}\n${pr_body}\n${commit_message}`)) {
    return { ok: false, error: 'title/body/message contains secret-like pattern' }
  }

  return {
    ok: true,
    value: { owner, repo, base_branch, base_sha, branch_name: sanitized.value, commit_message, pr_title, pr_body, files, total_additions, total_deletions },
  }
}
