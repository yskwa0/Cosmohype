'use client'

// AI HQ 秘密 URL 版 Client Component。
//
// - Supabase browser client を使わず、全ての DB アクセスを server API 経由に絞る。
// - Realtime は `/api/ai-hq/events?thread_id=...` の SSE proxy 経由 (server が
//   service_role で Postgres Changes を subscribe → text/event-stream で forward)。
// - CEO input → POST /api/ai-hq/send-message (cookie で認証)。
// - 一切の secret を client bundle に置かない。

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
    <div className="flex gap-4 h-[calc(100vh-160px)]">
      <aside className="w-56 shrink-0 border border-neutral-800 rounded-lg p-3 overflow-y-auto">
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-2">AI TEAM</h2>
        <ul className="space-y-1">
          {AGENTS.map((a) => (
            <li key={a.id} className="flex items-center gap-2 text-sm">
              <span className={`w-6 h-6 rounded-full ${a.color} inline-block`} />
              <div>
                <div className="text-neutral-100">{a.name}</div>
                <div className="text-xs text-neutral-500">{a.role}</div>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 text-xs text-neutral-500">
          status は現状 idle 表示のみ (Phase 1)
        </div>
      </aside>

      <section className="flex-1 flex flex-col border border-neutral-800 rounded-lg overflow-hidden">
        <nav className="flex gap-1 p-2 border-b border-neutral-800 overflow-x-auto">
          {CHANNELS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setChannel(c)
                setActiveThreadId(null)
                setMessages([])
              }}
              className={`px-3 py-1 rounded text-sm whitespace-nowrap ${
                c === channel ? 'bg-neutral-100 text-neutral-900' : 'bg-neutral-800 text-neutral-300'
              }`}
            >
              #{c}
            </button>
          ))}
        </nav>

        <div className="p-2 border-b border-neutral-800 max-h-32 overflow-y-auto">
          {channelThreads.length === 0 && (
            <div className="text-xs text-neutral-500 px-2 py-1">
              まだ #{channel} には thread がありません。 下から新しい話題を送ってみてください。
            </div>
          )}
          <ul className="space-y-1">
            {channelThreads.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setActiveThreadId(t.id)}
                  className={`w-full text-left text-sm px-2 py-1 rounded ${
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

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && activeThreadId && (
            <div className="text-xs text-neutral-500">JURIN が返答中…</div>
          )}
          {messages.map((m) => {
            const s = senderLabel(m)
            return (
              <div key={m.id} className="flex gap-3">
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
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-3 border-t border-neutral-800 space-y-2">
          {error && <div className="text-xs text-red-400">{error}</div>}
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={2}
              placeholder={`#${channel} にメッセージを送信 (JURIN が受け取ります)`}
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 resize-none focus:outline-none focus:border-neutral-500"
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
              className="px-4 py-2 bg-white text-neutral-900 rounded text-sm font-medium disabled:bg-neutral-700 disabled:text-neutral-400"
            >
              {sending ? '送信中…' : '送信 (⌘Enter)'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
