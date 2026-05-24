'use client'

import { useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

const SCROLL_KEY = 'dm_list_scroll'

// Adds right-swipe-back gesture to the DM page when navigated via the DM icon.
export function DmPageShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const startX = useRef(0)
  const startY = useRef(0)
  const isHoriz = useRef<boolean | null>(null)
  const navigating = useRef(false)

  // 戻り時: 保存済みのスクロール位置を復元
  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY)
    if (saved !== null) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: Number(saved), behavior: 'instant' })
      })
      sessionStorage.removeItem(SCROLL_KEY)
    }
  }, [])

  return (
    <div
      style={{ touchAction: 'pan-y' }}
      onClick={() => {
        // 会話を開く前にスクロール位置を保存
        sessionStorage.setItem(SCROLL_KEY, String(window.scrollY))
      }}
      onTouchStart={e => {
        if (navigating.current) return
        startX.current = e.touches[0].clientX
        startY.current = e.touches[0].clientY
        isHoriz.current = null
      }}
      onTouchMove={e => {
        if (navigating.current) return
        const dx = e.touches[0].clientX - startX.current
        const dy = e.touches[0].clientY - startY.current
        if (isHoriz.current === null) {
          if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
          isHoriz.current = Math.abs(dx) > Math.abs(dy)
        }
      }}
      onTouchEnd={e => {
        if (navigating.current) return
        const dx = e.changedTouches[0].clientX - startX.current
        const dy = e.changedTouches[0].clientY - startY.current
        if (!isHoriz.current || dx < 60 || Math.abs(dy) >= Math.abs(dx)) return
        navigating.current = true
        router.back()
      }}
    >
      {children}
    </div>
  )
}
