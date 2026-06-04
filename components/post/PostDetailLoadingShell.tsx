'use client'
import { useEffect } from 'react'

// Wraps the post detail loading.tsx content in a normal-flow container.
// Keeps the same sessionStorage flag so PostDetailSlide can detect whether
// to run the slide-in animation (post_slide_in_progress is no longer needed
// since loading.tsx now shares normal flow with PostDetailSlide).
export function PostDetailLoadingShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // No-op: post_slide_in_progress coordination removed since PostDetailSlide
    // no longer needs to skip animation in a separate overlay.
  }, [])

  return (
    <div style={{ minHeight: '100dvh' }}>
      {children}
    </div>
  )
}
