'use client'
import { useLayoutEffect, useRef } from 'react'

// Animates <main> sliding in from the right on mount.
// Mirrors BackButton's slide-out exit animation for a consistent push/pop feel.
export function SlideIn({ children }: { children: React.ReactNode }) {
  const animRef = useRef<Animation | null>(null)

  useLayoutEffect(() => {
    const mainEl = document.querySelector('main') as HTMLElement | null
    if (!mainEl) return

    animRef.current = mainEl.animate(
      [
        { transform: 'translateX(100%)', opacity: 0 },
        { transform: 'translateX(0)',    opacity: 1 },
      ],
      {
        duration: 300,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        fill: 'both',
      }
    )

    return () => {
      animRef.current?.cancel()
    }
  }, [])

  return <>{children}</>
}
