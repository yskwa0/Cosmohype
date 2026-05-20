'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useSearchHistory } from '@/hooks/useSearchHistory'

export function SearchInput({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)
  const { add } = useSearchHistory()
  useEffect(() => {
    const timer = setTimeout(() => {
      if (value.trim()) {
        router.push(`/search?q=${encodeURIComponent(value.trim())}`)
      } else {
        router.push('/search')
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [value, router])


  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg viewBox="0 0 24 24" className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && value.trim()) add(value.trim()) }}
        placeholder="ユーザー・タグを検索"
        autoComplete="off"
        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
        style={{
          background: 'var(--input-bg)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
        }}
      />
    </div>
  )
}
