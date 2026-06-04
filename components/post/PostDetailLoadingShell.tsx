'use client'
import { useEffect } from 'react'

// Wraps the post detail loading.tsx content in the same fixed overlay as PostDetailSlide.
// Sets a sessionStorage flag so PostDetailSlide knows to skip its slide-in animation
// (the shell already holds the position at translateX(0)).
export function PostDetailLoadingShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (sessionStorage.getItem('post_slide_from_feed') === '1') {
      sessionStorage.setItem('post_slide_in_progress', '1')
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'var(--bg)',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {children}
    </div>
  )
}
