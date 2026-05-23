'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'

const TABS = [
  { value: 'recommended' as const, label: 'おすすめ',  href: '/feed' },
  { value: 'following'   as const, label: 'フォロー中', href: '/feed?tab=following' },
]
type TabValue = typeof TABS[number]['value']
const PANEL_COUNT = 3  // recommended | following | DM

function pct(idx: number) { return idx * (-100 / PANEL_COUNT) }

export function FeedSlider({
  initialTab,
  recommended,
  following,
  dm,
}: {
  initialTab: TabValue
  recommended: ReactNode
  following: ReactNode
  dm: ReactNode
}) {
  const router = useRouter()

  const initIdx = initialTab === 'following' ? 1 : 0
  const [activeIdx, setActiveIdx] = useState(initIdx)

  const activeIdxRef = useRef(initIdx)
  const innerRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const isHoriz = useRef<boolean | null>(null)

  // Per-panel scroll positions (restored when switching back)
  const scrollPositions = useRef<number[]>([0, 0, 0])
  // Refs to each panel's individual scroll container
  const p0 = useRef<HTMLDivElement>(null)
  const p1 = useRef<HTMLDivElement>(null)
  const p2 = useRef<HTMLDivElement>(null)

  function setTransform(idx: number, offsetPx: number, animated: boolean) {
    const el = innerRef.current
    if (!el) return
    el.style.transition = animated ? 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1)' : 'none'
    el.style.transform = offsetPx === 0
      ? `translateX(${pct(idx)}%)`
      : `translateX(calc(${pct(idx)}% + ${offsetPx}px))`
  }

  function goTo(idx: number) {
    const prev = activeIdxRef.current
    const panels = [p0.current, p1.current, p2.current]

    // Save scrollTop of the panel we're leaving
    if (panels[prev]) scrollPositions.current[prev] = panels[prev]!.scrollTop
    // Restore scrollTop of the panel we're entering (0 on first visit)
    if (panels[idx]) panels[idx]!.scrollTop = scrollPositions.current[idx]

    setTransform(idx, 0, true)
    activeIdxRef.current = idx
    setActiveIdx(idx)
    if (idx < TABS.length) {
      router.replace(TABS[idx].href, { scroll: false })
    }
  }

  const goToRef = useRef(goTo)
  goToRef.current = goTo

  useEffect(() => {
    const handler = () => goToRef.current(2)
    window.addEventListener('cosmo:go-to-dm', handler)
    return () => window.removeEventListener('cosmo:go-to-dm', handler)
  }, [])

  // Prevent body/window scroll so each panel owns its own scrollTop
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [])

  const tabActiveIdx = activeIdx < TABS.length ? activeIdx : -1
  const isDm = activeIdx >= TABS.length

  // TopBar height = h-14 (3.5rem) + env(safe-area-inset-top)
  const topBarH = 'calc(3.5rem + env(safe-area-inset-top, 0px))'

  return (
    <div
      className="flex flex-col"
      style={{ height: `calc(100svh - ${topBarH})` }}
    >
      {/* Tab bar — collapses when DM panel is active */}
      <div
        className="relative flex shrink-0 overflow-hidden z-30"
        style={{
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(16px)',
          borderBottom: isDm ? 'none' : '1px solid var(--border)',
          maxHeight: isDm ? 0 : '44px',
          opacity: isDm ? 0 : 1,
          pointerEvents: isDm ? 'none' : undefined,
          transition: 'max-height 300ms cubic-bezier(0.25, 1, 0.5, 1), opacity 250ms',
        }}
      >
        {TABS.map(({ value, label }, i) => (
          <button
            key={value}
            onClick={() => goTo(i)}
            className="flex-1 py-2.5 text-xs font-medium transition-colors"
            style={{ color: tabActiveIdx === i ? 'var(--purple)' : 'var(--text-muted)' }}
          >
            {label}
          </button>
        ))}
        <span
          className="absolute bottom-0 w-8 h-0.5 rounded-full pointer-events-none"
          style={{
            background: 'var(--purple)',
            left: `calc(${(tabActiveIdx >= 0 ? tabActiveIdx : TABS.length - 1) * 50}% + 25% - 1rem)`,
            opacity: tabActiveIdx >= 0 ? 1 : 0,
            transition: 'left 300ms cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        />
      </div>

      {/* 3-panel slider — flex-1 fills remaining height after tab bar */}
      <div
        className="overflow-hidden flex-1 min-h-0"
        style={{ touchAction: 'pan-y' }}
        onTouchStart={e => {
          startX.current = e.touches[0].clientX
          startY.current = e.touches[0].clientY
          isHoriz.current = null
        }}
        onTouchMove={e => {
          const dx = e.touches[0].clientX - startX.current
          const dy = e.touches[0].clientY - startY.current

          if (isHoriz.current === null) {
            if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
            isHoriz.current = Math.abs(dx) > Math.abs(dy)
          }
          if (!isHoriz.current) return

          const idx = activeIdxRef.current
          const atEdge = (dx > 0 && idx <= 0) || (dx < 0 && idx >= PANEL_COUNT - 1)

          setTransform(idx, atEdge ? dx * 0.12 : dx, false)
        }}
        onTouchEnd={e => {
          const dx = e.changedTouches[0].clientX - startX.current
          const dy = e.changedTouches[0].clientY - startY.current
          const idx = activeIdxRef.current

          if (!isHoriz.current || Math.abs(dx) < 60 || Math.abs(dy) >= Math.abs(dx)) {
            setTransform(idx, 0, true)
            return
          }

          const next = dx < 0
            ? Math.min(idx + 1, PANEL_COUNT - 1)
            : Math.max(idx - 1, 0)
          goTo(next)
        }}
      >
        <div
          ref={innerRef}
          className="flex h-full"
          style={{
            width: '300%',
            transform: `translateX(${pct(activeIdx)}%)`,
            willChange: 'transform',
          }}
        >
          {/* Each panel is its own scroll container */}
          <div
            ref={p0}
            className="shrink-0 overflow-y-auto"
            style={{
              width: `${100 / PANEL_COUNT}%`,
              height: '100%',
              overscrollBehavior: 'none',
              paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
            }}
          >
            {recommended}
          </div>
          <div
            ref={p1}
            className="shrink-0 overflow-y-auto"
            style={{
              width: `${100 / PANEL_COUNT}%`,
              height: '100%',
              overscrollBehavior: 'none',
              paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
            }}
          >
            {following}
          </div>
          <div
            ref={p2}
            className="shrink-0 overflow-y-auto"
            style={{
              width: `${100 / PANEL_COUNT}%`,
              height: '100%',
              overscrollBehavior: 'none',
              paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
            }}
          >
            {dm}
          </div>
        </div>
      </div>
    </div>
  )
}
