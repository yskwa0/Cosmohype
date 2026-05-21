import type { PostItem } from '@/types/database'

function buildSearchQuery(item: PostItem): string {
  return [item.item_name, item.color, item.silhouette, item.genre]
    .filter(Boolean)
    .join(' ')
}

function rakutenUrl(item: PostItem): string {
  return `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(buildSearchQuery(item))}/`
}

function amazonUrl(item: PostItem): string {
  return `https://www.amazon.co.jp/s?k=${encodeURIComponent(buildSearchQuery(item))}`
}

function usedUrl(item: PostItem): string {
  return `https://jp.mercari.com/search?keyword=${encodeURIComponent(buildSearchQuery(item))}`
}

export function PostRecommendItems({ items }: { items: PostItem[] }) {
  if (items.length === 0) return null

  return (
    <section className="px-4 pt-5 pb-8">
      <div className="flex items-center gap-2 mb-4">
        <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}
          style={{ color: 'var(--purple)' }}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>このコーデの着用アイテム</h2>
      </div>

      <div className="flex flex-col gap-3">
        {items.map(item => (
          <div
            key={item.id}
            className="rounded-2xl p-4"
            style={{ background: 'var(--card-bg, var(--bg))', border: '1px solid var(--border)' }}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="font-bold text-[15px] leading-snug" style={{ color: 'var(--text)' }}>
                {item.item_name}
              </p>
              <span
                className="text-xs px-2.5 py-0.5 rounded-full flex-shrink-0"
                style={{ color: 'var(--purple)', background: 'var(--purple-dim)', border: '1px solid var(--border)' }}
              >
                {item.category}
              </span>
            </div>

            {(item.color || item.silhouette || item.genre) && (
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>
                {[item.color, item.silhouette, item.genre].filter(Boolean).join(' · ')}
              </p>
            )}

            {item.purchase_url && (
              <a
                href={item.purchase_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-opacity active:opacity-70 mb-3"
                style={{ background: 'var(--purple-dim)', color: 'var(--purple)', border: '1px solid var(--border)' }}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                購入先を見る
              </a>
            )}

            {/* 検索リンク */}
            <div className="flex gap-2">
              <a
                href={rakutenUrl(item)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center text-xs font-semibold py-2 rounded-xl transition-opacity active:opacity-70"
                style={{ background: 'rgba(191,28,28,0.08)', color: '#BF1C1C', border: '1px solid rgba(191,28,28,0.2)' }}
              >
                楽天で見る
              </a>
              <a
                href={amazonUrl(item)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center text-xs font-semibold py-2 rounded-xl transition-opacity active:opacity-70"
                style={{ background: 'rgba(255,153,0,0.1)', color: '#B45309', border: '1px solid rgba(255,153,0,0.25)' }}
              >
                Amazonで見る
              </a>
              <a
                href={usedUrl(item)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center text-xs font-semibold py-2 rounded-xl transition-opacity active:opacity-70"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                古着で探す
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
