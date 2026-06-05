'use client'
import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'

export type MessageRow = {
  id: string
  sender_id: string
  body: string
  created_at: string
}

const PAGE_SIZE = 30

interface ChatViewProps {
  conversationId: string
  userId: string
  initialMessages: MessageRow[]
  initialHasMore: boolean
  topBar: ReactNode
}

export function ChatView({ conversationId, userId, initialMessages, initialHasMore, topBar }: ChatViewProps) {
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  // kbBottom: distance from bottom of visual viewport to bottom of layout viewport (= keyboard height, 0 when hidden)
  const [kbBottom, setKbBottom] = useState(0)

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInitial = useRef(true)
  const isPrepending = useRef(false)
  const confirmedIds = useRef(new Set(initialMessages.map(m => m.id)))
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasMoreRef = useRef(initialHasMore)
  const loadingOlderRef = useRef(false)
  const messagesRef = useRef<MessageRow[]>(initialMessages)

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { setMounted(true) }, [])

  // iOS キーボード対応
  // height = vv.height, top = vv.offsetTop でコンテナをビジュアルビューポートに正確に合わせる。
  // bottom ベースだと iOS Safari の fixed 座標系と二重補正になり入力欄が高くなりすぎるため使わない。
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const vv = window.visualViewport
    const baselineHeight = vv ? vv.height : window.innerHeight
    let prevVvHeight = baselineHeight

    function onVvResize() {
      const newHeight = vv ? vv.height : window.innerHeight
      const decreased = newHeight < prevVvHeight - 50
      prevVvHeight = newHeight
      const kb = Math.max(0, baselineHeight - newHeight)
      // コンテナ全体をリサイズせず、paddingBottom でキーボード分だけ内側を押し上げる。
      // こうするとコンテナ高さが変わらないため iOS のラバーバンド感が保たれる。
      el!.style.paddingBottom = kb > 0 ? `${kb}px` : ''
      setKbBottom(kb)
      if (decreased && scrollRef.current) {
        requestAnimationFrame(() => {
          scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight
        })
      }
    }

    if (vv) {
      vv.addEventListener('resize', onVvResize)
      return () => vv.removeEventListener('resize', onVvResize)
    }
  }, [])

  // 自動スクロール（prepend 時・ユーザーが上部を読んでいる時はスキップ）
  useEffect(() => {
    if (isPrepending.current) {
      isPrepending.current = false
      return
    }
    const el = scrollRef.current
    const isNearBottom = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 150
    if (isInitial.current || isNearBottom) {
      bottomRef.current?.scrollIntoView({
        behavior: isInitial.current ? 'instant' : 'smooth',
      })
    }
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
          if (confirmedIds.current.has(incoming.id)) return
          confirmedIds.current.add(incoming.id)
          setMessages(prev => [...prev, incoming])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  // 上端スクロール検知 → 古いメッセージ追加読み込み
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function onScroll() {
      if (el!.scrollTop < 120 && hasMoreRef.current && !loadingOlderRef.current) {
        fetchOlder()
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchOlder() {
    if (loadingOlderRef.current || !hasMoreRef.current) return
    if (messagesRef.current.length === 0) return

    loadingOlderRef.current = true
    setLoadingOlder(true)

    const el = scrollRef.current
    const prevScrollHeight = el ? el.scrollHeight : 0
    const prevScrollTop = el ? el.scrollTop : 0

    const supabase = createClient()
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, body, created_at')
      .eq('conversation_id', conversationId)
      .lt('created_at', messagesRef.current[0].created_at)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (data && data.length > 0) {
      const older = (data as MessageRow[]).reverse()
      isPrepending.current = true
      setMessages(prev => [...older, ...prev])
      const newHasMore = data.length === PAGE_SIZE
      setHasMore(newHasMore)
      hasMoreRef.current = newHasMore

      // スクロール位置を保持（DOM更新後）
      requestAnimationFrame(() => {
        if (el) {
          const newScrollHeight = el.scrollHeight
          el.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight)
        }
      })
    } else {
      setHasMore(false)
      hasMoreRef.current = false
    }

    loadingOlderRef.current = false
    setLoadingOlder(false)
  }

  // 長押し削除
  function startLongPress(msgId: string) {
    longPressTimer.current = setTimeout(() => { setSelectedMsgId(msgId) }, 500)
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  async function handleDelete() {
    if (!selectedMsgId) return
    const supabase = createClient()
    await supabase.from('messages').delete().eq('id', selectedMsgId)
    setMessages(prev => prev.filter(m => m.id !== selectedMsgId))
    setSelectedMsgId(null)
  }

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
      confirmedIds.current.add(data.id)
      setMessages(prev => prev.map(m => (m.id === tempId ? (data as MessageRow) : m)))
    }

    setSending(false)
  }

  const canSend = input.trim().length > 0 && !sending

  return (
    <>
      {/* height は CSS (100svh) で定義し、JS はキーボード時の paddingBottom 調整だけに使う。
          コンテナ高さを JS でリサイズしないことで iOS のラバーバンド感が生きる。 */}
      <div
        ref={containerRef}
        className="flex flex-col"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '100svh' }}
      >
        {/* TopBar: fixed コンテナ内に配置することでiOSキーボードによる画面押し上げを防ぐ */}
        {topBar}

        {/* スクロール可能なメッセージ領域 */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto"
          style={{
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* 追加読み込みインジケーター */}
          {loadingOlder && (
            <div className="flex justify-center py-3">
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--purple)' }}>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}

          {/* 全件読み込み済み表示 */}
          {!hasMore && messages.length > 0 && !loadingOlder && (
            <p className="text-center text-xs py-3" style={{ color: 'var(--text-muted)' }}>
              これ以上メッセージはありません
            </p>
          )}

          {/* メッセージ一覧 — minHeight: calc(100% + 56px) でメッセージ0件でも常に
              わずかにスクロール可能な高さを確保し、iOS のラバーバンドが発動できるようにする */}
          <div className="flex flex-col gap-1.5 px-4 pt-2 pb-4" style={{ minHeight: 'calc(100% + 56px)' }}>
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
                      className={`max-w-[72%] px-4 py-2.5 text-sm leading-relaxed break-words select-none ${
                        isMine ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md'
                      } ${isTemp ? 'opacity-60' : ''}`}
                      style={{
                        background: isMine ? 'var(--purple)' : 'var(--bg-elevated)',
                        color: isMine ? '#fff' : 'var(--text)',
                        border: isMine ? 'none' : '1px solid var(--border)',
                      }}
                      onTouchStart={() => isMine && !isTemp ? startLongPress(msg.id) : undefined}
                      onTouchEnd={cancelLongPress}
                      onTouchMove={cancelLongPress}
                      onContextMenu={e => {
                        if (isMine && !isTemp) {
                          e.preventDefault()
                          setSelectedMsgId(msg.id)
                        }
                      }}
                    >
                      {msg.body}
                    </div>
                    {isLastInGroup && !isTemp && (
                      <span className="text-[10px] mt-1 px-1" style={{ color: 'var(--text-muted)' }}>
                        {formatRelativeTime(msg.created_at)}
                      </span>
                    )}
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* 入力バー — flex コンテナの末尾に固定、window スクロール不使用 */}
        <div
          className="flex-shrink-0"
          style={{
            background: 'var(--nav-bg)',
            borderTop: '1px solid var(--border)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <div
            className="flex items-center gap-2 px-4 pt-3"
            style={{
              // キーボード表示中(kbBottom>50)はsafe-areaを外す。コンテナbottomがキーボード上端に揃うため二重加算を防ぐ
              paddingBottom: kbBottom > 50
                ? '12px'
                : 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
            }}
          >
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
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 削除確認ボトムシート */}
      {mounted && selectedMsgId && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-black/40" onClick={() => setSelectedMsgId(null)} />
          <div
            className="fixed bottom-0 left-0 right-0 z-[100] max-w-md mx-auto rounded-t-2xl overflow-hidden"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <div className="flex flex-col px-5 pb-8">
              <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-5" style={{ background: 'var(--border)' }} />
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text)' }}>
                メッセージを削除しますか？
              </h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                削除すると元に戻せません。
              </p>
              <button
                onClick={handleDelete}
                className="w-full h-11 rounded-xl text-sm font-semibold mb-2 transition-transform duration-75 active:scale-[0.97]"
                style={{ background: '#EF4444', color: '#fff' }}
              >
                削除する
              </button>
              <button
                onClick={() => setSelectedMsgId(null)}
                className="w-full h-10 text-sm transition-opacity active:opacity-60"
                style={{ color: 'var(--text-muted)' }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
