'use client'
import { useRouter, useSearchParams } from 'next/navigation'

const TABS = [
  { value: 'recommended', label: 'おすすめ',  href: '/feed' },
  { value: 'following',   label: 'フォロー中', href: '/feed?tab=following' },
] as const

type TabValue = typeof TABS[number]['value']

export function FeedTabs() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawTab = searchParams.get('tab') ?? 'recommended'
  const tab: TabValue = TABS.some(t => t.value === rawTab) ? (rawTab as TabValue) : 'recommended'

  return (
    <div className="sticky top-14 z-30 flex select-none" style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border)', WebkitUserSelect: 'none' }}>
      {TABS.map(({ value, label, href }) => (
        <button
          key={value}
          onClick={() => router.push(href)}
          className="flex-1 py-2.5 text-xs font-medium transition-colors relative"
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
