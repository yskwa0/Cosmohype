'use client'
import { useRouter } from 'next/navigation'
import { useSearchHistory } from '@/hooks/useSearchHistory'

export function SearchHistory() {
  const { history, remove, clear } = useSearchHistory()
  const router = useRouter()

  if (history.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between px-4 pt-2 pb-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          最近の検索
        </h2>
        <button
          onClick={clear}
          className="text-xs font-medium active:opacity-60 transition-opacity py-1"
          style={{ color: 'var(--purple)' }}
        >
          すべて消去
        </button>
      </div>

      <div className="flex flex-col">
        {history.map(keyword => (
          <div key={keyword} className="flex items-center gap-3 px-4 py-2.5">
            <button
              onClick={() => router.push(`/search?q=${encodeURIComponent(keyword)}`)}
              className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70 transition-opacity"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--bg-subtle)' }}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm truncate" style={{ color: 'var(--text)' }}>{keyword}</span>
            </button>

            <button
              onClick={() => remove(keyword)}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full active:opacity-50 transition-opacity"
              aria-label="削除"
              style={{ color: 'var(--text-muted)' }}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
