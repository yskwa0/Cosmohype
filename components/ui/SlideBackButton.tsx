'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export function SlideBackButton({ 'aria-label': ariaLabel = '戻る' }: { 'aria-label'?: string }) {
  const router = useRouter()
  const [pressed, setPressed] = useState(false)
  const calledRef = useRef(false)

  function handleClick() {
    if (calledRef.current) return
    calledRef.current = true

    const DURATION = 180
    const mainEl = document.querySelector('main') as HTMLElement | null

    if (mainEl) {
      mainEl.style.transition = `transform ${DURATION}ms cubic-bezier(0.4, 0, 0.6, 1)`
      mainEl.style.transform = 'translateX(100vw)'
    }

    setTimeout(() => {
      router.back()

      function restoreMain() {
        if (!mainEl) return
        mainEl.style.transition = 'none'
        mainEl.style.transform = ''
        void mainEl.offsetHeight
        requestAnimationFrame(() => { mainEl.style.transition = '' })
      }

      if (!mainEl) return

      let obs: MutationObserver | null = null
      const fallback = setTimeout(() => { obs?.disconnect(); restoreMain() }, 600)

      obs = new MutationObserver((mutations) => {
        if (!mutations.some(m => m.addedNodes.length > 0)) return
        obs!.disconnect()
        clearTimeout(fallback)
        requestAnimationFrame(restoreMain)
      })
      obs.observe(mainEl, { childList: true })
    }, DURATION + 8)
  }

  return (
    <button
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onClick={handleClick}
      aria-label={ariaLabel}
      style={{
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: 'rgba(124,58,237,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
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
}
