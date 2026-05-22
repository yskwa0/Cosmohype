import type { PostItem } from '@/types/database'

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
            className="rounded-2xl px-4 py-3.5 flex items-center gap-3"
            style={{ background: 'var(--card-bg, var(--bg))', border: '1px solid var(--border)' }}
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-snug truncate" style={{ color: 'var(--text)' }}>
                {item.item_name}
              </p>
              {item.brand_name && (
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                  {item.brand_name}
                </p>
              )}
            </div>

            {/* 将来 affiliate_url に差し替え予定 */}
            {item.purchase_url && (
              <a
                href={item.purchase_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-opacity active:opacity-70"
                style={{ background: 'var(--purple-dim)', color: 'var(--purple)', border: '1px solid var(--border)' }}
              >
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                商品を見る
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
