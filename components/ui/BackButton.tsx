'use client'
import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'

export function BackButton({
  href,
  variant,
}: { href?: string; variant?: 'purple' } = {}) {
  const router = useRouter()
  const [pressed, setPressed] = useState(false)
  const animatingRef = useRef(false)

  async function handleBack() {
    if (animatingRef.current) return
    animatingRef.current = true

    const mainEl = document.querySelector('main') as HTMLElement | null
    const navEl  = document.querySelector('nav')  as HTMLElement | null

    const DURATION = 150
    const easing   = 'cubic-bezier(0.4, 0, 0.6, 1)'

    if (mainEl) {
      mainEl.style.transition = `transform ${DURATION}ms ${easing}, opacity ${DURATION}ms ${easing}`
      mainEl.style.transform  = 'translateX(100vw)'
      mainEl.style.opacity    = '0'
    }
    if (navEl) {
      navEl.style.transition = `transform ${DURATION}ms ${easing}, opacity ${DURATION}ms ${easing}`
      navEl.style.transform  = 'translateX(100vw)'
      navEl.style.opacity    = '0'
    }

    await new Promise(r => setTimeout(r, DURATION + 8))

    // Insert a solid overlay BEFORE navigation so the style reset is never visible.
    // The overlay matches the app background and is removed after React renders the new page.
    const overlay = document.createElement('div')
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:9999;pointer-events:none;background:var(--bg, #090714);'
    document.body.appendChild(overlay)

    // Signal SlideIn to skip its enter animation on the next mount.
    sessionStorage.setItem('skipSlideIn', '1')

    href ? router.replace(href) : router.back()

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        // Disable transition first so the transform reset is instant (no slide-back).
        if (mainEl) { mainEl.style.transition = 'none'; mainEl.style.transform = '' }
        if (navEl)  { navEl.style.transition  = 'none'; navEl.style.transform  = '' }

        setTimeout(() => {
          if (mainEl) { mainEl.style.opacity = ''; mainEl.style.transition = '' }
          if (navEl)  { navEl.style.opacity  = ''; navEl.style.transition  = '' }
          overlay.remove()
          animatingRef.current = false
        }, 60)
      })
    )
  }

  if (variant === 'purple') {
    return (
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
          WebkitUserSelect: 'none',
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

  return (
    <button
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onClick={handleBack}
      className="flex items-center justify-center w-9 h-9 rounded-full"
      style={{
        color: 'var(--text)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        transform: pressed ? 'scale(0.78)' : 'scale(1)',
        transition: pressed
          ? 'transform 0.07s ease-out'
          : 'transform 0.55s cubic-bezier(0.34, 1.6, 0.64, 1)',
      }}
      aria-label="戻る"
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
    </button>
  )
}
