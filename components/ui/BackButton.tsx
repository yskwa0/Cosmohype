'use client'
import { useRouter } from 'next/navigation'

export function BackButton({ href }: { href?: string } = {}) {
  const router = useRouter()
  return (
    <button
      onClick={() => href ? router.replace(href) : router.back()}
      className="flex items-center justify-center w-9 h-9 rounded-full transition-transform duration-75 active:scale-90"
      style={{ color: 'var(--text)' }}
      aria-label="戻る"
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
    </button>
  )
}
