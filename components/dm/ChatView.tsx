'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'

export type MessageRow = {
  id: string
  sender_id: string
  body: string
  created_at: string
}

interface ChatViewProps {
  conversationId: string
  userId: string
  initialMessages: MessageRow[]
}

export function ChatView({ conversationId, userId, initialMessages }: ChatViewProps) {
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isInitial = useRef(true)

  // 既知メッセージIDの追跡。Realtimeイベントの重複挿入を防ぐ。
  const confirmedIds = useRef(new Set(initialMessages.map(m => m.id)))

  // 自動スクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: isInitial.current ? 'instant' : 'smooth',
    })
    isInitial.current = false
  }, [messages])

  // Supabase Realtime 購読
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`dm-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        payload => {
          const incoming = payload.new as MessageRow
          // 既に持っているID（自分が送信済み or 初期ロード済み）はスキップ
          if (confirmedIds.current.has(incoming.id)) return
          confirmedIds.current.add(incoming.id)
          setMessages(prev => [...prev, incoming])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  async function handleSend() {
    const body = input.trim()
    if (!body || sending) return

    const tempId = `temp-${Date.now()}`
    const optimistic: MessageRow = {
      id: tempId,
      sender_id: userId,
      body,
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, optimistic])
    setInput('')
    setSending(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: userId, body })
      .select('id, sender_id, body, created_at')
      .single()

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } else if (data) {
      // 確定IDを登録してからtempを置き換える。
      // Realtimeがこの後に来ても重複しない。
      confirmedIds.current.add(data.id)
      setMessages(prev => prev.map(m => (m.id === tempId ? (data as MessageRow) : m)))
    }

    setSending(false)
  }

  const canSend = input.trim().length > 0 && !sending

  return (
    <>
      {/* メッセージ一覧 */}
      <div className="flex flex-col gap-1.5 px-4 pt-4 pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              まだメッセージがありません
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.sender_id === userId
            const next = messages[i + 1]
            const isLastInGroup = !next || next.sender_id !== msg.sender_id
            const isTemp = msg.id.startsWith('temp-')

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} ${
                  isLastInGroup ? 'mb-2' : ''
                }`}
              >
                <div
                  className={`max-w-[72%] px-4 py-2.5 text-sm leading-relaxed break-words ${
                    isMine ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md'
                  } ${isTemp ? 'opacity-60' : ''}`}
                  style={{
                    background: isMine ? 'var(--purple)' : 'var(--bg-elevated)',
                    color: isMine ? '#fff' : 'var(--text)',
                    border: isMine ? 'none' : '1px solid var(--border)',
                  }}
                >
                  {msg.body}
                </div>
                {isLastInGroup && !isTemp && (
                  <span
                    className="text-[10px] mt-1 px-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {formatRelativeTime(msg.created_at)}
                  </span>
                )}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* 入力バー */}
      <div
        className="sticky bottom-20 z-30"
        style={{
          background: 'var(--nav-bg)',
          borderTop: '1px solid var(--border)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div className="max-w-md mx-auto flex items-center gap-2 px-4 py-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="メッセージを入力…"
            disabled={sending}
            className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none"
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              color: 'var(--input-text)',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background: canSend ? 'var(--purple)' : 'var(--purple-dim)',
              color: canSend ? '#fff' : 'var(--purple)',
              opacity: canSend ? 1 : 0.45,
            }}
            aria-label="送信"
          >
            {sending ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="3"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
