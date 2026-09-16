// AI HQ Phase 3A.2: github_draft_pr_create executor (server-only, deterministic)。
//
// - LLM を一切呼ばない (固定 workflow)
// - Git Data API (blobs → trees → commits → refs) + Pull Request API を組み合わせ
// - branch は必ず ai-hq/* prefix、 base branch は main 固定 (server-side に強制)
// - draft=true を server-side に強制 (payload に draft field を持たせない)
// - marker (`<!-- ai-hq-execution:<id> -->`) を PR body に埋め込み、 retry 時に adopt
// - main SHA を fetch し patch.base_sha と比較、 mismatch なら stale_patch reject
// - AI は branch を自動削除しない (partial failure でも安全側停止)
// - AI_HQ_TEST_MOCK_GITHUB_PR_EXECUTE=1 で Test env のみ synthetic success
//
// Phase 3A.2 では Test repo (yskwa0/Cosmohype-ai-hq-test) 用の PAT を
// AI_HQ_GITHUB_PR_WRITE_TOKEN env に指定する。 Phase 3A.1 の Issue PAT
// (AI_HQ_GITHUB_WRITE_TOKEN) とは分離運用。

import type { AiHqSupabase } from '../types'
import { validateGhDraftPrPayload, type GhDraftPrCreatePayload } from './types'
import type { ExecutionRow, ExecutorResult } from './executor'

const GITHUB_API = 'https://api.github.com'
const USER_AGENT = 'CosmohypeAIHQDraftPrExecutor/1.0'
const TIMEOUT_MS = 20000

function buildMarker(executionRequestId: string): string {
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
  const token = process.env.AI_HQ_GITHUB_PR_WRITE_TOKEN
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': USER_AGENT,
  }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

async function ghGet<T = unknown>(url: string): Promise<{ status: number; ok: boolean; data?: T; error?: string }> {
  try {
    const r = await abortableFetch(url, { headers: ghHeaders() })
    const status = r.status
    if (!r.ok) return { status, ok: false, error: `HTTP ${status}: ${(await r.text().catch(() => '')).slice(0, 200)}` }
    const data = (await r.json()) as T
    return { status, ok: true, data }
  } catch (err) {
    return { status: 0, ok: false, error: (err as Error).message }
  }
}

async function ghPost<T = unknown>(url: string, body: unknown): Promise<{ status: number; ok: boolean; data?: T; error?: string }> {
  try {
    const r = await abortableFetch(url, {
      method: 'POST',
      headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const status = r.status
    if (!r.ok) return { status, ok: false, error: `HTTP ${status}: ${(await r.text().catch(() => '')).slice(0, 300)}` }
    const data = (await r.json()) as T
    return { status, ok: true, data }
  } catch (err) {
    return { status: 0, ok: false, error: (err as Error).message }
  }
}

interface GhBranch { commit: { sha: string; commit: { tree: { sha: string } } } }
interface GhBlobResp { sha: string }
interface GhTreeResp { sha: string }
interface GhCommitResp { sha: string }
interface GhRefResp { ref: string; object: { sha: string } }
interface GhPrItem { number: number; html_url: string; body: string | null; head: { ref: string; sha: string }; base: { ref: string }; draft?: boolean; state: string }

/// 現在の main の HEAD commit SHA + tree SHA を取得。
async function getMainHead(owner: string, repo: string): Promise<{ ok: true; commit_sha: string; tree_sha: string } | { ok: false; error: string }> {
  const r = await ghGet<GhBranch>(`${GITHUB_API}/repos/${owner}/${repo}/branches/main`)
  if (!r.ok || !r.data) return { ok: false, error: r.error ?? 'main branch fetch failed' }
  const commit_sha = r.data.commit?.sha
  const tree_sha = r.data.commit?.commit?.tree?.sha
  if (!commit_sha || !tree_sha) return { ok: false, error: 'main head missing commit/tree sha' }
  return { ok: true, commit_sha, tree_sha }
}

/// marker が埋め込まれた既存 Draft PR を head=<owner>:<branch> で listing → body scan で発見。
/// Phase 3A.1 の Issue 側と同じく Search API に依存しない (index lag 無し)。
async function findExistingPrForMarker(
  owner: string,
  repo: string,
  branchName: string,
  executionRequestId: string,
): Promise<{ number: number; html_url: string } | null> {
  const marker = buildMarker(executionRequestId)
  const url = `${GITHUB_API}/repos/${owner}/${repo}/pulls?state=all&per_page=50&head=${encodeURIComponent(`${owner}:${branchName}`)}`
  const r = await ghGet<GhPrItem[]>(url)
  if (!r.ok || !Array.isArray(r.data)) return null
  for (const pr of r.data) {
    const body = pr.body ?? ''
    if (body.includes(marker) && typeof pr.number === 'number') {
      return { number: pr.number, html_url: pr.html_url ?? '' }
    }
  }
  return null
}

/// ai-hq/<name> branch の現在の commit SHA を取得。 404 なら null。
async function getBranchSha(owner: string, repo: string, branchName: string): Promise<string | null> {
  const r = await ghGet<GhRefResp>(`${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branchName)}`)
  if (!r.ok || !r.data) return null
  return r.data.object?.sha ?? null
}

async function createBlob(owner: string, repo: string, content: string): Promise<{ ok: true; sha: string } | { ok: false; error: string }> {
  const b64 = Buffer.from(content, 'utf-8').toString('base64')
  const r = await ghPost<GhBlobResp>(`${GITHUB_API}/repos/${owner}/${repo}/git/blobs`, { content: b64, encoding: 'base64' })
  if (!r.ok || !r.data) return { ok: false, error: r.error ?? 'blob create failed' }
  return { ok: true, sha: r.data.sha }
}

async function createTree(
  owner: string,
  repo: string,
  base_tree: string,
  entries: Array<{ path: string; sha: string }>,
): Promise<{ ok: true; sha: string } | { ok: false; error: string }> {
  const tree = entries.map((e) => ({ path: e.path, mode: '100644', type: 'blob', sha: e.sha }))
  const r = await ghPost<GhTreeResp>(`${GITHUB_API}/repos/${owner}/${repo}/git/trees`, { base_tree, tree })
  if (!r.ok || !r.data) return { ok: false, error: r.error ?? 'tree create failed' }
  return { ok: true, sha: r.data.sha }
}

async function createCommit(
  owner: string,
  repo: string,
  message: string,
  tree: string,
  parent: string,
): Promise<{ ok: true; sha: string } | { ok: false; error: string }> {
  const r = await ghPost<GhCommitResp>(`${GITHUB_API}/repos/${owner}/${repo}/git/commits`, { message, tree, parents: [parent] })
  if (!r.ok || !r.data) return { ok: false, error: r.error ?? 'commit create failed' }
  return { ok: true, sha: r.data.sha }
}

async function createRef(
  owner: string,
  repo: string,
  branchName: string,
  sha: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const r = await ghPost(`${GITHUB_API}/repos/${owner}/${repo}/git/refs`, { ref: `refs/heads/${branchName}`, sha })
  if (!r.ok) return { ok: false, error: r.error ?? 'ref create failed', status: r.status }
  return { ok: true }
}

async function createDraftPr(
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string,
): Promise<{ ok: true; number: number; html_url: string } | { ok: false; error: string }> {
  // draft=true を必ずここで固定。 payload に draft を持たせず、 server-side で強制。
  const r = await ghPost<GhPrItem>(`${GITHUB_API}/repos/${owner}/${repo}/pulls`, { title, body, head, base, draft: true })
  if (!r.ok || !r.data) return { ok: false, error: r.error ?? 'pr create failed' }
  return { ok: true, number: r.data.number, html_url: r.data.html_url }
}

interface DraftPrCheckpoint {
  base_sha_verified?: boolean
  branch_precheck_state?: 'absent' | 'match' | 'conflict'
  blobs_created?: Array<{ path: string; blob_sha: string }>
  tree_sha?: string
  commit_sha?: string
  branch_created?: boolean
  pr_number?: number
  pr_url?: string
  final_step?: string
  duplicate_found?: boolean
}

async function updateCheckpoint(admin: AiHqSupabase, id: string, step: string, patch: DraftPrCheckpoint): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyAdmin = admin as any
  const { data: cur } = await anyAdmin.from('agent_execution_requests').select('result').eq('id', id).maybeSingle()
  const prev = (cur?.result as Record<string, unknown> | null) ?? {}
  const merged = { ...prev, ...patch, final_step: step }
  await anyAdmin.from('agent_execution_requests').update({ result: merged, updated_at: new Date().toISOString() }).eq('id', id)
}

/// Main entry: approve-execute route から dispatch される。
export async function executeDraftPrCreate(admin: AiHqSupabase, req: ExecutionRow): Promise<ExecutorResult> {
  // Idempotency: 既 succeeded で external_id あれば skip。
  if (req.status === 'succeeded' && req.result && (req.result as Record<string, unknown>).external_id) {
    return {
      ok: true,
      external_id: String((req.result as Record<string, unknown>).external_id),
      external_url: String((req.result as Record<string, unknown>).external_url ?? ''),
      duplicate_found: true,
    }
  }

  const v = validateGhDraftPrPayload(req.payload)
  if (!v.ok) return { ok: false, failure_reason: `validation: ${v.error}` }
  const p: GhDraftPrCreatePayload = v.value

  // Test env / development mock
  if (process.env.AI_HQ_TEST_MOCK_GITHUB_PR_EXECUTE === '1') {
    const stubNum = Math.floor(Math.random() * 90000) + 10000
    return {
      ok: true,
      external_id: `mock-pr-${stubNum}`,
      external_url: `https://github.com/${p.owner}/${p.repo}/pull/${stubNum}`,
    }
  }

  // STEP 6: marker precheck (既 PR adopt)
  const preexisting = await findExistingPrForMarker(p.owner, p.repo, p.branch_name, req.id)
  if (preexisting) {
    await updateCheckpoint(admin, req.id, 'adopted_existing_pr', { pr_number: preexisting.number, pr_url: preexisting.html_url, duplicate_found: true })
    return { ok: true, external_id: String(preexisting.number), external_url: preexisting.html_url, duplicate_found: true }
  }

  // STEP 4-5: fetch current main SHA + base_sha 比較
  const mainHead = await getMainHead(p.owner, p.repo)
  if (!mainHead.ok) return { ok: false, failure_reason: `fetch main failed: ${mainHead.error}` }
  if (mainHead.commit_sha !== p.base_sha) {
    await updateCheckpoint(admin, req.id, 'stale_patch_detected', { base_sha_verified: false })
    return {
      ok: false,
      failure_reason: `stale_patch: patch.base_sha=${p.base_sha} but current main is ${mainHead.commit_sha}. Please regenerate patch on latest main.`,
    }
  }
  await updateCheckpoint(admin, req.id, 'base_sha_verified', { base_sha_verified: true })

  // STEP 7: branch precheck
  const existingBranchSha = await getBranchSha(p.owner, p.repo, p.branch_name)
  const prevCommitSha = (req.result as Record<string, unknown> | null)?.commit_sha
  if (existingBranchSha) {
    if (prevCommitSha && existingBranchSha === prevCommitSha) {
      // 過去成功 commit sha と一致 → PR create から resume
      await updateCheckpoint(admin, req.id, 'branch_resume_from_pr_create', { branch_precheck_state: 'match', branch_created: true, commit_sha: existingBranchSha })
    } else {
      // conflict (人間 or 別 execution が同名 branch を作った)
      await updateCheckpoint(admin, req.id, 'branch_conflict', { branch_precheck_state: 'conflict' })
      return { ok: false, failure_reason: `branch conflict: 'refs/heads/${p.branch_name}' already exists with sha ${existingBranchSha} (expected fresh create). Manual resolution required.` }
    }
  } else {
    await updateCheckpoint(admin, req.id, 'branch_precheck_absent', { branch_precheck_state: 'absent' })
  }

  let commitShaForPr: string | undefined = existingBranchSha ?? undefined

  // STEP 8-12: branch がまだ無い場合のみ blob → tree → commit → ref を作る
  if (!existingBranchSha) {
    // 8. blobs
    const blobs: Array<{ path: string; blob_sha: string }> = []
    for (const f of p.files) {
      const b = await createBlob(p.owner, p.repo, f.new_content)
      if (!b.ok) return { ok: false, failure_reason: `blob create failed for '${f.path}': ${b.error}` }
      blobs.push({ path: f.path, blob_sha: b.sha })
    }
    await updateCheckpoint(admin, req.id, 'blobs_created', { blobs_created: blobs })

    // 10. tree
    const tree = await createTree(p.owner, p.repo, mainHead.tree_sha, blobs.map((b) => ({ path: b.path, sha: b.blob_sha })))
    if (!tree.ok) return { ok: false, failure_reason: `tree create failed: ${tree.error}` }
    await updateCheckpoint(admin, req.id, 'tree_created', { tree_sha: tree.sha })

    // 11. commit
    const commit = await createCommit(p.owner, p.repo, p.commit_message, tree.sha, mainHead.commit_sha)
    if (!commit.ok) return { ok: false, failure_reason: `commit create failed: ${commit.error}` }
    await updateCheckpoint(admin, req.id, 'commit_created', { commit_sha: commit.sha })
    commitShaForPr = commit.sha

    // 12. ref (branch create)
    const ref = await createRef(p.owner, p.repo, p.branch_name, commit.sha)
    if (!ref.ok) return { ok: false, failure_reason: `branch create failed: ${ref.error} (status ${ref.status})` }
    await updateCheckpoint(admin, req.id, 'branch_created', { branch_created: true })
  }

  // STEP 13: PR create (draft=true 強制)。 body 末尾に marker を必ず埋め込む。
  if (!commitShaForPr) return { ok: false, failure_reason: 'commit sha missing for PR create (invariant)' }
  const marker = buildMarker(req.id)
  const bodyWithMarker = `${p.pr_body}\n\n${marker}`
  const pr = await createDraftPr(p.owner, p.repo, p.pr_title, bodyWithMarker, p.branch_name, 'main')
  if (!pr.ok) {
    // PR create failed: recovery scan で 1 度だけ確認 (Round 2 と同じ思想)
    const existing = await findExistingPrForMarker(p.owner, p.repo, p.branch_name, req.id)
    if (existing) {
      await updateCheckpoint(admin, req.id, 'pr_adopt_after_error', { pr_number: existing.number, pr_url: existing.html_url, duplicate_found: true })
      return { ok: true, external_id: String(existing.number), external_url: existing.html_url, duplicate_found: true }
    }
    return { ok: false, failure_reason: `pr create failed: ${pr.error}. No matching PR found in recent 50. Manual retry required (do not auto-repost).` }
  }
  await updateCheckpoint(admin, req.id, 'pr_created', { pr_number: pr.number, pr_url: pr.html_url })

  return { ok: true, external_id: String(pr.number), external_url: pr.html_url }
}
