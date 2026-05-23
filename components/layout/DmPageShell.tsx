'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

// Adds right-swipe-back gesture to the DM page when navigated via the DM icon.
export function DmPageShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const startX = useRef(0)
  const startY = useRef(0)
  const isHoriz = useRef<boolean | null>(null)
  const navigating = useRef(false)

  return (
    <div
      style={{ touchAction: 'pan-y' }}
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
