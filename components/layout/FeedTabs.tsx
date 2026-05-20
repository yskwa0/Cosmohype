'use client'
import { useRouter, useSearchParams } from 'next/navigation'

export function FeedTabs() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') ?? 'all'

  return (
    <div className="sticky top-14 z-30 flex" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border)' }}>
      {[
        { value: 'all',       label: 'みんな' },
        { value: 'following', label: 'フォロー中' },
      ].map(({ value, label }) => (
        <button
          key={value}
          onClick={() => router.push(value === 'all' ? '/feed' : '/feed?tab=following')}
          className="flex-1 py-2.5 text-sm font-medium transition-colors relative"
          style={{ color: tab === value ? 'var(--purple)' : 'var(--text-muted)' }}
        >
          {label}
          {tab === value && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
              style={{ background: 'var(--purple)' }} />
          )}
        </button>
      ))}
    </div>
  )
}
