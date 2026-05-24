'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function BackButton({ href, variant }: { href?: string; variant?: 'purple' } = {}) {
  const router = useRouter()
  const [pressed, setPressed] = useState(false)

  if (variant === 'purple') {
    return (
      <button
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        onClick={() => href ? router.replace(href) : router.back()}
        aria-label="戻る"
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'rgba(124,58,237,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          transform: pressed ? 'scale(0.82)' : 'scale(1)',
          transition: pressed
            ? 'transform 70ms ease-in'
            : 'transform 480ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#7C3AED" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
    )
  }

  return (
    <button
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onClick={() => href ? router.replace(href) : router.back()}
      className="flex items-center justify-center w-9 h-9 rounded-full"
      style={{
        color: 'var(--text)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        transform: pressed ? 'scale(0.78)' : 'scale(1)',
        transition: pressed
          ? 'transform 0.07s ease-out'
          : 'transform 0.55s cubic-bezier(0.34, 1.6, 0.64, 1)',
      }}
      aria-label="戻る"
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
    </button>
  )
}
