// AI HQ Phase 3A.2: code_patch approved 時の github_draft_pr_create execution_request 生成。
//
// engineering_plan (Phase 3A.1 flow) とは別の proposer。 reviewer.ts の approve hook から
// deliverable_type === 'code_patch' の場合に呼ばれる。
//
// 生成内容:
// - execution_type = 'github_draft_pr_create'
// - risk_level = 'medium' (Phase 3A.2 の Draft PR は必ず medium 以上)
// - status = 'waiting_for_approval'
// - payload は code_patch.content から deterministic に組み立てる (LLM 不介入)
// - idempotency_key = sha256(execution_type | canonical_payload | deliverable_id) の 32-char base64url

import type { AiHqSupabase } from '../types'
import {
  allowedRepos,
  canonicalPayload,
  isForbiddenPath,
  sanitizeBranchName,
  PATCH_MAX_FILES,
  PATCH_MAX_TOTAL_DIFF_LINES,
  ALLOWED_CHANGE_TYPES,
  type GhDraftPrCreatePayload,
  type GhDraftPrFile,
} from './types'
import { makeIdempotencyKey } from './executor'

interface CodePatchFileInput {
  path: string
  change_type: string
  additions?: number
  deletions?: number
  diff?: string
  new_content?: string
  new_content_hash?: string
}

interface CodePatchContent {
  repository?: string           // 'yskwa0/Cosmohype-ai-hq-test' 形式 or 'yskwa0/Cosmohype'
  base_branch?: string          // 'main' 固定
  base_sha?: string
  summary?: string              // 短文タイトル的な説明
  ceo_summary?: string          // Phase 3A.2: CEO 向け 1〜3 短文 (何を / なぜ / 機能影響)。 UI 優先表示。
  rationale?: string            // LLM の技術長文。 audit / PR body に残るが CEO UI では非表示。
  risk_level?: string
  files?: CodePatchFileInput[]
  total_additions?: number
  total_deletions?: number
  total_changed_lines?: number
  validation?: Record<string, unknown>
  commit_message?: string
  pr_title?: string
  pr_body?: string
}

interface DeliverableSlim {
  id: string
  task_id: string | null
  agent_id: string
  deliverable_type: string
  title: string
  content: Record<string, unknown>
  status: string
}

function buildPrBody(patch: CodePatchContent, del: DeliverableSlim): string {
  const filesLines = (patch.files ?? []).map((f) => `- \`${f.path}\` (${f.change_type}, +${f.additions ?? 0}/-${f.deletions ?? 0})`).join('\n')
  const summary = (patch.summary ?? '').trim()
  const ceoSummary = (patch.ceo_summary ?? '').trim()
  const rationale = (patch.rationale ?? '').trim()
  const totalAdd = patch.total_additions ?? 0
  const totalDel = patch.total_deletions ?? 0
  const baseShaShort = (patch.base_sha ?? '').slice(0, 12)
  const sections = [
    `## AI HQ 自動生成 Draft PR`,
    '',
    `このPRは Cosmohype AI HQ の CEO 承認済み code_patch (deliverable \`${del.id}\`) から自動生成されました。`,
    '',
    `- **提案者**: ${del.agent_id}`,
    `- **base commit**: \`${baseShaShort}\``,
    `- **変更ファイル数**: ${(patch.files ?? []).length}`,
    `- **diff**: +${totalAdd}/-${totalDel}`,
    '',
    `### 変更ファイル`,
    filesLines || '(none)',
    '',
    summary ? `### 概要\n${summary}` : '',
    // Phase 3A.2: CEO 向け短文説明を優先表示。 rationale は audit 用に technical background 見出しへ移動。
    ceoSummary ? `### 変更理由\n${ceoSummary}` : '',
    rationale ? `### 技術背景 (audit)\n${rationale}` : '',
    '',
    `**このPRは自動 merge されません。 人間レビュー後に CEO または maintainer が判断してください。**`,
  ].filter((s) => s !== '')
  return sections.join('\n').slice(0, 7500)
}

function isActionableCodePatch(content: CodePatchContent): { ok: boolean; reason?: string } {
  const repo = (content.repository ?? '').trim()
  if (!repo.includes('/')) return { ok: false, reason: `repository invalid: '${repo}'` }
  if ((content.base_branch ?? '').trim() !== 'main') return { ok: false, reason: `base_branch must be 'main'` }
  const base_sha = (content.base_sha ?? '').trim()
  if (!/^[0-9a-f]{40}$/.test(base_sha)) return { ok: false, reason: 'base_sha must be 40-char hex' }
  const files = Array.isArray(content.files) ? content.files : []
  if (files.length === 0) return { ok: false, reason: 'no files' }
  if (files.length > PATCH_MAX_FILES) return { ok: false, reason: `too many files (${files.length} > ${PATCH_MAX_FILES})` }
  let totalDiffLines = 0
  const seen = new Set<string>()
  for (const f of files) {
    if (!f.path) return { ok: false, reason: 'file.path missing' }
    if (seen.has(f.path)) return { ok: false, reason: `duplicate path '${f.path}'` }
    seen.add(f.path)
    if (isForbiddenPath(f.path)) return { ok: false, reason: `forbidden path '${f.path}'` }
    // Phase 3A.2 初期: modify のみ。 create / delete / rename / unknown は全て reject。
    if (!ALLOWED_CHANGE_TYPES.has(f.change_type)) {
      return { ok: false, reason: `change_type '${f.change_type}' not allowed in Phase 3A.2 (only 'modify')` }
    }
    if (!f.new_content) return { ok: false, reason: `file '${f.path}' new_content missing` }
    totalDiffLines += (f.additions ?? 0) + (f.deletions ?? 0)
  }
  if (totalDiffLines > PATCH_MAX_TOTAL_DIFF_LINES) return { ok: false, reason: `total diff lines ${totalDiffLines} > ${PATCH_MAX_TOTAL_DIFF_LINES}` }
  return { ok: true }
}

/// code_patch approved 時に呼ぶ。 対象外なら null を返す (execution_request 作らない)。
export async function proposeDraftPrForApprovedPatch(
  admin: AiHqSupabase,
  deliverableId: string,
): Promise<{ execution_request_id: string; created: true } | { created: false; reason: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyAdmin = admin as any

  const { data: d } = await anyAdmin
    .from('agent_deliverables')
    .select('id, task_id, agent_id, deliverable_type, title, content, status')
    .eq('id', deliverableId)
    .maybeSingle()
  if (!d) return { created: false, reason: 'deliverable not found' }
  if (d.status !== 'approved') return { created: false, reason: `deliverable status ${d.status}, expected approved` }
  if (d.deliverable_type !== 'code_patch') return { created: false, reason: `type ${d.deliverable_type} not code_patch` }

  const del = d as DeliverableSlim
  const content = (del.content ?? {}) as CodePatchContent

  const ok = isActionableCodePatch(content)
  if (!ok.ok) return { created: false, reason: `non-actionable: ${ok.reason}` }

  // repo allowlist 適合確認 (Env AI_HQ_GITHUB_ALLOWED_REPOS)
  const [owner, repo] = (content.repository ?? '').split('/')
  const allow = allowedRepos()
  if (!allow.includes(`${owner}/${repo}`)) return { created: false, reason: `repo ${owner}/${repo} not in allowlist` }

  // branch name sanitize (payload に格納する前に必ず経由)
  const rawBranch = (typeof content.summary === 'string' && content.summary.trim().length > 0)
    ? content.summary
    : (del.title || 'ai-hq-patch')
  const s = sanitizeBranchName(rawBranch)
  if (!s.ok) return { created: false, reason: `branch name: ${s.error}` }
  const branch_name = s.value

  const commit_message = (content.commit_message ?? '').trim() ||
    `ai-hq: ${(content.summary ?? del.title).slice(0, 100)}`

  const pr_title = (content.pr_title ?? '').trim() ||
    `[AI HQ] ${(content.summary ?? del.title).slice(0, 200)}`

  const pr_body = buildPrBody(content, del)

  const files: GhDraftPrFile[] = (content.files ?? []).map((f) => ({
    path: f.path,
    // isActionableCodePatch を通っている前提で modify のみ。 その他は既に reject 済み。
    change_type: 'modify' as const,
    new_content: f.new_content ?? '',
    new_content_hash: f.new_content_hash,
    diff: f.diff ?? '',
    additions: f.additions ?? 0,
    deletions: f.deletions ?? 0,
  }))

  const total_additions = files.reduce((s, f) => s + f.additions, 0)
  const total_deletions = files.reduce((s, f) => s + f.deletions, 0)

  const payload: GhDraftPrCreatePayload = {
    owner,
    repo,
    base_branch: 'main',
    base_sha: content.base_sha ?? '',
    branch_name,
    commit_message,
    pr_title,
    pr_body,
    files,
    total_additions,
    total_deletions,
  }

  const idempotencyKey = makeIdempotencyKey('github_draft_pr_create', canonicalPayload(payload as unknown as Record<string, unknown>), del.id)

  const { data: existing } = await anyAdmin
    .from('agent_execution_requests')
    .select('id, status')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()
  if (existing) {
    return { created: false, reason: `duplicate idempotency_key (existing status=${existing.status})` }
  }

  const summary = `Create Draft PR in ${owner}/${repo} on branch ${branch_name}. No merge, no deploy.`
  const { data: ins, error } = await anyAdmin
    .from('agent_execution_requests')
    .insert({
      deliverable_id: del.id,
      task_id: del.task_id,
      agent_id: del.agent_id,
      execution_type: 'github_draft_pr_create',
      title: pr_title,
      summary,
      payload: payload as unknown as Record<string, unknown>,
      risk_level: 'medium',
      status: 'waiting_for_approval',
      requires_ceo_approval: true,
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single()
  if (error) return { created: false, reason: `insert failed: ${error.message}` }
  return { execution_request_id: (ins as { id: string }).id, created: true }
}
