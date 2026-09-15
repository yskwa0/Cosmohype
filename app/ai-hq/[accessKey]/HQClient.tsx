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
    <div className="flex flex-col md:flex-row md:gap-4 h-[calc(100dvh-140px)] md:h-[calc(100vh-160px)] min-h-0 overflow-hidden">
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
          <div className="mt-4 text-xs text-neutral-500 hidden md:block">
            status は現状 idle 表示のみ (Phase 1)
          </div>
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
                  {t.title || '(untitled)'}
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
  )
}
