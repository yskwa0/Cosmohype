'use client'
import { useRouter } from 'next/navigation'
import { useRef, type ReactNode } from 'react'

const TAB_ORDER = ['recommended', 'following'] as const

type CurrentTab = typeof TAB_ORDER[number]

function tabHref(tab: CurrentTab): string {
  return tab === 'recommended' ? '/feed' : '/feed?tab=following'
}

export function FeedSwipeWrapper({ currentTab, children }: { currentTab: CurrentTab; children: ReactNode }) {
  const router = useRouter()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const isHoriz = useRef(false)

  const idx = TAB_ORDER.indexOf(currentTab)

  function applyTransform(x: number, animated: boolean) {
    const el = wrapperRef.current
    if (!el) return
    el.style.transition = animated ? 'transform 180ms ease-out' : 'none'
    el.style.transform = x ? `translateX(${x}px)` : ''
  }

  return (
    <div
      ref={wrapperRef}
      onTouchStart={e => {
        startX.current = e.touches[0].clientX
        startY.current = e.touches[0].clientY
        isHoriz.current = false
        applyTransform(0, false)
      }}
      onTouchMove={e => {
        const dx = e.touches[0].clientX - startX.current
        const dy = e.touches[0].clientY - startY.current

        if (!isHoriz.current) {
          if (Math.abs(dx) < 8) return
          if (Math.abs(dy) >= Math.abs(dx)) return
          isHoriz.current = true
        }

        const blocked = (dx < 0 && idx >= TAB_ORDER.length - 1) || (dx > 0 && idx <= 0)
        if (blocked) return

        applyTransform(dx * 0.35, false)
      }}
      onTouchEnd={e => {
        const dx = e.changedTouches[0].clientX - startX.current
        const dy = e.changedTouches[0].clientY - startY.current

        applyTransform(0, true)

        if (!isHoriz.current || Math.abs(dx) < 50 || Math.abs(dy) >= Math.abs(dx)) return

        const nextIdx = dx < 0
          ? Math.min(idx + 1, TAB_ORDER.length - 1)
          : Math.max(idx - 1, 0)

        if (nextIdx !== idx) router.push(tabHref(TAB_ORDER[nextIdx]))
      }}
    >
      {children}
    </div>
  )
}
