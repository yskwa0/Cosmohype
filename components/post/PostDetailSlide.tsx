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
  // rAF IDs for the slide-in animation — cancelled if the user presses back early
  const raf1Ref = useRef(0)
  const raf2Ref = useRef(0)
  const router = useRouter()

  useLayoutEffect(() => {
    const fromFeed = sessionStorage.getItem('post_slide_from_feed') === '1'
    const inProgress = sessionStorage.getItem('post_slide_in_progress') === '1'
    sessionStorage.removeItem('post_slide_from_feed')
    sessionStorage.removeItem('post_slide_in_progress')

    if (inProgress) {
      // PostDetailLoadingShell already held the position at translateX(0).
      // Calling setVisible(true) here (before first paint, inside useLayoutEffect)
      // means the element appears at translateX(0) with no animation.
      setVisible(true)
    } else if (fromFeed) {
      // Double rAF ensures the initial translateX(100%) off-screen state is painted
      // before we flip to translateX(0), so the CSS transition has a "from" value.
      raf1Ref.current = requestAnimationFrame(() => {
        raf2Ref.current = requestAnimationFrame(() => {
          if (!exitingRef.current) setVisible(true)
        })
      })
    } else {
      // Direct navigation (URL bar, share link) — appear instantly.
      setVisible(true)
    }

    return () => {
      cancelAnimationFrame(raf1Ref.current)
      cancelAnimationFrame(raf2Ref.current)
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

    // Cancel any pending slide-in rAF to prevent it from overwriting the exit state
    cancelAnimationFrame(raf1Ref.current)
    cancelAnimationFrame(raf2Ref.current)

    armFeedScrollRestore()
    setExiting(true)
    setVisible(false)

    // Fallback: call router.back() if transitionend doesn't fire within 500ms
    // (e.g. reduced-motion, prefers-reduced-motion media query, animation disabled)
    backTimerRef.current = setTimeout(doBack, 500)
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
        // No willChange here: keeping this element un-promoted lets the browser
        // correctly re-capture it inside <main>'s stacking context when EdgeSwipeBack
        // applies a CSS transform to <main>. With willChange:transform, iOS Safari
        // may pre-promote this layer relative to the viewport and not re-composite it
        // when an ancestor gets a transform, causing the element to stay fixed while
        // <main> slides — leading to the black background flash.
      }}
      onTransitionEnd={(e) => {
        // Filter: only act on our own transform transition, not bubbled child events
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
