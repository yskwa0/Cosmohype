'use client'
import { useEffect, useRef } from 'react'

export function NavigationCover() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null

    function show() {
      const el = ref.current
      if (!el) return
      if (timer) { clearTimeout(timer); timer = null }
      el.style.transition = 'none'
      el.style.opacity = '1'
      el.style.pointerEvents = 'auto'
      // Safety fallback: hide after 800ms if feed-ready never fires
      timer = setTimeout(hide, 800)
    }

    function hide() {
      const el = ref.current
      if (!el) return
      if (timer) { clearTimeout(timer); timer = null }
      el.style.transition = 'opacity 120ms ease-out'
      el.style.opacity = '0'
      setTimeout(() => {
        if (ref.current) ref.current.style.pointerEvents = 'none'
      }, 130)
    }

    window.addEventListener('cosmohype:cover-show', show)
    window.addEventListener('cosmohype:feed-ready', hide)
    return () => {
      window.removeEventListener('cosmohype:cover-show', show)
      window.removeEventListener('cosmohype:feed-ready', hide)
      if (timer) clearTimeout(timer)
    }
  }, [])

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99,
        background: 'var(--bg)',
        opacity: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
