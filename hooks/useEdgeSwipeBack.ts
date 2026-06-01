'use client'
import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const EDGE_WIDTH = 22      // px — touch must start within this from the left edge
const SWIPE_THRESHOLD = 80 // px — minimum rightward dx to trigger back

export function useEdgeSwipeBack() {
  const router = useRouter()
  const pathname = usePathname()

  const routerRef = useRef(router)
  routerRef.current = router

  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  useEffect(() => {
    let startX = 0
    let startY = 0
    let tracking = false  // touch started in the edge zone
    let committed = false // confirmed horizontal gesture

    function getMain() {
      return document.querySelector('main') as HTMLElement | null
    }
    function getNav() {
      return document.querySelector('nav') as HTMLElement | null
    }

    function onTouchStart(e: TouchEvent) {
      // Feed page has its own horizontal swipe (FeedSlider) — skip entirely
      if (pathnameRef.current?.startsWith('/feed')) return
      const touch = e.touches[0]
      startX = touch.clientX
      startY = touch.clientY
      tracking = startX < EDGE_WIDTH
      committed = false
    }

    function onTouchMove(e: TouchEvent) {
      if (!tracking) return

      const touch = e.touches[0]
      const dx = touch.clientX - startX
      const dy = touch.clientY - startY

      // Must be moving rightward
      if (dx <= 0) {
        tracking = false
        resetMain()
        return
      }

      if (!committed) {
        // Wait for clear direction signal
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        // More vertical than horizontal → cancel (preserves ChatView scroll)
        if (Math.abs(dy) >= Math.abs(dx)) {
          tracking = false
          return
        }
        committed = true
      }

      if (committed) {
        // Take over: prevent ImageCarousel / FeedSwipeWrapper from seeing this move
        e.stopPropagation()
        const mainEl = getMain()
        if (mainEl) {
          const clampedDx = Math.min(dx, window.innerWidth * 0.8)
          mainEl.style.transition = 'none'
          mainEl.style.transform = `translateX(${clampedDx}px)`
          mainEl.style.opacity = String(Math.max(0.35, 1 - clampedDx / (window.innerWidth * 1.2)))
        }
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (!committed) {
        tracking = false
        return
      }

      // Prevent carousel / other handlers from reacting to this touchEnd
      e.stopPropagation()

      const touch = e.changedTouches[0]
      const dx = touch.clientX - startX

      tracking = false
      committed = false

      if (dx >= SWIPE_THRESHOLD) {
        triggerBack()
      } else {
        resetMain()
      }
    }

    function onTouchCancel() {
      if (committed) resetMain()
      tracking = false
      committed = false
    }

    function resetMain() {
      const mainEl = getMain()
      if (!mainEl || !mainEl.style.transform) return
      mainEl.style.transition = 'transform 280ms cubic-bezier(0.25, 1, 0.5, 1), opacity 280ms ease-out'
      mainEl.style.transform = ''
      mainEl.style.opacity = ''
      setTimeout(() => {
        if (mainEl) mainEl.style.transition = ''
      }, 290)
    }

    function triggerBack() {
      const mainEl = getMain()
      const navEl = getNav()
      const DURATION = 180
      const easing = 'cubic-bezier(0.4, 0, 0.6, 1)'

      if (mainEl) {
        mainEl.style.transition = `transform ${DURATION}ms ${easing}, opacity ${DURATION}ms ${easing}`
        mainEl.style.transform = 'translateX(100vw)'
        mainEl.style.opacity = '0'
      }
      if (navEl) {
        navEl.style.transition = `transform ${DURATION}ms ${easing}, opacity ${DURATION}ms ${easing}`
        navEl.style.transform = 'translateX(100vw)'
        navEl.style.opacity = '0'
      }

      setTimeout(() => {
        const overlay = document.createElement('div')
        overlay.style.cssText =
          'position:fixed;inset:0;z-index:9999;pointer-events:none;background:var(--bg,#090714);'
        document.body.appendChild(overlay)

        sessionStorage.setItem('skipSlideIn', '1')
        routerRef.current.back()

        function removeOverlay() {
          if (mainEl) { mainEl.style.transition = 'none'; mainEl.style.transform = ''; mainEl.style.opacity = '' }
          if (navEl)  { navEl.style.transition  = 'none'; navEl.style.transform  = ''; navEl.style.opacity  = '' }
          // Synchronous reflow: forces Safari/WebKit to recalculate sticky positions
          // (e.g. TopBar) before the overlay is removed. Without this, WebKit retains
          // a stale sticky offset from when main had a CSS transform, causing the TopBar
          // to appear displaced into the safe-area zone after back navigation.
          void mainEl?.offsetHeight
          overlay.remove()
          requestAnimationFrame(() => {
            if (mainEl) mainEl.style.transition = ''
            if (navEl)  navEl.style.transition  = ''
          })
        }

        // Wait for React to commit the new page into <main> before revealing it.
        // This prevents the old page content from briefly flashing when opacity is restored.
        let obs: MutationObserver | null = null
        const fallback = setTimeout(() => {
          obs?.disconnect()
          removeOverlay()
        }, 600)

        if (mainEl) {
          obs = new MutationObserver((mutations) => {
            if (!mutations.some(m => m.addedNodes.length > 0)) return
            obs!.disconnect()
            clearTimeout(fallback)
            requestAnimationFrame(removeOverlay)
          })
          obs.observe(mainEl, { childList: true })
        }
      }, DURATION + 8)
    }

    // Capture phase: fires before React synthetic events, allowing stopPropagation to work
    document.addEventListener('touchstart',  onTouchStart,  { capture: true, passive: true })
    document.addEventListener('touchmove',   onTouchMove,   { capture: true, passive: true })
    document.addEventListener('touchend',    onTouchEnd,    { capture: true, passive: true })
    document.addEventListener('touchcancel', onTouchCancel, { capture: true, passive: true })

    return () => {
      document.removeEventListener('touchstart',  onTouchStart,  { capture: true })
      document.removeEventListener('touchmove',   onTouchMove,   { capture: true })
      document.removeEventListener('touchend',    onTouchEnd,    { capture: true })
      document.removeEventListener('touchcancel', onTouchCancel, { capture: true })
    }
  }, []) // routerRef / pathnameRef updated each render — effect only needs to run once
}
