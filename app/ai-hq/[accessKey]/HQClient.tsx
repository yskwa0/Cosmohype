'use client'

// AI HQ 秘密 URL 版 Client Component。
//
// - Supabase browser client を使わず、全ての DB アクセスを server API 経由に絞る。
// - Realtime は `/api/ai-hq/events?thread_id=...` の SSE proxy 経由 (server が
//   service_role で Postgres Changes を subscribe → text/event-stream で forward)。
// - CEO input → POST /api/ai-hq/send-message (cookie で認証)。
// - 一切の secret を client bundle に置かない。
//
// レイアウト方針:
//   - Desktop (md+): 従来通り「左 AI TEAM 縦カラム + 右チャット」の 2 カラム。
//   - Mobile (< md): 1 カラム縦積み。 AI TEAM は折りたたみボタン開閉、初期は閉じてチャット
//     領域を最優先で表示。 message list が残り高さを使い、input は section 底に定位。
//     入力欄・送信ボタンはタップ target 44px 以上、iOS zoom 回避のため font-size 16px。
//     safe-area-inset-bottom を padding に注入して home indicator と被らないようにする。

import { useEffect, useMemo, useRef, useState } from 'react'

type Channel =
  | 'general'
  | 'product'
  | 'engineering'
  | 'growth'
  | 'marketing'
  | 'research'
  | 'business'

type AgentId = 'jurin' | 'chisa' | 'hinata' | 'harvey' | 'juria' | 'maya' | 'cocona'

interface ThreadRow {
  id: string
  title: string
  channel: Channel
  status: string
  updated_at: string
}

interface MessageRow {
  id: string
  thread_id: string
  sender_type: 'human' | 'agent' | 'system'
  sender_agent: AgentId | null
  content: string
  message_type: string
  metadata: Record<string, unknown>
  created_at: string
}

const AGENTS: { id: AgentId; name: string; role: string; color: string }[] = [
  { id: 'jurin', name: 'ジュリン', role: 'Chief of Staff', color: 'bg-violet-500' },
  { id: 'chisa', name: 'チサ', role: 'Product / UX', color: 'bg-pink-500' },
  { id: 'hinata', name: 'ヒナタ', role: 'Engineering', color: 'bg-sky-500' },
  { id: 'harvey', name: 'ハーヴィー', role: 'Growth', color: 'bg-emerald-500' },
  { id: 'juria', name: 'ジュリア', role: 'Marketing / SNS', color: 'bg-rose-400' },
  { id: 'maya', name: 'マヤ', role: 'Research / Trend', color: 'bg-amber-500' },
  { id: 'cocona', name: 'ココナ', role: 'Finance / Strategy', color: 'bg-slate-500' },
]

const CHANNELS: Channel[] = [
  'general',
  'product',
  'engineering',
  'growth',
  'marketing',
  'research',
  'business',
]

// Phase 2C: deliverable pretty-render labels (server-side schemas.ts と揃える)
// Phase 3A.2: code_patch を追加
type DeliverableType =
  | 'social_content_draft'
  | 'growth_experiment'
  | 'ux_proposal'
  | 'engineering_plan'
  | 'research_brief'
  | 'business_case'
  | 'executive_brief'
  | 'code_patch'

const DELIVERABLE_UI: Record<DeliverableType, { fields: string[]; labels: Record<string, string>; short: string }> = {
  social_content_draft: {
    short: 'Social Content Draft',
    fields: ['concept', 'hook', 'body', 'caption', 'target_audience', 'objective', 'suggested_kpi', 'brand_notes'],
    labels: { concept: 'CONCEPT', hook: 'HOOK', body: 'STRUCTURE', caption: 'CAPTION', target_audience: 'TARGET', objective: 'OBJECTIVE', suggested_kpi: 'SUGGESTED KPI', brand_notes: 'BRAND NOTES' },
  },
  growth_experiment: {
    short: 'Growth Experiment',
    fields: ['hypothesis', 'target_segment', 'experiment', 'success_metric', 'duration', 'stop_condition', 'expected_learning'],
    labels: { hypothesis: 'HYPOTHESIS', target_segment: 'TARGET', experiment: 'EXPERIMENT', success_metric: 'SUCCESS METRIC', duration: 'DURATION', stop_condition: 'STOP CONDITION', expected_learning: 'EXPECTED LEARNING' },
  },
  ux_proposal: {
    short: 'UX Proposal',
    fields: ['problem', 'evidence', 'proposed_change', 'user_flow', 'edge_cases', 'acceptance_criteria'],
    labels: { problem: 'PROBLEM', evidence: 'EVIDENCE', proposed_change: 'PROPOSED CHANGE', user_flow: 'USER FLOW', edge_cases: 'EDGE CASES', acceptance_criteria: 'ACCEPTANCE CRITERIA' },
  },
  engineering_plan: {
    short: 'Engineering Plan',
    fields: ['problem', 'suspected_cause', 'affected_areas', 'proposed_changes', 'risks', 'test_plan', 'rollback_plan'],
    labels: { problem: 'PROBLEM', suspected_cause: 'SUSPECTED CAUSE', affected_areas: 'AFFECTED AREAS', proposed_changes: 'PROPOSED CHANGES', risks: 'RISKS', test_plan: 'TEST PLAN', rollback_plan: 'ROLLBACK PLAN' },
  },
  research_brief: {
    short: 'Research Brief',
    fields: ['signal', 'evidence', 'why_now', 'relevance_to_cosmohype', 'confidence', 'recommended_action'],
    labels: { signal: 'SIGNAL', evidence: 'EVIDENCE', why_now: 'WHY NOW', relevance_to_cosmohype: 'COSMOHYPE RELEVANCE', confidence: 'CONFIDENCE', recommended_action: 'RECOMMENDED ACTION' },
  },
  business_case: {
    short: 'Business Case',
    fields: ['opportunity', 'assumptions', 'estimated_cost', 'expected_value', 'roi_logic', 'risks', 'recommendation'],
    labels: { opportunity: 'OPPORTUNITY', assumptions: 'ASSUMPTIONS', estimated_cost: 'ESTIMATED COST', expected_value: 'EXPECTED VALUE', roi_logic: 'ROI', risks: 'RISKS', recommendation: 'RECOMMENDATION' },
  },
  executive_brief: {
    short: 'Executive Brief',
    fields: ['situation', 'findings', 'options', 'recommendation', 'priority', 'owner', 'next_action'],
    labels: { situation: 'SITUATION', findings: 'FINDINGS', options: 'OPTIONS', recommendation: 'RECOMMENDATION', priority: 'PRIORITY', owner: 'OWNER', next_action: 'NEXT ACTION' },
  },
  code_patch: {
    // Phase 3A.2: code_patch は通常 field 単純表示ではなく、専用 diff viewer を使うため
    // このリストは fallback (raw content) 用。 実 UI は下部の render 分岐で切り替える。
    short: 'コード変更案',
    fields: ['summary', 'rationale', 'risk_level'],
    labels: { summary: '概要', rationale: '意図', risk_level: 'リスク' },
  },
}

interface DeliverableRow {
  id: string
  task_id: string | null
  thread_id: string | null
  agent_id: AgentId
  deliverable_type: DeliverableType
  title: string
  summary: string
  content?: Record<string, unknown>
  status: 'draft' | 'submitted' | 'approved' | 'revision_requested' | 'rejected' | 'superseded'
  version: number
  submitted_at: string | null
  reviewed_at: string | null
  created_at: string
  review_notes?: string | null
}

// Phase 3A.1: リスクレベル / ステータスの日本語表示ラベル (DB enum は英語のまま維持)
const RISK_LABEL_JA: Record<'low' | 'medium' | 'high' | 'critical', string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '緊急',
}
const EXEC_STATUS_LABEL_JA: Record<
  'draft' | 'waiting_for_approval' | 'approved' | 'executing' | 'succeeded' | 'failed' | 'cancelled' | 'expired',
  string
> = {
  draft: '下書き',
  waiting_for_approval: '承認待ち',
  approved: '承認済み',
  executing: '実行中',
  succeeded: '完了',
  failed: '失敗',
  cancelled: 'キャンセル',
  expired: '期限切れ',
}
const DELIVERABLE_STATUS_LABEL_JA: Record<
  'draft' | 'submitted' | 'approved' | 'revision_requested' | 'rejected' | 'superseded',
  string
> = {
  draft: '下書き',
  submitted: '承認待ち',
  approved: '承認済み',
  revision_requested: '修正依頼中',
  rejected: '却下',
  superseded: '差替え済み',
}

function senderLabel(m: MessageRow): { name: string; color: string } {
  if (m.sender_type === 'human') return { name: 'CEO', color: 'bg-white text-black' }
  if (m.sender_type === 'system')
    return { name: 'SYSTEM', color: 'bg-neutral-700 text-neutral-100' }
  const a = AGENTS.find((x) => x.id === m.sender_agent)
  return { name: a?.name ?? m.sender_agent ?? 'agent', color: a?.color ?? 'bg-neutral-500' }
}

export default function HQClient({ initialThreads }: { initialThreads: ThreadRow[] }) {
  const [channel, setChannel] = useState<Channel>('general')
  const [threads, setThreads] = useState<ThreadRow[]>(initialThreads)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Mobile: AI TEAM panel は初期閉じる。 Desktop (md+) では CSS で常時展開されるので
  // この state は mobile 開閉のみを制御する。
  const [teamOpen, setTeamOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [hqEvents, setHqEvents] = useState<
    Array<{
      id: string
      event_type: string
      severity: string
      title: string
      status: string
      handled_by_thread_id: string | null
      created_at: string
    }>
  >([])
  const [agentStatuses, setAgentStatuses] = useState<
    Array<{ agent_id: string; status: string; current_thread_id: string | null; updated_at: string }>
  >([])
  const [watchHealth, setWatchHealth] = useState<{
    research_sources: Array<{ name: string; enabled: boolean; last_checked_at: string | null; last_success_at: string | null; consecutive_failures: number; last_error: string | null }>
    github_state: Array<{ key: string; value: Record<string, unknown>; updated_at: string }>
  }>({ research_sources: [], github_state: [] })
  // Phase 3A.1 + 3A.2: EXECUTION INBOX state
  const [executions, setExecutions] = useState<Array<{
    id: string
    deliverable_id: string | null
    task_id: string | null
    agent_id: AgentId
    execution_type: 'github_issue_create' | 'github_draft_pr_create'
    title: string
    summary: string
    risk_level: 'low' | 'medium' | 'high' | 'critical'
    status: 'draft' | 'waiting_for_approval' | 'approved' | 'executing' | 'succeeded' | 'failed' | 'cancelled' | 'expired'
    expires_at: string
    result?: { external_id?: string; external_url?: string; executed_at?: string; duplicate_found?: boolean } | null
    failure_reason?: string | null
    approved_by_ceo_at?: string | null
    executed_at?: string | null
    created_at: string
  }>>([])
  const [inboxExecOpen, setInboxExecOpen] = useState(true)
  const [selectedExec, setSelectedExec] = useState<typeof executions[0] | null>(null)
  const [execDetailPayload, setExecDetailPayload] = useState<Record<string, unknown> | null>(null)
  const [execAction, setExecAction] = useState<'idle' | 'executing' | 'rejecting'>('idle')
  const [execError, setExecError] = useState<string | null>(null)
  // Phase 2C: CEO INBOX state
  const [deliverables, setDeliverables] = useState<DeliverableRow[]>([])
  const [selectedDeliverable, setSelectedDeliverable] = useState<DeliverableRow | null>(null)
  const [detailContent, setDetailContent] = useState<Record<string, unknown> | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [reviewAction, setReviewAction] = useState<'idle' | 'approving' | 'revising' | 'rejecting'>('idle')
  const [reviewFeedback, setReviewFeedback] = useState('')
  const [reviewMode, setReviewMode] = useState<null | 'revise' | 'reject'>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [inboxOpen, setInboxOpen] = useState(true)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const esRef = useRef<EventSource | null>(null)

  const channelThreads = useMemo(
    () => threads.filter((t) => t.channel === channel),
    [threads, channel],
  )

  // active thread 切替時: 既存 messages を fetch + SSE reconnect
  useEffect(() => {
    if (!activeThreadId) {
      setMessages([])
      esRef.current?.close()
      esRef.current = null
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(
          `/api/ai-hq/messages?thread_id=${encodeURIComponent(activeThreadId)}`,
          { credentials: 'same-origin' },
        )
        if (!res.ok) throw new Error(`messages HTTP ${res.status}`)
        const j = (await res.json()) as { messages: MessageRow[] }
        if (cancelled) return
        setMessages(j.messages ?? [])
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
        })
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      }
    })()

    // SSE subscribe (server が service_role で Realtime に接続、INSERT を forward)
    esRef.current?.close()
    const es = new EventSource(
      `/api/ai-hq/events?thread_id=${encodeURIComponent(activeThreadId)}`,
      { withCredentials: true },
    )
    es.addEventListener('message_insert', (ev) => {
      try {
        const row = JSON.parse((ev as MessageEvent).data) as MessageRow
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]))
        setThreads((prev) => {
          const idx = prev.findIndex((t) => t.id === row.thread_id)
          if (idx < 0) return prev
          const clone = [...prev]
          clone[idx] = { ...clone[idx], updated_at: row.created_at }
          return clone.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
        })
      } catch {
        // ignore malformed frame
      }
    })
    es.onerror = () => {
      // EventSource は自動再接続する。60s Vercel timeout 想定。
    }
    esRef.current = es

    return () => {
      cancelled = true
      es.close()
      if (esRef.current === es) esRef.current = null
    }
  }, [activeThreadId])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  // AUTO ACTIVITY: 初回だけ REST で prefill (SSR 直後の空表示回避)、以降は SSE proxy
  //   `/api/ai-hq/hq-stream` からの Realtime 更新のみ。 polling 廃止。
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [evR, acR, whR, dlR, exR] = await Promise.all([
          fetch('/api/ai-hq/hq-events', { credentials: 'same-origin' }),
          fetch('/api/ai-hq/activity', { credentials: 'same-origin' }),
          fetch('/api/ai-hq/watch/health', { credentials: 'same-origin' }),
          fetch('/api/ai-hq/deliverables', { credentials: 'same-origin' }),
          fetch('/api/ai-hq/executions', { credentials: 'same-origin' }),
        ])
        if (!alive) return
        if (evR.ok) {
          const j = await evR.json()
          setHqEvents(j.events ?? [])
        }
        if (acR.ok) {
          const j = await acR.json()
          setAgentStatuses(j.activity ?? [])
        }
        if (whR.ok) {
          const j = await whR.json()
          setWatchHealth({ research_sources: j.research_sources ?? [], github_state: j.github_state ?? [] })
        }
        if (dlR.ok) {
          const j = await dlR.json()
          setDeliverables(j.deliverables ?? [])
        }
        if (exR.ok) {
          const j = await exR.json()
          setExecutions(j.executions ?? [])
        }
      } catch {
        /* best-effort */
      }
    })()

    const es = new EventSource('/api/ai-hq/hq-stream', { withCredentials: true })
    es.addEventListener('event_insert', (ev) => {
      try {
        const row = JSON.parse((ev as MessageEvent).data)
        setHqEvents((prev) => (prev.some((x) => x.id === row.id) ? prev : [row, ...prev]))
      } catch {
        /* ignore */
      }
    })
    es.addEventListener('event_update', (ev) => {
      try {
        const row = JSON.parse((ev as MessageEvent).data)
        setHqEvents((prev) => prev.map((x) => (x.id === row.id ? { ...x, ...row } : x)))
      } catch {
        /* ignore */
      }
    })
    es.addEventListener('activity_update', (ev) => {
      try {
        const row = JSON.parse((ev as MessageEvent).data)
        setAgentStatuses((prev) => prev.map((x) => (x.agent_id === row.agent_id ? { ...x, ...row } : x)))
      } catch {
        /* ignore */
      }
    })
    // Phase 2C: deliverable Realtime → CEO INBOX を live 更新
    es.addEventListener('deliverable_insert', (ev) => {
      try {
        const row = JSON.parse((ev as MessageEvent).data) as DeliverableRow
        setDeliverables((prev) => (prev.some((d) => d.id === row.id) ? prev : [row, ...prev]))
      } catch { /* ignore */ }
    })
    es.addEventListener('deliverable_update', (ev) => {
      try {
        const row = JSON.parse((ev as MessageEvent).data) as DeliverableRow
        setDeliverables((prev) => prev.map((d) => (d.id === row.id ? { ...d, ...row } : d)))
      } catch { /* ignore */ }
    })
    // Phase 3A.1: execution Realtime
    es.addEventListener('execution_insert', (ev) => {
      try {
        const row = JSON.parse((ev as MessageEvent).data)
        setExecutions((prev) => (prev.some((e) => e.id === row.id) ? prev : [row, ...prev]))
      } catch { /* ignore */ }
    })
    es.addEventListener('execution_update', (ev) => {
      try {
        const row = JSON.parse((ev as MessageEvent).data)
        setExecutions((prev) => prev.map((e) => (e.id === row.id ? { ...e, ...row } : e)))
      } catch { /* ignore */ }
    })
    es.onerror = () => {
      // EventSource は自動再接続する。
    }
    return () => {
      alive = false
      es.close()
    }
  }, [])

  // Phase 3A.1: EXECUTION INBOX helpers
  const pendingExecutions = useMemo(
    () => executions.filter((e) => e.status === 'waiting_for_approval').sort((a, b) => a.created_at < b.created_at ? 1 : -1),
    [executions],
  )
  const recentExecutionResults = useMemo(
    () => executions.filter((e) => e.status === 'succeeded' || e.status === 'failed' || e.status === 'cancelled' || e.status === 'expired').sort((a, b) => a.created_at < b.created_at ? 1 : -1).slice(0, 5),
    [executions],
  )

  async function openExecution(e: typeof executions[0]) {
    setSelectedExec(e)
    setExecDetailPayload(null)
    setExecError(null)
    try {
      const res = await fetch(`/api/ai-hq/executions/${e.id}`, { credentials: 'same-origin' })
      if (res.ok) {
        const j = await res.json()
        setExecDetailPayload((j.execution?.payload as Record<string, unknown>) ?? null)
      }
    } catch { /* best-effort */ }
  }
  function closeExecution() {
    if (execAction !== 'idle') return
    setSelectedExec(null)
    setExecDetailPayload(null)
    setExecError(null)
  }
  async function doExecuteApprove() {
    if (!selectedExec) return
    const confirmMsg = selectedExec.execution_type === 'github_draft_pr_create'
      ? 'ai-hq/<branch> を作成し、承認済みファイルを1commit、Draft PR を1件作成します。\nmain への直接 push・merge・deploy は行いません。\n実行しますか?'
      : 'GitHub Issue を 1件作成します。\nコード変更・merge・deploy は行いません。\n実行しますか?'
    if (!confirm(confirmMsg)) return
    setExecError(null)
    setExecAction('executing')
    try {
      const res = await fetch(`/api/ai-hq/executions/${selectedExec.id}/approve-execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({}),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 410) setExecError('この申請は期限切れです。再作成してください。')
        else if (res.status === 409) setExecError(`実行できません: ${j?.error ?? '既に処理済み'}`)
        else if (res.status === 403) setExecError(`拒否されました: ${j?.error ?? 'forbidden'}`)
        else setExecError(j?.failure_reason ?? j?.error ?? `HTTP ${res.status}`)
        return
      }
      // Success — leave modal open briefly to show result then close
      setTimeout(() => closeExecution(), 500)
    } catch (err) {
      setExecError((err as Error).message)
    } finally {
      setExecAction('idle')
    }
  }
  async function doExecuteReject() {
    if (!selectedExec) return
    if (!confirm('この実行申請を却下しますか?\n実行はされません。')) return
    setExecError(null)
    setExecAction('rejecting')
    try {
      const res = await fetch(`/api/ai-hq/executions/${selectedExec.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({}),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setExecError(j?.error ?? `HTTP ${res.status}`); return }
      setTimeout(() => closeExecution(), 300)
    } catch (err) {
      setExecError((err as Error).message)
    } finally {
      setExecAction('idle')
    }
  }

  // Phase 2C: CEO INBOX の絞り込み。
  const pendingDeliverables = useMemo(
    () => deliverables.filter((d) => d.status === 'submitted').sort((a, b) => (a.submitted_at ?? '') < (b.submitted_at ?? '') ? 1 : -1),
    [deliverables],
  )
  const recentlyApproved = useMemo(
    () => deliverables.filter((d) => d.status === 'approved').sort((a, b) => (a.reviewed_at ?? '') < (b.reviewed_at ?? '') ? 1 : -1).slice(0, 5),
    [deliverables],
  )

  async function openDeliverable(d: DeliverableRow) {
    setSelectedDeliverable(d)
    setDetailContent(null)
    setReviewError(null)
    setReviewMode(null)
    setReviewFeedback('')
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/ai-hq/deliverables/${d.id}`, { credentials: 'same-origin' })
      if (res.ok) {
        const j = await res.json()
        setDetailContent((j.deliverable?.content ?? null) as Record<string, unknown> | null)
        // task metadata prefetch for revision cap display
        if (j.deliverable?.task_id) {
          try {
            const tRes = await fetch(`/api/ai-hq/threads`, { credentials: 'same-origin' })
            // task metadata は上位で握っていないため簡易 fetch (無ければ 0 扱い)
            void tRes
          } catch { /* ignore */ }
        }
      } else if (res.status === 404) {
        setReviewError('deliverable not found')
      }
    } catch (err) {
      setReviewError((err as Error).message)
    } finally {
      setDetailLoading(false)
    }
  }
  function closeDetail() {
    if (reviewAction !== 'idle') return // block during in-flight action
    setSelectedDeliverable(null)
    setDetailContent(null)
    setReviewMode(null)
    setReviewFeedback('')
    setReviewError(null)
  }

  async function doReview(id: string, action: 'approve' | 'revise' | 'reject', feedback?: string) {
    setReviewError(null)
    setReviewAction(action === 'approve' ? 'approving' : action === 'revise' ? 'revising' : 'rejecting')
    try {
      const res = await fetch(`/api/ai-hq/deliverables/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action, feedback }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 409 && j?.reason === 'revision_limit_reached') {
          setReviewError('修正依頼の上限に達しました (最大3回)')
        } else if (res.status === 409) {
          setReviewError(`すでに処理済みです (${j?.reason ?? 'processed'})`)
        } else {
          setReviewError(j?.reason ?? `HTTP ${res.status}`)
        }
        return
      }
      // Success — close detail after short delay so Realtime UPDATE is reflected first
      if (action === 'approve' || action === 'reject') {
        setTimeout(() => closeDetail(), 200)
      } else if (action === 'revise') {
        setTimeout(() => {
          // Fetch updated deliverable for v_next
          if (j?.new_deliverable_id) {
            fetch(`/api/ai-hq/deliverables/${j.new_deliverable_id}`, { credentials: 'same-origin' })
              .then((r) => r.ok ? r.json() : null)
              .then((jj) => {
                if (jj?.deliverable) {
                  setSelectedDeliverable(jj.deliverable as DeliverableRow)
                  setDetailContent(jj.deliverable.content ?? null)
                  setReviewMode(null)
                  setReviewFeedback('')
                }
              })
              .catch(() => {})
          }
        }, 300)
      }
    } catch (err) {
      setReviewError((err as Error).message)
    } finally {
      setReviewAction('idle')
    }
  }

  async function refreshThreads() {
    try {
      const res = await fetch('/api/ai-hq/threads', { credentials: 'same-origin' })
      if (!res.ok) return
      const j = (await res.json()) as { threads: ThreadRow[] }
      setThreads(j.threads ?? [])
    } catch {
      /* best-effort */
    }
  }

  async function send() {
    const msg = input.trim()
    if (!msg || sending) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/ai-hq/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          thread_id: activeThreadId ?? undefined,
          channel,
          ceo_message: msg,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`)
      if (!activeThreadId && j.thread_id) {
        setActiveThreadId(j.thread_id)
        await refreshThreads()
      }
      setInput('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Phase 2C: CEO INBOX — 承認待ちの仕事を最優先で表示 (mobile 上部固定) */}
      <section className="mb-3">
        <button
          type="button"
          onClick={() => setInboxOpen((v) => !v)}
          aria-expanded={inboxOpen}
          className="w-full flex items-center justify-between px-3 py-2 border border-neutral-700 rounded-lg bg-neutral-900 hover:bg-neutral-850"
        >
          <span className="flex items-center gap-2">
            <span className="text-xs tracking-wider text-neutral-300 font-semibold">CEO受信箱</span>
            {pendingDeliverables.length > 0 && (
              <span className="text-xs bg-white text-neutral-900 rounded-full px-2 py-0.5 font-bold">承認待ち {pendingDeliverables.length} 件</span>
            )}
            {pendingDeliverables.length === 0 && (
              <span className="text-xs text-neutral-500">承認待ちなし</span>
            )}
          </span>
          <svg aria-hidden viewBox="0 0 24 24" className={`w-4 h-4 text-neutral-400 transition-transform ${inboxOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {inboxOpen && (
          <div className="mt-2 space-y-2">
            {pendingDeliverables.length === 0 && (
              <div className="text-xs text-neutral-500 px-2 py-3 border border-neutral-800 rounded-lg bg-neutral-900">
                承認待ちの成果物はありません。 社員から仕事が上がってくるとここに表示されます。
              </div>
            )}
            {pendingDeliverables.map((d) => {
              const ag = AGENTS.find((a) => a.id === d.agent_id)
              const typeShort = DELIVERABLE_UI[d.deliverable_type]?.short ?? d.deliverable_type
              return (
                <button
                  key={d.id}
                  onClick={() => openDeliverable(d)}
                  className="w-full text-left p-3 border border-neutral-700 rounded-lg bg-neutral-900 hover:bg-neutral-850"
                >
                  <div className="flex items-start gap-2">
                    <span className={`shrink-0 w-8 h-8 rounded-full ${ag?.color ?? 'bg-neutral-500'} text-xs font-bold flex items-center justify-center`}>
                      {(ag?.name ?? d.agent_id).slice(0, 1)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-neutral-100 font-semibold">{ag?.name ?? d.agent_id}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">{typeShort}</span>
                        <span className="text-[10px] text-neutral-500">v{d.version}</span>
                        {d.review_notes && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300">JURIN確認済</span>
                        )}
                      </div>
                      <div className="text-sm text-neutral-200 mt-0.5 break-words">{d.title}</div>
                      <div className="text-xs text-neutral-500 mt-1 line-clamp-2">{d.summary}</div>
                      <div className="text-[10px] text-neutral-600 mt-1">
                        {d.submitted_at ? new Date(d.submitted_at).toLocaleString('ja-JP') : '—'}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-neutral-400 self-center">確認する →</span>
                  </div>
                </button>
              )
            })}
            {recentlyApproved.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] tracking-widest text-neutral-500 mb-1 px-1">最近承認したもの</div>
                <div className="space-y-1">
                  {recentlyApproved.map((d) => {
                    const ag = AGENTS.find((a) => a.id === d.agent_id)
                    const typeShort = DELIVERABLE_UI[d.deliverable_type]?.short ?? d.deliverable_type
                    return (
                      <button
                        key={d.id}
                        onClick={() => openDeliverable(d)}
                        className="w-full text-left px-2 py-1.5 border border-neutral-800 rounded bg-neutral-950 hover:bg-neutral-900 text-xs"
                      >
                        <span className={`inline-block w-4 h-4 rounded-full ${ag?.color ?? 'bg-neutral-500'} align-middle mr-2`} />
                        <span className="text-neutral-300">{ag?.name ?? d.agent_id}</span>
                        <span className="text-neutral-500 mx-2">/</span>
                        <span className="text-neutral-400">{typeShort}</span>
                        <span className="text-neutral-500 mx-2">/</span>
                        <span className="text-neutral-500">{d.title.slice(0, 60)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Phase 3A.1: EXECUTION INBOX — CEO INBOX の下、AUTO ACTIVITY の上 */}
      <section className="mb-3">
        <button
          type="button"
          onClick={() => setInboxExecOpen((v) => !v)}
          aria-expanded={inboxExecOpen}
          className="w-full flex items-center justify-between px-3 py-2 border border-amber-700/40 rounded-lg bg-amber-950/20 hover:bg-amber-900/30"
        >
          <span className="flex items-center gap-2">
            <span className="text-xs tracking-wider text-amber-300 font-semibold">実行承認</span>
            {pendingExecutions.length > 0 ? (
              <span className="text-xs bg-amber-400 text-neutral-900 rounded-full px-2 py-0.5 font-bold">承認待ち {pendingExecutions.length} 件</span>
            ) : (
              <span className="text-xs text-neutral-500">承認待ちなし</span>
            )}
          </span>
          <svg aria-hidden viewBox="0 0 24 24" className={`w-4 h-4 text-amber-400 transition-transform ${inboxExecOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {inboxExecOpen && (
          <div className="mt-2 space-y-2">
            {pendingExecutions.length === 0 && (
              <div className="text-xs text-neutral-500 px-2 py-3 border border-neutral-800 rounded-lg bg-neutral-900">
                実行承認待ちのアクションはありません。 engineering_plan の下書きを承認すると、 GitHub Issue 作成の提案がここに出ます。
              </div>
            )}
            {pendingExecutions.map((e) => {
              const ag = AGENTS.find((a) => a.id === e.agent_id)
              return (
                <button
                  key={e.id}
                  onClick={() => openExecution(e)}
                  className="w-full text-left p-3 border border-amber-700/40 rounded-lg bg-neutral-900 hover:bg-neutral-850"
                >
                  <div className="flex items-start gap-2">
                    <span className={`shrink-0 w-8 h-8 rounded-full ${ag?.color ?? 'bg-neutral-500'} text-xs font-bold flex items-center justify-center`}>
                      {(ag?.name ?? e.agent_id).slice(0, 1)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-neutral-100 font-semibold">{ag?.name ?? e.agent_id}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300">
                          {e.execution_type === 'github_issue_create' ? 'GitHub Issue 作成' : e.execution_type === 'github_draft_pr_create' ? 'Draft PR 作成' : e.execution_type}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${e.risk_level === 'low' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-red-900/40 text-red-300'}`}>
                          リスク: {RISK_LABEL_JA[e.risk_level]}
                        </span>
                      </div>
                      <div className="text-sm text-neutral-200 mt-0.5 break-words">{e.title}</div>
                      <div className="text-xs text-neutral-500 mt-1 line-clamp-2">{e.summary}</div>
                      <div className="text-[10px] text-neutral-600 mt-1">
                        期限: {new Date(e.expires_at).toLocaleString('ja-JP')}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-amber-400 self-center">確認する →</span>
                  </div>
                </button>
              )
            })}
            {recentExecutionResults.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] tracking-widest text-neutral-500 mb-1 px-1">最近の実行</div>
                <div className="space-y-1">
                  {recentExecutionResults.map((e) => {
                    const ag = AGENTS.find((a) => a.id === e.agent_id)
                    const icon = e.status === 'succeeded' ? '✓' : e.status === 'failed' ? '✗' : e.status === 'expired' ? '⌛' : '✕'
                    const color = e.status === 'succeeded' ? 'text-emerald-400' : e.status === 'failed' ? 'text-red-400' : 'text-neutral-500'
                    return (
                      <button
                        key={e.id}
                        onClick={() => openExecution(e)}
                        className="w-full text-left px-2 py-1.5 border border-neutral-800 rounded bg-neutral-950 hover:bg-neutral-900 text-xs"
                      >
                        <span className={`${color} mr-2`}>{icon}</span>
                        <span className="text-neutral-300">{ag?.name ?? e.agent_id}</span>
                        <span className="text-neutral-500 mx-2">/</span>
                        <span className="text-neutral-400">{EXEC_STATUS_LABEL_JA[e.status]}</span>
                        <span className="text-neutral-500 mx-2">/</span>
                        <span className="text-neutral-500">{e.title.slice(0, 60)}</span>
                        {e.result?.external_url && (
                          <a href={e.result.external_url} target="_blank" rel="noreferrer" className="ml-2 text-amber-400 underline" onClick={(ev) => ev.stopPropagation()}>#{e.result.external_id}</a>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Execution detail modal */}
      {selectedExec && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-0 md:p-4" role="dialog" aria-modal="true">
          <div className="w-full md:max-w-2xl md:rounded-lg bg-neutral-950 border border-amber-700/50 flex flex-col max-h-[100dvh] md:max-h-[90vh]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex items-start justify-between p-4 border-b border-neutral-800 sticky top-0 bg-neutral-950">
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300">
                    {selectedExec.execution_type === 'github_issue_create' ? 'GitHub Issue 作成' : selectedExec.execution_type}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-300">リスク: {RISK_LABEL_JA[selectedExec.risk_level]}</span>
                  <span className="text-[10px] text-neutral-500">
                    提案者: {AGENTS.find((a) => a.id === selectedExec.agent_id)?.name ?? selectedExec.agent_id}
                  </span>
                </div>
                <div className="text-base font-semibold text-neutral-100 mt-1 break-words">{selectedExec.title}</div>
                <div className="text-[10px] text-neutral-500 mt-1">期限: {new Date(selectedExec.expires_at).toLocaleString('ja-JP')}</div>
              </div>
              <button onClick={closeExecution} disabled={execAction !== 'idle'} aria-label="Close" className="shrink-0 h-10 w-10 flex items-center justify-center text-neutral-400 hover:text-neutral-200 disabled:opacity-40">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {execDetailPayload && selectedExec.execution_type === 'github_issue_create' && (
                <>
                  <div className="p-3 rounded border border-emerald-900 bg-emerald-950/20">
                    <div className="text-[10px] tracking-widest text-emerald-400 mb-1">実行されること:</div>
                    <div className="text-sm text-neutral-100">
                      <span className="font-mono text-emerald-300">{String(execDetailPayload.owner ?? '?')}/{String(execDetailPayload.repo ?? '?')}</span>
                      {' '}に <span className="font-semibold">GitHub Issue を 1件</span>作成します
                    </div>
                  </div>
                  <div className="p-3 rounded border border-red-900 bg-red-950/20">
                    <div className="text-[10px] tracking-widest text-red-400 mb-1">実行されないこと:</div>
                    <ul className="text-sm text-neutral-300 list-disc pl-5 space-y-0.5">
                      <li>コード変更はしません</li>
                      <li>push しません</li>
                      <li>merge しません</li>
                      <li>deploy しません</li>
                    </ul>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-widest text-neutral-500 mb-1">タイトル</div>
                    <div className="text-sm text-neutral-100 break-words">{String(execDetailPayload.title ?? '')}</div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-widest text-neutral-500 mb-1">本文プレビュー</div>
                    <pre className="text-xs text-neutral-200 whitespace-pre-wrap break-words leading-relaxed bg-neutral-900 p-2 rounded border border-neutral-800 max-h-72 overflow-y-auto">{String(execDetailPayload.body ?? '')}</pre>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-widest text-neutral-500 mb-1">ラベル</div>
                    <div className="flex gap-1 flex-wrap">
                      {(execDetailPayload.labels as string[] ?? []).map((l) => (
                        <span key={l} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">{l}</span>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {execDetailPayload && selectedExec.execution_type === 'github_draft_pr_create' && (
                <>
                  <div className="p-3 rounded border border-emerald-900 bg-emerald-950/20">
                    <div className="text-[10px] tracking-widest text-emerald-400 mb-1">実行されること:</div>
                    <div className="text-sm text-neutral-100 space-y-1">
                      <div>
                        <span className="font-mono text-emerald-300">{String(execDetailPayload.owner ?? '?')}/{String(execDetailPayload.repo ?? '?')}</span> に:
                      </div>
                      <ul className="list-disc pl-5 space-y-0.5">
                        <li><span className="font-mono text-emerald-300">{String(execDetailPayload.branch_name ?? '')}</span> ブランチを作成</li>
                        <li>承認済み <span className="font-semibold">{(execDetailPayload.files as unknown[] ?? []).length} ファイル</span>を 1 commit</li>
                        <li>Draft PR を 1 件作成 (base = <span className="font-mono">main</span>)</li>
                      </ul>
                    </div>
                  </div>
                  <div className="p-3 rounded border border-red-900 bg-red-950/20">
                    <div className="text-[10px] tracking-widest text-red-400 mb-1">実行されないこと:</div>
                    <ul className="text-sm text-neutral-300 list-disc pl-5 space-y-0.5">
                      <li>main への直接 push はしません</li>
                      <li>merge しません</li>
                      <li>deploy しません</li>
                      <li>production DB は変更しません</li>
                      <li>workflow の実行・権限変更はしません</li>
                      <li>secret は変更しません</li>
                    </ul>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-widest text-neutral-500 mb-1">PR タイトル</div>
                    <div className="text-sm text-neutral-100 break-words">{String(execDetailPayload.pr_title ?? '')}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-neutral-500">
                    <div>base commit: <span className="font-mono text-neutral-300">{String(execDetailPayload.base_sha ?? '').slice(0, 12)}</span></div>
                    <div>+{Number(execDetailPayload.total_additions ?? 0)} / -{Number(execDetailPayload.total_deletions ?? 0)} 行</div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-widest text-neutral-500 mb-1">変更ファイル ({(execDetailPayload.files as unknown[] ?? []).length})</div>
                    <div className="space-y-3">
                      {((execDetailPayload.files as Array<Record<string, unknown>>) ?? []).map((f, i) => (
                        <div key={i} className="border border-neutral-800 rounded bg-neutral-900">
                          <div className="flex items-center justify-between px-2 py-1 border-b border-neutral-800 gap-2 flex-wrap">
                            <span className="text-xs font-mono text-neutral-200 truncate">{String(f.path ?? '')}</span>
                            <span className="text-[10px] text-neutral-500 shrink-0">
                              <span className="px-1 rounded bg-neutral-800 mr-1">{String(f.change_type ?? '')}</span>
                              <span className="text-emerald-400">+{Number(f.additions ?? 0)}</span>
                              {' '}
                              <span className="text-red-400">-{Number(f.deletions ?? 0)}</span>
                            </span>
                          </div>
                          <pre className="text-[10px] leading-snug whitespace-pre-wrap break-words p-2 max-h-64 overflow-y-auto font-mono">
                            {(String(f.diff ?? '').split('\n')).map((line, li) => {
                              const cls = line.startsWith('+') && !line.startsWith('+++') ? 'text-emerald-400' :
                                line.startsWith('-') && !line.startsWith('---') ? 'text-red-400' :
                                line.startsWith('@@') ? 'text-cyan-400' : 'text-neutral-400'
                              return <div key={li} className={cls}>{line || ' '}</div>
                            })}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] tracking-widest text-neutral-500 mb-1">PR 本文プレビュー</div>
                    <pre className="text-xs text-neutral-200 whitespace-pre-wrap break-words leading-relaxed bg-neutral-900 p-2 rounded border border-neutral-800 max-h-72 overflow-y-auto">{String(execDetailPayload.pr_body ?? '')}</pre>
                  </div>
                </>
              )}
              {selectedExec.status !== 'waiting_for_approval' && (
                <div className="p-2 rounded border border-neutral-800 bg-neutral-900">
                  <div className="text-[10px] text-neutral-500 mb-1">ステータス</div>
                  <div className="text-sm text-neutral-200">{EXEC_STATUS_LABEL_JA[selectedExec.status]}</div>
                  {selectedExec.result?.external_url && (
                    <a href={selectedExec.result.external_url} target="_blank" rel="noreferrer" className="text-xs text-amber-400 underline mt-1 inline-block">
                      Issue #{selectedExec.result.external_id} を開く →
                    </a>
                  )}
                  {selectedExec.failure_reason && (
                    <div className="text-xs text-red-400 mt-1 break-words">理由: {selectedExec.failure_reason}</div>
                  )}
                </div>
              )}
            </div>
            <div className="border-t border-neutral-800 p-3 space-y-2 sticky bottom-0 bg-neutral-950">
              {execError && <div className="text-xs text-red-400 px-1 break-words">{execError}</div>}
              {selectedExec.status === 'waiting_for_approval' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={doExecuteReject}
                    disabled={execAction !== 'idle'}
                    className="min-h-[44px] bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded disabled:bg-neutral-700"
                  >
                    {execAction === 'rejecting' ? '却下中…' : '却下'}
                  </button>
                  <button
                    onClick={doExecuteApprove}
                    disabled={execAction !== 'idle'}
                    className="min-h-[44px] bg-amber-500 hover:bg-amber-400 text-neutral-900 text-sm font-bold rounded disabled:bg-neutral-700 disabled:text-neutral-400"
                  >
                    {execAction === 'executing' ? '実行中…' : '承認して実行'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deliverable detail modal (mobile-friendly full-screen sheet on <md, centered on md+) */}
      {selectedDeliverable && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-0 md:p-4" role="dialog" aria-modal="true">
          <div className="w-full md:max-w-2xl md:rounded-lg bg-neutral-950 border border-neutral-700 flex flex-col max-h-[100dvh] md:max-h-[90vh]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex items-start justify-between p-4 border-b border-neutral-800 sticky top-0 bg-neutral-950">
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                    {DELIVERABLE_UI[selectedDeliverable.deliverable_type]?.short ?? selectedDeliverable.deliverable_type}
                  </span>
                  <span className="text-[10px] text-neutral-500">v{selectedDeliverable.version}</span>
                  <span className="text-[10px] text-neutral-500">
                    提案者: {AGENTS.find((a) => a.id === selectedDeliverable.agent_id)?.name ?? selectedDeliverable.agent_id}
                  </span>
                </div>
                <div className="text-base font-semibold text-neutral-100 mt-1 break-words">{selectedDeliverable.title}</div>
              </div>
              <button
                onClick={closeDetail}
                disabled={reviewAction !== 'idle'}
                aria-label="Close"
                className="shrink-0 h-10 w-10 flex items-center justify-center text-neutral-400 hover:text-neutral-200 disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {detailLoading && <div className="text-sm text-neutral-500">読込中…</div>}
              {!detailLoading && detailContent && selectedDeliverable.deliverable_type !== 'code_patch' && (
                <>
                  {DELIVERABLE_UI[selectedDeliverable.deliverable_type]?.fields.map((f) => (
                    <div key={f}>
                      <div className="text-[10px] tracking-widest text-neutral-500 mb-1">
                        {DELIVERABLE_UI[selectedDeliverable.deliverable_type].labels[f] ?? f}
                      </div>
                      <div className="text-sm text-neutral-100 whitespace-pre-wrap break-words leading-relaxed">
                        {String(detailContent[f] ?? '—')}
                      </div>
                    </div>
                  ))}
                </>
              )}
              {!detailLoading && detailContent && selectedDeliverable.deliverable_type === 'code_patch' && (
                <>
                  {/* Phase 3A.2: code_patch は専用 diff viewer */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-400">
                    <div>対象: <span className="text-neutral-200 font-mono">{String(detailContent.repository ?? '—')}</span></div>
                    <div>base: <span className="text-neutral-200 font-mono">{String(detailContent.base_branch ?? 'main')} @ {String(detailContent.base_sha ?? '').slice(0, 12)}</span></div>
                    <div>+{Number(detailContent.total_additions ?? 0)} / -{Number(detailContent.total_deletions ?? 0)} 行</div>
                    <div>変更ファイル: {(detailContent.files as unknown[] ?? []).length}</div>
                  </div>
                  {typeof detailContent.summary === 'string' && detailContent.summary && (
                    <div>
                      <div className="text-[10px] tracking-widest text-neutral-500 mb-1">概要</div>
                      <div className="text-sm text-neutral-100 whitespace-pre-wrap break-words">{detailContent.summary}</div>
                    </div>
                  )}
                  {/* Phase 3A.2: CEO 向け短文説明。 LLM の技術 rationale を長文表示する代わりに、
                      code_patch content.ceo_summary (何を / なぜ / 機能影響) を優先表示する。
                      ceo_summary が未設定なら本 section は非表示 (rationale は CEO UI では表示しない、
                      技術背景は diff + Validation 側で確認する)。 */}
                  {typeof detailContent.ceo_summary === 'string' && detailContent.ceo_summary && (
                    <div>
                      <div className="text-[10px] tracking-widest text-neutral-500 mb-1">変更理由</div>
                      <div className="text-sm text-neutral-100 whitespace-pre-wrap break-words">{detailContent.ceo_summary}</div>
                    </div>
                  )}
                  {(() => {
                    const v = detailContent.validation as Record<string, unknown> | undefined
                    if (!v) return null
                    return (
                      <div className="p-2 rounded border border-neutral-800 bg-neutral-900 text-[10px] text-neutral-400">
                        <div className="tracking-widest text-neutral-500 mb-1">Validation</div>
                        {Object.entries(v).map(([k, val]) => (
                          <div key={k}>{k}: <span className={val === true ? 'text-emerald-400' : val === false ? 'text-red-400' : 'text-neutral-300'}>{JSON.stringify(val)}</span></div>
                        ))}
                      </div>
                    )
                  })()}
                  <div>
                    <div className="text-[10px] tracking-widest text-neutral-500 mb-2">変更ファイル一覧</div>
                    <div className="text-[10px] text-neutral-500 mb-2 px-1">
                      Phase 3A.2 では既存ファイルの <span className="text-neutral-300 font-mono">modify</span> のみサポート。 新規ファイル作成 / 削除 / rename は対象外です。
                    </div>
                    <div className="space-y-3">
                      {((detailContent.files as Array<Record<string, unknown>>) ?? []).map((f, i) => (
                        <div key={i} className="border border-neutral-800 rounded bg-neutral-900">
                          <div className="flex items-center justify-between px-2 py-1 border-b border-neutral-800 gap-2 flex-wrap">
                            <span className="text-xs font-mono text-neutral-200 truncate">{String(f.path ?? '')}</span>
                            <span className="text-[10px] text-neutral-500 shrink-0">
                              <span className="px-1 rounded bg-neutral-800 mr-1">{String(f.change_type ?? '')}</span>
                              <span className="text-emerald-400">+{Number(f.additions ?? 0)}</span>
                              {' '}
                              <span className="text-red-400">-{Number(f.deletions ?? 0)}</span>
                            </span>
                          </div>
                          <pre className="text-[10px] leading-snug whitespace-pre-wrap break-words p-2 max-h-64 overflow-y-auto font-mono">
                            {(String(f.diff ?? '').split('\n')).map((line, li) => {
                              const cls = line.startsWith('+') && !line.startsWith('+++') ? 'text-emerald-400' :
                                line.startsWith('-') && !line.startsWith('---') ? 'text-red-400' :
                                line.startsWith('@@') ? 'text-cyan-400' : 'text-neutral-400'
                              return <div key={li} className={cls}>{line || ' '}</div>
                            })}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {selectedDeliverable.review_notes && (
                <div className="mt-2 p-2 rounded border border-emerald-900 bg-emerald-950/30">
                  <div className="text-[10px] tracking-widest text-emerald-400 mb-1">JURIN 内部レビュー</div>
                  <div className="text-xs text-neutral-200 whitespace-pre-wrap">{selectedDeliverable.review_notes}</div>
                </div>
              )}
            </div>
            {/* Review controls */}
            <div className="border-t border-neutral-800 p-3 space-y-2 sticky bottom-0 bg-neutral-950">
              {reviewError && (
                <div className="text-xs text-red-400 px-1">{reviewError}</div>
              )}
              {selectedDeliverable.status !== 'submitted' && (
                <div className="text-xs text-neutral-500 px-1">
                  ステータス: <span className="text-neutral-300">{DELIVERABLE_STATUS_LABEL_JA[selectedDeliverable.status]}</span>
                  {selectedDeliverable.status === 'approved' || selectedDeliverable.status === 'rejected' ? ' — レビュー終了' : ''}
                </div>
              )}
              {selectedDeliverable.status === 'submitted' && reviewMode === null && (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      const msg = selectedDeliverable.deliverable_type === 'code_patch'
                        ? 'この変更案を承認しますか?\n(GitHub への書き込みはまだ発生しません)'
                        : 'この成果物を承認しますか?\n(外部への書き込みは発生しません)'
                      if (confirm(msg)) {
                        doReview(selectedDeliverable.id, 'approve')
                      }
                    }}
                    disabled={reviewAction !== 'idle'}
                    className="min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded disabled:bg-neutral-700"
                  >
                    {reviewAction === 'approving' ? '承認中…' : selectedDeliverable.deliverable_type === 'code_patch' ? '変更案を承認' : '下書きを承認'}
                  </button>
                  <button
                    onClick={() => { setReviewMode('revise'); setReviewFeedback('') }}
                    disabled={reviewAction !== 'idle'}
                    className="min-h-[44px] bg-neutral-100 hover:bg-white text-neutral-900 text-sm font-medium rounded disabled:bg-neutral-700 disabled:text-neutral-400"
                  >
                    修正を依頼
                  </button>
                  <button
                    onClick={() => { setReviewMode('reject'); setReviewFeedback('') }}
                    disabled={reviewAction !== 'idle'}
                    className="min-h-[44px] bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded disabled:bg-neutral-700"
                  >
                    却下
                  </button>
                </div>
              )}
              {reviewMode === 'revise' && (
                <div className="space-y-2">
                  <label className="text-xs text-neutral-400">修正内容 (必須)</label>
                  <textarea
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    rows={3}
                    placeholder="どこをどう直してほしいか短く。 push / merge / 課金操作などの実行系依頼は反映されません。"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-base md:text-sm text-neutral-100 resize-none focus:outline-none focus:border-neutral-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setReviewMode(null)}
                      disabled={reviewAction !== 'idle'}
                      className="min-h-[44px] bg-neutral-800 text-neutral-200 text-sm rounded disabled:bg-neutral-700"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => reviewFeedback.trim().length > 0 && doReview(selectedDeliverable.id, 'revise', reviewFeedback.trim())}
                      disabled={reviewAction !== 'idle' || reviewFeedback.trim().length === 0}
                      className="min-h-[44px] bg-neutral-100 text-neutral-900 text-sm font-medium rounded disabled:bg-neutral-700 disabled:text-neutral-400"
                    >
                      {reviewAction === 'revising' ? '修正版を作成中…' : '修正を依頼する'}
                    </button>
                  </div>
                </div>
              )}
              {reviewMode === 'reject' && (
                <div className="space-y-2">
                  <label className="text-xs text-neutral-400">却下理由 (任意)</label>
                  <textarea
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    rows={2}
                    placeholder="却下理由 (任意)"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-base md:text-sm text-neutral-100 resize-none focus:outline-none focus:border-neutral-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setReviewMode(null)}
                      disabled={reviewAction !== 'idle'}
                      className="min-h-[44px] bg-neutral-800 text-neutral-200 text-sm rounded disabled:bg-neutral-700"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('この成果物を却下しますか?\n関連タスクはキャンセルされます。')) {
                          doReview(selectedDeliverable.id, 'reject', reviewFeedback.trim())
                        }
                      }}
                      disabled={reviewAction !== 'idle'}
                      className="min-h-[44px] bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded disabled:bg-neutral-700"
                    >
                      {reviewAction === 'rejecting' ? '却下中…' : '却下する'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    <div className="flex flex-col md:flex-row md:gap-4 h-[calc(100dvh-220px)] md:h-[calc(100vh-240px)] min-h-0 overflow-hidden">
      {/* AI TEAM — Desktop: 左固定カラム / Mobile: 上部の折りたたみパネル */}
      <aside className="md:w-56 md:shrink-0 md:h-full md:overflow-y-auto md:border md:border-neutral-800 md:rounded-lg md:p-3 mb-2 md:mb-0">
        {/* Mobile 折りたたみ toggle */}
        <button
          type="button"
          onClick={() => setTeamOpen((v) => !v)}
          aria-expanded={teamOpen}
          aria-controls="ai-hq-team-panel"
          className="md:hidden w-full flex items-center justify-between px-3 py-2 border border-neutral-800 rounded-lg bg-neutral-900 text-sm"
        >
          <span className="text-xs uppercase tracking-wider text-neutral-400">
            AI TEAM ({AGENTS.length})
          </span>
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className={`w-4 h-4 text-neutral-400 transition-transform ${teamOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Desktop 見出し (mobile では toggle が兼ねる) */}
        <h2 className="hidden md:block text-xs uppercase tracking-wider text-neutral-500 mb-2">
          AI TEAM
        </h2>

        {/* メンバー一覧: mobile は teamOpen 時のみ、desktop は常時 */}
        <div
          id="ai-hq-team-panel"
          className={`${teamOpen ? 'block' : 'hidden'} md:block mt-2 md:mt-0`}
        >
          <ul className="space-y-1 border border-neutral-800 rounded-lg p-3 md:border-0 md:rounded-none md:p-0">
            {AGENTS.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-sm">
                <span className={`w-6 h-6 shrink-0 rounded-full ${a.color} inline-block`} />
                <div className="min-w-0">
                  <div className="text-neutral-100 truncate">{a.name}</div>
                  <div className="text-xs text-neutral-500 truncate">{a.role}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* AUTO ACTIVITY: 折りたたみ (mobile: 常に折りたたみ、desktop: aside 内で常時展開可能) */}
        <div className="mt-3 md:mt-4">
          <button
            type="button"
            onClick={() => setActivityOpen((v) => !v)}
            aria-expanded={activityOpen}
            className="w-full flex items-center justify-between px-3 py-2 border border-neutral-800 rounded-lg bg-neutral-900 text-sm"
          >
            <span className="text-xs uppercase tracking-wider text-neutral-400">
              AUTO ACTIVITY ({hqEvents.length})
            </span>
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className={`w-4 h-4 text-neutral-400 transition-transform ${activityOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {activityOpen && (
            <div className="mt-2 space-y-2 border border-neutral-800 rounded-lg p-3">
              {/* Live status */}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">LIVE STATUS</div>
                <ul className="text-xs space-y-0.5">
                  {agentStatuses.map((a) => (
                    <li key={a.agent_id} className="flex justify-between gap-2">
                      <span className="text-neutral-300">{a.agent_id}</span>
                      <span
                        className={
                          a.status === 'idle'
                            ? 'text-neutral-500'
                            : a.status === 'meeting'
                              ? 'text-emerald-400'
                              : 'text-amber-400'
                        }
                      >
                        {a.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Watch status (Phase 2B) */}
              {(watchHealth.research_sources.length > 0 || watchHealth.github_state.length > 0) && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1 mt-2">
                    WATCH STATUS
                  </div>
                  <div className="space-y-1 text-xs">
                    {watchHealth.research_sources.length > 0 && (
                      <div className="p-1.5 rounded border border-neutral-800 bg-neutral-900">
                        <div className="flex justify-between">
                          <span className="text-neutral-300">MAYA Research</span>
                          <span className="text-neutral-500">
                            {watchHealth.research_sources.filter((s) => s.enabled).length}/{watchHealth.research_sources.length} 有効
                          </span>
                        </div>
                        {(() => {
                          const failing = watchHealth.research_sources.filter((s) => s.consecutive_failures >= 1)
                          const latest = watchHealth.research_sources
                            .filter((s) => s.last_checked_at)
                            .sort((a, b) => (a.last_checked_at! < b.last_checked_at! ? 1 : -1))[0]
                          return (
                            <div className="text-[10px] text-neutral-500 mt-0.5">
                              {latest ? `最終: ${new Date(latest.last_checked_at!).toLocaleTimeString('ja-JP')}` : '未実行'}
                              {failing.length > 0 && (
                                <span className="ml-2 text-red-400">失敗: {failing.length}</span>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    )}
                    {watchHealth.github_state.length > 0 && (
                      <div className="p-1.5 rounded border border-neutral-800 bg-neutral-900">
                        <div className="flex justify-between">
                          <span className="text-neutral-300">HINATA GitHub</span>
                          {(() => {
                            const h = watchHealth.github_state.find((s) => s.key === 'health:github')
                            const failCount = (h?.value?.count as number) ?? 0
                            return failCount > 0 ? (
                              <span className="text-red-400 text-[10px]">失敗: {failCount}</span>
                            ) : (
                              <span className="text-neutral-500 text-[10px]">正常</span>
                            )
                          })()}
                        </div>
                        {(() => {
                          const g = watchHealth.github_state.find((s) => s.key === 'github')
                          return g?.updated_at ? (
                            <div className="text-[10px] text-neutral-500 mt-0.5">
                              最終: {new Date(g.updated_at).toLocaleTimeString('ja-JP')}
                            </div>
                          ) : null
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recent events */}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1 mt-2">
                  RECENT EVENTS
                </div>
                {hqEvents.length === 0 && <div className="text-xs text-neutral-500">まだイベントはありません</div>}
                <ul className="text-xs space-y-1">
                  {hqEvents.slice(0, 8).map((e) => (
                    <li
                      key={e.id}
                      className={`p-1.5 rounded border ${
                        e.severity === 'high' || e.severity === 'critical'
                          ? 'border-red-800 bg-red-950/30'
                          : e.severity === 'medium'
                            ? 'border-amber-900 bg-amber-950/20'
                            : 'border-neutral-800 bg-neutral-900'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-neutral-300 flex-1 min-w-0 truncate">{e.title}</span>
                        <span className="shrink-0 text-[10px] text-neutral-500">{e.status}</span>
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">
                        {e.event_type} / {e.severity}
                        {e.handled_by_thread_id && (
                          <button
                            className="ml-2 underline text-neutral-400"
                            onClick={() => {
                              setActiveThreadId(e.handled_by_thread_id)
                              setActivityOpen(false)
                            }}
                          >
                            スレッドを開く
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* チャット領域 — mobile / desktop 共通 flex column、message list が残り高さを取る */}
      <section className="flex-1 min-w-0 min-h-0 flex flex-col border border-neutral-800 rounded-lg overflow-hidden">
        {/* Channel タブ (横 scroll on overflow) */}
        <nav className="flex gap-1 p-2 border-b border-neutral-800 overflow-x-auto shrink-0">
          {CHANNELS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setChannel(c)
                setActiveThreadId(null)
                setMessages([])
              }}
              className={`px-3 py-1.5 rounded text-sm whitespace-nowrap shrink-0 ${
                c === channel
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'bg-neutral-800 text-neutral-300'
              }`}
            >
              #{c}
            </button>
          ))}
        </nav>

        {/* Thread list */}
        <div className="p-2 border-b border-neutral-800 max-h-24 md:max-h-32 overflow-y-auto shrink-0">
          {channelThreads.length === 0 && (
            <div className="text-xs text-neutral-500 px-2 py-1 break-words">
              まだ #{channel} には thread がありません。 下から新しい話題を送ってみてください。
            </div>
          )}
          <ul className="space-y-1">
            {channelThreads.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setActiveThreadId(t.id)}
                  className={`w-full text-left text-sm px-2 py-1 rounded truncate ${
                    t.id === activeThreadId
                      ? 'bg-neutral-700 text-white'
                      : 'text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  {t.title || '(無題)'}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Message 一覧: 残り高さを取ってスクロール */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 space-y-3"
        >
          {messages.length === 0 && activeThreadId && (
            <div className="text-xs text-neutral-500">JURIN が返答中…</div>
          )}
          {messages.map((m) => {
            const s = senderLabel(m)
            return (
              <div key={m.id} className="flex gap-2 md:gap-3">
                <span
                  className={`shrink-0 w-8 h-8 rounded-full ${s.color} text-xs font-bold flex items-center justify-center`}
                >
                  {s.name.slice(0, 1)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-neutral-500 mb-0.5">
                    <span className="text-neutral-300 font-semibold">{s.name}</span>
                    <span className="ml-2">
                      {new Date(m.created_at).toLocaleTimeString('ja-JP')}
                    </span>
                    {m.message_type !== 'message' && (
                      <span className="ml-2 px-1 py-0.5 rounded bg-neutral-800 text-neutral-400">
                        {m.message_type}
                      </span>
                    )}
                  </div>
                  <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {m.content}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Input: section の底に定位。 iOS zoom 回避 (text-base) + 44px 以上のタップ target。
            safe-area-inset-bottom を padding に加えて home indicator を避ける。 */}
        <div
          className="border-t border-neutral-800 p-3 shrink-0 bg-neutral-950"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          {error && <div className="text-xs text-red-400 mb-2 break-words">{error}</div>}
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={2}
              placeholder={`#${channel} にメッセージを送信 (JURIN が受け取ります)`}
              className="flex-1 min-w-0 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-base md:text-sm text-neutral-100 resize-none focus:outline-none focus:border-neutral-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  send()
                }
              }}
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              className="shrink-0 px-4 min-h-[44px] bg-white text-neutral-900 rounded text-sm font-medium disabled:bg-neutral-700 disabled:text-neutral-400"
            >
              {sending ? '送信中…' : '送信'}
            </button>
          </div>
          <div className="hidden md:block mt-1 text-[10px] text-neutral-500">
            ⌘Enter でも送信できます
          </div>
        </div>
      </section>
    </div>
    </>
  )
}
