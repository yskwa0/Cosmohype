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
  // kbBottom: キーボード高さ (px)。メッセージ一覧の paddingBottom に使う
  const [kbBottom, setKbBottom] = useState(0)

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputBarRef = useRef<HTMLDivElement>(null)
  const isInputFocusedRef = useRef(false)
  const isInitial = useRef(true)
  const isPrepending = useRef(false)
  const confirmedIds = useRef(new Set(initialMessages.map(m => m.id)))
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasMoreRef = useRef(initialHasMore)
  const loadingOlderRef = useRef(false)
  const messagesRef = useRef<MessageRow[]>(initialMessages)

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { setMounted(true) }, [])

  // iOS の input focus auto-scroll 対策: body/html の scroll を封じ、unmount で復元
  useEffect(() => {
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBody
      document.documentElement.style.overflow = prevHtml
    }
  }, [])

  // キーボード表示時の入力バー位置を同期する。
  // visualViewport.height が縮まない iOS PWA でも、rect ベースで補正する。
  function syncInputBarPosition() {
    if (!inputBarRef.current) return
    const vv = window.visualViewport
    const visibleHeight = vv?.height ?? window.innerHeight
    const offsetTop = vv?.offsetTop ?? 0
    const viewportBottom = offsetTop + visibleHeight
    const kbFromVv = Math.max(0, window.innerHeight - visibleHeight)

    const rect = inputBarRef.current.getBoundingClientRect()

    let appliedBottom: number
    if (kbFromVv > 50) {
      // vv が正常に縮んだ: そのまま使う
      appliedBottom = kbFromVv
    } else if (isInputFocusedRef.current && rect.bottom > viewportBottom - 10) {
      // vv が縮まなかった: rect vs viewportBottom で補正
      const overflow = rect.bottom - viewportBottom
      appliedBottom = overflow > 0 ? Math.round(overflow + rect.height + 4) : 0
    } else {
      appliedBottom = 0
    }

    inputBarRef.current.style.bottom = `${appliedBottom}px`
    setKbBottom(kbFromVv)
  }

  // iOS キーボード対応: visualViewport.resize で高さ変化を検知して補正
  useLayoutEffect(() => {
    const vv = window.visualViewport
    let prevVvHeight = vv ? vv.height : window.innerHeight

    if (inputBarRef.current) {
      inputBarRef.current.style.bottom = '0px'
    }

    function onVvResize() {
      const newHeight = vv ? vv.height : window.innerHeight
      const decreased = newHeight < prevVvHeight - 50
      prevVvHeight = newHeight

      syncInputBarPosition()

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

  // onPointerDown / onTouchStart で呼ぶ。onFocus より早く発火するため、
  // iOS のキーボード起動・auto-scroll が始まる前に入力バーを隠せる。
  // visibility:hidden + opacity:0 の両方で compositor の残像も防ぐ。
  function prepareInputBarForFocus() {
    const bar = inputBarRef.current
    if (!bar) return
    bar.style.transition = 'none'
    bar.style.opacity = '0'
    bar.style.visibility = 'hidden'
    bar.style.pointerEvents = 'none'
    bar.style.willChange = 'bottom, transform, opacity'
    bar.style.transform = 'translate3d(0,0,0)'
  }

  // 補正済みの position で入力バーを再表示する
  function showInputBar() {
    const bar = inputBarRef.current
    if (!bar) return
    bar.style.visibility = 'visible'
    bar.style.opacity = '1'
    bar.style.pointerEvents = ''
  }

  function handleInputFocus() {
    isInputFocusedRef.current = true

    // onPointerDown/onTouchStart で隠せていない場合の念押し
    prepareInputBarForFocus()
    syncInputBarPosition()

    const resetAndSync = () => {
      window.scrollTo(0, 0)
      syncInputBarPosition()
    }

    // rAF で scroll reset + 補正、50ms 後に表示
    requestAnimationFrame(resetAndSync)
    setTimeout(showInputBar, 50)

    // キーボードアニメーション中も複数回補正
    setTimeout(resetAndSync, 150)
    // 300ms でキーボードが安定したら transform / willChange / transition を戻す
    setTimeout(() => {
      resetAndSync()
      const bar = inputBarRef.current
      if (bar) {
        bar.style.transition = ''
        bar.style.willChange = ''
        bar.style.transform = ''
      }
    }, 300)
  }

  function handleInputBlur() {
    isInputFocusedRef.current = false
    const bar = inputBarRef.current
    if (bar) {
      bar.style.transition = 'none'
      bar.style.opacity = '1'
      bar.style.visibility = 'visible'
      bar.style.pointerEvents = ''
      bar.style.willChange = ''
      bar.style.transform = ''
      bar.style.bottom = '0px'
    }
    setKbBottom(0)
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
      <div
        ref={containerRef}
        className="flex flex-col"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
      >
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
          {loadingOlder && (
            <div className="flex justify-center py-3">
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--purple)' }}>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}

          {!hasMore && messages.length > 0 && !loadingOlder && (
            <p className="text-center text-xs py-3" style={{ color: 'var(--text-muted)' }}>
              これ以上メッセージはありません
            </p>
          )}

          {/* メッセージ一覧 — paddingBottom で入力バーに隠れないよう余白確保。
              minHeight: calc(100% + 56px) で空でも iOS ラバーバンドが発動する。 */}
          <div
            className="flex flex-col gap-1.5 px-4 pt-2"
            style={{
              minHeight: 'calc(100% + 56px)',
              paddingBottom: kbBottom > 50
                ? `${kbBottom + 64}px`
                : 'calc(env(safe-area-inset-bottom, 0px) + 64px)',
            }}
          >
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

        {/* 入力バー — bottom は useLayoutEffect / syncInputBarPosition で直接 DOM 操作する。
            JSX の style に bottom を書かないことで React の re-render が上書きしない。 */}
        <div
          ref={inputBarRef}
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            zIndex: 10,
            background: 'var(--nav-bg)',
            borderTop: '1px solid var(--border)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <div
            className="flex items-center gap-2 px-4 pt-3"
            style={{
              paddingBottom: kbBottom > 50
                ? '12px'
                : 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onPointerDown={prepareInputBarForFocus}
              onTouchStart={prepareInputBarForFocus}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="メッセージを入力…"
              disabled={sending}
              className="flex-1 rounded-full px-4 py-2.5 outline-none"
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--input-text)',
                fontSize: 16,
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
