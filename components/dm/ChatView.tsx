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
  const [isInputFocused, setIsInputFocused] = useState(false)
  const isInputFocusedRef = useRef(false)

  // ── TEMP DEBUG ──
  type DebugInfo = {
    innerH: number; baseline: number
    vvH: number | null; vvOT: number | null; vvPT: number | null
    kb: number; styleBot: string
    rTop: number | null; rBot: number | null; rH: number | null
    distBot: number | null; diff: number | null
    scrollY: number | null; docST: number | null; bodyST: number | null
    outerTop: number | null; outerBot: number | null
    focused: boolean; visHeight: number | null; viewportBot: number | null
    inputRectBot: number | null; appliedBot: number | null
  }
  const [dbg, setDbg] = useState<DebugInfo>({
    innerH: 0, baseline: 0, vvH: null, vvOT: null, vvPT: null,
    kb: 0, styleBot: '–',
    rTop: null, rBot: null, rH: null, distBot: null, diff: null,
    scrollY: null, docST: null, bodyST: null, outerTop: null, outerBot: null,
    focused: false, visHeight: null, viewportBot: null, inputRectBot: null, appliedBot: null,
  })

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputBarRef = useRef<HTMLDivElement>(null)
  const baselineRef = useRef(0)
  const isInitial = useRef(true)
  const isPrepending = useRef(false)
  const confirmedIds = useRef(new Set(initialMessages.map(m => m.id)))
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasMoreRef = useRef(initialHasMore)
  const loadingOlderRef = useRef(false)
  const messagesRef = useRef<MessageRow[]>(initialMessages)

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { setMounted(true) }, [])

  // iOS の input focus auto-scroll 対策: body/html に overflow:hidden をかけてドキュメント自体のスクロールを封じる
  // unmount 時に必ず元の値に戻す
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
    const vvPT = (vv as unknown as { pageTop?: number })?.pageTop ?? null

    const rect = inputBarRef.current.getBoundingClientRect()

    let appliedBottom: number
    if (kbFromVv > 50) {
      // vv が正常に縮んだ場合: そのまま使う
      appliedBottom = kbFromVv
    } else if (isInputFocusedRef.current && rect.bottom > viewportBottom - 10) {
      // vv が縮まなかった場合: rect vs viewportBottom で補正
      const overflow = rect.bottom - viewportBottom
      appliedBottom = overflow > 0 ? Math.round(overflow + rect.height + 4) : 0
    } else {
      appliedBottom = 0
    }

    inputBarRef.current.style.bottom = `${appliedBottom}px`
    setKbBottom(kbFromVv)

    const outerRect = containerRef.current?.getBoundingClientRect()
    setDbg(prev => ({
      ...prev,
      innerH: window.innerHeight, baseline: baselineRef.current,
      vvH: Math.round(visibleHeight), vvOT: Math.round(offsetTop), vvPT,
      kb: kbFromVv, styleBot: `${appliedBottom}px`,
      rTop: Math.round(rect.top), rBot: Math.round(rect.bottom), rH: Math.round(rect.height),
      distBot: Math.round(window.innerHeight - rect.bottom),
      diff: Math.round((window.innerHeight - rect.bottom) - kbFromVv),
      scrollY: Math.round(window.scrollY),
      docST: Math.round(document.documentElement.scrollTop),
      bodyST: Math.round(document.body.scrollTop),
      outerTop: outerRect ? Math.round(outerRect.top) : null,
      outerBot: outerRect ? Math.round(outerRect.bottom) : null,
      focused: isInputFocusedRef.current,
      visHeight: Math.round(visibleHeight),
      viewportBot: Math.round(viewportBottom),
      inputRectBot: Math.round(rect.bottom),
      appliedBot: appliedBottom,
    }))
  }

  // iOS キーボード対応
  // height = vv.height, top = vv.offsetTop でコンテナをビジュアルビューポートに正確に合わせる。
  // bottom ベースだと iOS Safari の fixed 座標系と二重補正になり入力欄が高くなりすぎるため使わない。
  useLayoutEffect(() => {
    const vv = window.visualViewport
    // コンテナは inset:0 なので window.innerHeight を基準にする。
    // vv.height はキーボード表示で縮むため差分 = keyboardHeight になる。
    const baselineHeight = window.innerHeight
    baselineRef.current = baselineHeight
    let prevVvHeight = vv ? vv.height : window.innerHeight

    // 初期位置を直接 DOM に設定（React レンダリング前に確定させる）
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

  function handleInputFocus() {
    setIsInputFocused(true)
    isInputFocusedRef.current = true

    // iOS は input focus 時にページ or visual viewport をスクロールさせる。
    // rAF + setTimeout で複数回リセット＆再測定してキーボード表示後の正しい位置を確定する。
    const resetAndSync = () => {
      window.scrollTo(0, 0)
      syncInputBarPosition()
    }

    requestAnimationFrame(resetAndSync)
    setTimeout(resetAndSync, 50)
    setTimeout(resetAndSync, 150)
    setTimeout(resetAndSync, 300)
  }

  function handleInputBlur() {
    setIsInputFocused(false)
    isInputFocusedRef.current = false
    if (inputBarRef.current) {
      inputBarRef.current.style.bottom = '0px'
    }
    setKbBottom(0)
    setDbg(prev => ({ ...prev, focused: false, appliedBot: 0, styleBot: '0px' }))
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
      {/* コンテナは inset:0 の fixed。入力バーは独立した fixed 要素なので、
          このコンテナの paddingBottom はキーボードに連動させない。 */}
      <div
        ref={containerRef}
        className="flex flex-col"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
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

          {/* メッセージ一覧 — paddingBottom で固定入力バーに隠れないよう余白を確保。
              minHeight: calc(100% + 56px) で 0 件でも iOS ラバーバンドが発動できるようにする。 */}
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

        {/* 入力バー — position:fixed で親コンテナから独立させ、キーボード上に直接固定する。
            bottom は useLayoutEffect で inputBarRef を通じて直接 DOM 操作する（React state 経由だとキーボードアニメーション中に遅れるため）。
            JSX の style に bottom を書かないことで React の re-render が DOM 値を上書きしない。 */}
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
              // キーボード表示中 (kbBottom > 50) は safe-area 不要（キーボードが覆うため）
              paddingBottom: kbBottom > 50
                ? '12px'
                : 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
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

      {/* ── TEMP DEBUG PANEL ── pointer-events:none で操作を邪魔しない */}
      <div
        style={{
          position: 'fixed', top: 52, right: 4, zIndex: 9999,
          pointerEvents: 'none',
          background: 'rgba(0,0,0,0.85)',
          color: '#00ff88',
          fontFamily: 'monospace',
          fontSize: 9,
          lineHeight: 1.6,
          padding: '5px 7px',
          borderRadius: 6,
          border: '1px solid rgba(0,255,136,0.25)',
          whiteSpace: 'pre',
          userSelect: 'none',
        }}
      >
        {`innerH   ${dbg.innerH}
base     ${dbg.baseline}
vvH      ${dbg.vvH ?? '–'}
vvOT     ${dbg.vvOT ?? '–'}
vvPT     ${dbg.vvPT ?? '–'}
kb       ${dbg.kb}
kbState  ${kbBottom}
styleBot ${dbg.styleBot}
─────────────
rTop     ${dbg.rTop ?? '–'}
rBot     ${dbg.rBot ?? '–'}
rH       ${dbg.rH ?? '–'}
distBot  ${dbg.distBot ?? '–'}
diff     ${dbg.diff ?? '–'}
─── scroll ───
scrollY  ${dbg.scrollY ?? '–'}
docST    ${dbg.docST ?? '–'}
bodyST   ${dbg.bodyST ?? '–'}
outerTop ${dbg.outerTop ?? '–'}
outerBot ${dbg.outerBot ?? '–'}
─── focus ────
focused  ${dbg.focused}
visH     ${dbg.visHeight ?? '–'}
viewBot  ${dbg.viewportBot ?? '–'}
iRectBot ${dbg.inputRectBot ?? '–'}
applied  ${dbg.appliedBot ?? '–'}`}
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
