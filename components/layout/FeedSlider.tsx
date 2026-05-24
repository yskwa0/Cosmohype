'use client'

import { useEffect, useLayoutEffect, useRef, useState, useTransition, type ReactNode } from 'react'
import { readFeedScroll, clearFeedScroll } from '@/lib/feedScrollStore'
import { useRouter } from 'next/navigation'

const TABS = [
  { value: 'recommended' as const, label: 'おすすめ',  href: '/feed' },
  { value: 'following'   as const, label: 'フォロー中', href: '/feed?tab=following' },
]
type TabValue = typeof TABS[number]['value']
const PANEL_COUNT = 3
const TAB_H = 44
const INDICATOR_H = 48
const PULL_THRESHOLD = 60
// Hyperbolic elastic max: f(x) = x*K/(x+K) — continuously increasing resistance,
// reaches PULL_THRESHOLD at ~100px of finger travel, asymptotes ~K beyond that.
const ELASTIC_K = 150

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
  const [isPending, startRefresh] = useTransition()

  const initIdx = initialTab === 'following' ? 1 : 0
  const [activeIdx, setActiveIdx] = useState(initIdx)

  const activeIdxRef = useRef(initIdx)
  const innerRef = useRef<HTMLDivElement>(null)
  const tabBarRef = useRef<HTMLDivElement>(null)
  const pullIndicatorRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const isHoriz = useRef<boolean | null>(null)

  const scrollPositions = useRef<number[]>([0, 0, 0])
  const p0 = useRef<HTMLDivElement>(null)
  const p1 = useRef<HTMLDivElement>(null)
  const p2 = useRef<HTMLDivElement>(null)

  const tabIsVisible = useRef(true)
  const lastScrollTopRef = useRef(0)
  const scrollDeltaRef = useRef(0)

  const pullStartY = useRef(0)
  const pullOffset = useRef(0)
  const isPullingRef = useRef(false)
  const isRefreshing = useRef(false)
  const refreshingPanelRef = useRef<HTMLDivElement | null>(null)

  // Animate panel back and hide indicator when router.refresh() completes
  useEffect(() => {
    if (!isPending && isRefreshing.current) {
      isRefreshing.current = false
      isPullingRef.current = false
      pullOffset.current = 0
      const panel = refreshingPanelRef.current
      if (panel) {
        panel.style.transition = 'transform 480ms cubic-bezier(0.28, 1.8, 0.52, 1)'
        panel.style.transform = 'translateY(0)'
        refreshingPanelRef.current = null
      }
      const ind = pullIndicatorRef.current
      if (ind) {
        ind.style.transition = 'transform 380ms cubic-bezier(0.4, 0, 0.6, 1), opacity 300ms ease-out'
        ind.style.transform = `translateY(-${INDICATOR_H}px)`
        ind.style.opacity = '0'
      }
    }
  }, [isPending])

  function getActivePanel() {
    return [p0.current, p1.current, p2.current][activeIdxRef.current] ?? null
  }

  function applyPullOffset(offset: number) {
    const panel = getActivePanel()
    if (panel) {
      panel.style.transition = 'none'
      panel.style.transform = `translateY(${offset}px)`
    }
    const ind = pullIndicatorRef.current
    if (ind) {
      ind.style.transition = 'none'
      ind.style.transform = `translateY(${offset - INDICATOR_H}px)`
      // Ease-in opacity: invisible at start, smooth emergence as pull approaches threshold
      const p = Math.min(offset / PULL_THRESHOLD, 1)
      ind.style.opacity = String(p * p)
    }
  }

  function resetPull(animated: boolean) {
    const panel = getActivePanel()
    if (panel) {
      // Spring with visible overshoot — content briefly rises past resting position,
      // creating the "biyo-n" rubber-band snap-back sensation.
      panel.style.transition = animated
        ? 'transform 480ms cubic-bezier(0.28, 1.8, 0.52, 1)'
        : 'none'
      panel.style.transform = 'translateY(0)'
    }
    const ind = pullIndicatorRef.current
    if (ind) {
      ind.style.transition = animated
        ? 'transform 400ms cubic-bezier(0.25, 1, 0.5, 1), opacity 300ms ease-out'
        : 'none'
      ind.style.transform = `translateY(-${INDICATOR_H}px)`
      ind.style.opacity = '0'
    }
  }

  function triggerRefresh() {
    isRefreshing.current = true
    const panel = getActivePanel()
    refreshingPanelRef.current = panel
    if (panel) {
      panel.style.transition = 'transform 320ms cubic-bezier(0.25, 1, 0.5, 1)'
      panel.style.transform = `translateY(${INDICATOR_H}px)`
    }
    const ind = pullIndicatorRef.current
    if (ind) {
      ind.style.transition = 'transform 320ms cubic-bezier(0.25, 1, 0.5, 1), opacity 200ms ease-out'
      ind.style.transform = 'translateY(0)'
      ind.style.opacity = '1'
    }
    startRefresh(() => { router.refresh() })
  }

  function setTabVisible(visible: boolean) {
    tabIsVisible.current = visible
    const el = tabBarRef.current
    if (!el) return
    // Show: gentle spring overshoot so the bar feels "alive" as it appears
    // Hide: accelerating ease-in so it snaps away quickly and naturally
    el.style.transition = visible
      ? 'transform 280ms cubic-bezier(0.22, 1.2, 0.36, 1)'
      : 'transform 200ms cubic-bezier(0.4, 0, 1, 1)'
    el.style.transform = visible ? 'translateY(0)' : `translateY(-${TAB_H}px)`
    el.style.pointerEvents = visible ? '' : 'none'
  }

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
    if (panels[prev]) scrollPositions.current[prev] = panels[prev]!.scrollTop
    if (panels[idx]) panels[idx]!.scrollTop = scrollPositions.current[idx]
    setTransform(idx, 0, true)
    activeIdxRef.current = idx
    setActiveIdx(idx)
    if (idx < TABS.length) {
      router.replace(TABS[idx].href, { scroll: false })
    }
    lastScrollTopRef.current = scrollPositions.current[idx]
    scrollDeltaRef.current = 0
    setTabVisible(idx < TABS.length)
  }

  const goToRef = useRef(goTo)
  goToRef.current = goTo

  useEffect(() => {
    const handler = () => goToRef.current(2)
    window.addEventListener('cosmo:go-to-dm', handler)
    return () => window.removeEventListener('cosmo:go-to-dm', handler)
  }, [])

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

  useLayoutEffect(() => {
    function signalReady() {
      window.dispatchEvent(new Event('cosmohype:feed-ready'))
    }

    function applyRestore() {
      const restore = readFeedScroll()
      if (!restore) return

      const { scrollTop: target, panelIdx } = restore

      if (panelIdx !== activeIdxRef.current) {
        setTransform(panelIdx, 0, false)
        activeIdxRef.current = panelIdx
        setActiveIdx(panelIdx)
        setTabVisible(panelIdx < TABS.length)
      }

      if (target === 0) { clearFeedScroll(); signalReady(); return }

      let cancelled = false
      const attempt = () => {
        if (cancelled) return
        const panel = [p0.current, p1.current][panelIdx]
        if (!panel) { requestAnimationFrame(attempt); return }
        panel.scrollTop = target
        if (Math.abs(panel.scrollTop - target) > 5) {
          requestAnimationFrame(attempt)
        } else {
          clearFeedScroll()
          scrollPositions.current[panelIdx] = panel.scrollTop
          signalReady()
        }
      }
      attempt()
      const tid = setTimeout(() => { cancelled = true; clearFeedScroll(); signalReady() }, 2000)
      return () => { cancelled = true; clearTimeout(tid) }
    }

    const cleanup = applyRestore()

    const onPopState = () => {
      applyRestore()
    }
    window.addEventListener('popstate', onPopState)

    return () => {
      cleanup?.()
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  function handlePanelScroll(e: React.UIEvent<HTMLDivElement>) {
    if (activeIdxRef.current >= TABS.length) return
    const el = e.currentTarget
    const scrollTop = el.scrollTop
    const dy = scrollTop - lastScrollTopRef.current
    lastScrollTopRef.current = scrollTop
    if (scrollTop < TAB_H / 2) {
      scrollDeltaRef.current = 0
      if (!tabIsVisible.current) setTabVisible(true)
      return
    }
    scrollDeltaRef.current += dy
    if (scrollDeltaRef.current > 30) {
      if (tabIsVisible.current) setTabVisible(false)
      scrollDeltaRef.current = 0
    } else if (scrollDeltaRef.current < -15) {
      if (!tabIsVisible.current) setTabVisible(true)
      scrollDeltaRef.current = 0
    }
  }

  const topBarH = 'calc(3.5rem + env(safe-area-inset-top, 0px))'
  const indicatorIdx = activeIdx < TABS.length ? activeIdx : TABS.length - 1

  return (
    <div
      className="relative overflow-hidden"
      style={{ height: `calc(100svh - ${topBarH})` }}
    >
      {/* Tab bar */}
      <div
        ref={tabBarRef}
        className="absolute inset-x-0 top-0 z-10 flex"
        style={{
          height: TAB_H,
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {TABS.map(({ value, label }, i) => (
          <button
            key={value}
            onClick={() => goToRef.current(i)}
            className="flex-1 py-2.5 text-xs font-medium transition-colors"
            style={{ color: activeIdx === i ? 'var(--purple)' : 'var(--text-muted)' }}
          >
            {label}
          </button>
        ))}
        <span
          className="absolute bottom-0 w-8 h-0.5 rounded-full pointer-events-none"
          style={{
            background: 'var(--purple)',
            left: `calc(${indicatorIdx * 50}% + 25% - 1rem)`,
            transition: 'left 300ms cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        />
      </div>

      {/* Pull-to-refresh indicator */}
      <div
        ref={pullIndicatorRef}
        className="absolute inset-x-0 flex items-center justify-center pointer-events-none"
        style={{
          top: TAB_H,
          height: INDICATOR_H,
          zIndex: 9,
          opacity: 0,
          transform: `translateY(-${INDICATOR_H}px)`,
        }}
      >
        <svg
          className="animate-spin"
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
        >
          <circle cx="11" cy="11" r="9" stroke="var(--border)" strokeWidth="2" />
          <path
            d="M11 2a9 9 0 019 9"
            stroke="var(--purple)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* 3-panel slider */}
      <div
        className="overflow-hidden"
        style={{ height: '100%', touchAction: 'pan-y' }}
        onTouchStart={e => {
          startX.current = e.touches[0].clientX
          startY.current = e.touches[0].clientY
          pullStartY.current = e.touches[0].clientY
          isHoriz.current = null
          isPullingRef.current = false
        }}
        onTouchMove={e => {
          const dx = e.touches[0].clientX - startX.current
          const dy = e.touches[0].clientY - startY.current

          if (isHoriz.current === null) {
            if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
            isHoriz.current = Math.abs(dx) > Math.abs(dy)
          }

          if (isHoriz.current) {
            if (isPullingRef.current) {
              isPullingRef.current = false
              pullOffset.current = 0
              resetPull(false)
            }
            const idx = activeIdxRef.current
            const atEdge = (dx > 0 && idx <= 0) || (dx < 0 && idx >= PANEL_COUNT - 1)
            setTransform(idx, atEdge ? dx * 0.12 : dx, false)
            return
          }

          // Vertical: pull-to-refresh on feed panels when at top
          if (!isRefreshing.current && activeIdxRef.current < TABS.length) {
            const panel = getActivePanel()
            if (panel && panel.scrollTop === 0) {
              const pullDy = e.touches[0].clientY - pullStartY.current
              if (pullDy > 0) {
                isPullingRef.current = true
                // Hyperbolic rubber-band: f(x)=x*K/(x+K)
                // — no hard cap, resistance grows continuously, feels like stretched elastic
                const offset = pullDy * ELASTIC_K / (pullDy + ELASTIC_K)
                pullOffset.current = offset
                applyPullOffset(offset)
              }
            }
          }
        }}
        onTouchEnd={e => {
          if (isPullingRef.current) {
            if (pullOffset.current >= PULL_THRESHOLD) {
              triggerRefresh()
            } else {
              resetPull(true)
              isPullingRef.current = false
              pullOffset.current = 0
            }
            return
          }

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
          goToRef.current(next)
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
          <div
            ref={p0}
            data-feed-panel="0"
            className="shrink-0 overflow-y-auto"
            style={{
              width: `${100 / PANEL_COUNT}%`,
              height: '100%',
              overscrollBehavior: 'none',
              paddingTop: TAB_H,
              paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
            }}
            onScroll={handlePanelScroll}
          >
            {recommended}
          </div>
          <div
            ref={p1}
            data-feed-panel="1"
            className="shrink-0 overflow-y-auto"
            style={{
              width: `${100 / PANEL_COUNT}%`,
              height: '100%',
              overscrollBehavior: 'none',
              paddingTop: TAB_H,
              paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
            }}
            onScroll={handlePanelScroll}
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
            onScroll={handlePanelScroll}
          >
            {dm}
          </div>
        </div>
      </div>
    </div>
  )
}
