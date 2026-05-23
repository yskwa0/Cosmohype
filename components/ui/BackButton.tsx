'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function BackButton({ href }: { href?: string } = {}) {
  const router = useRouter()
  const [pressed, setPressed] = useState(false)

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
