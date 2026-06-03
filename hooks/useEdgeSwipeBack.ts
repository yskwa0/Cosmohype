'use client'
import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const EDGE_WIDTH = 22       // px — touch must start within this from the left edge
const SWIPE_THRESHOLD = 80  // px — minimum rightward dx to trigger back
const PARALLAX_START = 24   // px — bg layer starts at translateX(-24px) and moves toward 0

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
    let bgLayer: HTMLDivElement | null = null

    function getMain() {
      return document.querySelector('main') as HTMLElement | null
    }

    function createBgLayer() {
      const el = document.createElement('div')
      el.style.cssText =
        `position:fixed;inset:0;z-index:9;background:var(--bg,#090714);` +
        `transform:translateX(-${PARALLAX_START}px);pointer-events:none;will-change:transform;overflow:hidden;`

      // Pseudo TopBar
      const topBar = document.createElement('div')
      topBar.style.cssText =
        `position:absolute;top:0;left:0;right:0;box-sizing:border-box;` +
        `height:calc(env(safe-area-inset-top,0px) + 44px);` +
        `background:var(--bg-elevated,#100D22);` +
        `border-bottom:1px solid rgba(168,85,247,0.15);` +
        `display:flex;align-items:flex-end;padding:0 16px 10px;gap:10px;`
      const backCircle = document.createElement('div')
      backCircle.style.cssText =
        `width:36px;height:36px;flex-shrink:0;border-radius:50%;background:rgba(124,58,237,0.14);`
      const titlePill = document.createElement('div')
      titlePill.style.cssText =
        `height:12px;width:80px;border-radius:6px;background:rgba(245,243,255,0.1);`
      topBar.appendChild(backCircle)
      topBar.appendChild(titlePill)
      el.appendChild(topBar)

      // Pseudo BottomNav
      const bottomNav = document.createElement('div')
      bottomNav.style.cssText =
        `position:absolute;bottom:0;left:0;right:0;box-sizing:border-box;` +
        `height:calc(env(safe-area-inset-bottom,0px) + 58px);` +
        `background:var(--nav-bg,rgba(9,7,20,0.9));` +
        `border-top:1px solid rgba(168,85,247,0.12);` +
        `display:flex;align-items:flex-start;justify-content:space-around;padding:14px 28px 0;`
      for (let i = 0; i < 5; i++) {
        const icon = document.createElement('div')
        if (i === 2) {
          icon.style.cssText =
            `width:40px;height:40px;border-radius:12px;margin-top:-8px;background:rgba(124,58,237,0.2);`
        } else {
          icon.style.cssText =
            `width:22px;height:22px;border-radius:4px;background:rgba(245,243,255,0.08);`
        }
        bottomNav.appendChild(icon)
      }
      el.appendChild(bottomNav)

      document.body.appendChild(el)
      return el
    }

    function removeBgLayer() {
      bgLayer?.remove()
      bgLayer = null
    }

    function onTouchStart(e: TouchEvent) {
      // Feed page has its own horizontal swipe (FeedSlider) — skip entirely
      if (pathnameRef.current?.startsWith('/feed')) return
      removeBgLayer() // safety: clean up any orphaned layer from a previous gesture
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
        removeBgLayer() // defensive: remove any stale layer before creating a new one
        bgLayer = createBgLayer()
      }

      if (committed) {
        // Take over: prevent ImageCarousel / FeedSwipeWrapper from seeing this move
        e.stopPropagation()
        const mainEl = getMain()
        const clampedDx = Math.min(dx, window.innerWidth * 0.8)
        const ratio = clampedDx / (window.innerWidth * 0.8)

        if (mainEl) {
          mainEl.style.transition = 'none'
          mainEl.style.transform = `translateX(${clampedDx}px)`
          // No opacity dimming — keep current page at full opacity while dragging
        }

        if (bgLayer) {
          const parallaxX = -PARALLAX_START * (1 - ratio)
          bgLayer.style.transition = 'none'
          bgLayer.style.transform = `translateX(${parallaxX}px)`
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
      else removeBgLayer()
      tracking = false
      committed = false
    }

    function resetMain() {
      const mainEl = getMain()
      if (!mainEl || !mainEl.style.transform) {
        removeBgLayer()
        return
      }

      const SPRING = 'transform 280ms cubic-bezier(0.25, 1, 0.5, 1)'
      mainEl.style.transition = SPRING
      mainEl.style.transform = ''
      mainEl.style.opacity = ''

      if (bgLayer) {
        bgLayer.style.transition = SPRING
        bgLayer.style.transform = `translateX(-${PARALLAX_START}px)`
      }

      setTimeout(() => {
        if (mainEl) mainEl.style.transition = ''
        removeBgLayer()
      }, 290)
    }

    function triggerBack() {
      const mainEl = getMain()
      const DURATION = 180
      const easing = 'cubic-bezier(0.4, 0, 0.6, 1)'

      if (mainEl) {
        mainEl.style.transition = `transform ${DURATION}ms ${easing}, opacity ${DURATION}ms ${easing}`
        mainEl.style.transform = 'translateX(100vw)'
        mainEl.style.opacity = '0'
      }

      // Animate bg layer to translateX(0) as the current page slides away
      if (bgLayer) {
        bgLayer.style.transition = `transform ${DURATION}ms ${easing}`
        bgLayer.style.transform = 'translateX(0px)'
      }

      setTimeout(() => {
        removeBgLayer() // overlay takes over — bg layer no longer needed

        const overlay = document.createElement('div')
        overlay.style.cssText =
          'position:fixed;inset:0;z-index:9999;pointer-events:none;background:var(--bg,#090714);'
        document.body.appendChild(overlay)

        sessionStorage.setItem('skipSlideIn', '1')
        routerRef.current.back()

        function removeOverlay() {
          if (mainEl) { mainEl.style.transition = 'none'; mainEl.style.transform = ''; mainEl.style.opacity = '' }
          // Synchronous reflow: forces Safari/WebKit to recalculate sticky positions
          // (e.g. TopBar) before the overlay is removed. Without this, WebKit retains
          // a stale sticky offset from when main had a CSS transform, causing the TopBar
          // to appear displaced into the safe-area zone after back navigation.
          void mainEl?.offsetHeight
          overlay.remove()
          requestAnimationFrame(() => {
            if (mainEl) mainEl.style.transition = ''
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
