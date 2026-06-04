'use client'
import { useState, useLayoutEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { armFeedScrollRestore } from '@/lib/feedScrollStore'

export function PostDetailSlide({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [pressed, setPressed] = useState(false)
  const exitingRef = useRef(false)
  const backCalledRef = useRef(false)
  const backTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  useLayoutEffect(() => {
    const fromFeed = sessionStorage.getItem('post_slide_from_feed') === '1'
    const inProgress = sessionStorage.getItem('post_slide_in_progress') === '1'
    sessionStorage.removeItem('post_slide_from_feed')
    sessionStorage.removeItem('post_slide_in_progress')

    if (inProgress) {
      // Loading shell was already at translateX(0) — appear instantly before first paint.
      // setVisible(true) here re-renders before the browser paints, so no CSS transition fires.
      setVisible(true)
    } else if (fromFeed) {
      // Double rAF ensures the translateX(100%) initial state is painted first,
      // so the CSS transition has a "from" state to animate from.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      // Direct navigation (URL bar, share link) — appear instantly.
      setVisible(true)
    }
  }, [])

  function doBack() {
    if (backCalledRef.current) return
    backCalledRef.current = true
    if (backTimerRef.current) clearTimeout(backTimerRef.current)
    router.back()
  }

  function handleBack() {
    if (exitingRef.current) return
    exitingRef.current = true

    armFeedScrollRestore()
    setExiting(true)
    setVisible(false)

    // Fallback: call router.back() if transitionend doesn't fire within 400ms
    // (e.g. reduced-motion, animation disabled in tests).
    backTimerRef.current = setTimeout(doBack, 400)
  }

  let transition = 'none'
  if (visible) {
    transition = 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)'
  } else if (exiting) {
    transition = 'transform 260ms cubic-bezier(0.4, 0, 1, 1)'
  }

  const backBtn = (
    <button
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onClick={handleBack}
      aria-label="戻る"
      style={{
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: 'rgba(124,58,237,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        userSelect: 'none',
        WebkitUserSelect: 'none' as React.CSSProperties['WebkitUserSelect'],
        transform: pressed ? 'scale(0.82)' : 'scale(1)',
        transition: pressed
          ? 'transform 70ms ease-in'
          : 'transform 480ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#7C3AED" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  )

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'var(--bg)',
        overflowY: 'auto',
        overflowX: 'hidden',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition,
        willChange: 'transform',
      }}
      onTransitionEnd={(e) => {
        // Only act on our own transform transition, not bubbled child transitions.
        if (e.target !== e.currentTarget || e.propertyName !== 'transform') return
        if (exitingRef.current) doBack()
      }}
    >
      <TopBar title="投稿" left={backBtn} />
      <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }}>
        {children}
      </div>
    </div>
  )
}
