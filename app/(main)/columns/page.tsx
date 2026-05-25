'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'

type Column = {
  category: string
  title: string
  description: string
  slug: string
  readingTime: string
  featured: boolean
  date: string
}

const COLUMNS: Column[] = [
  {
    category: 'ブランド',
    title: 'Supremeとは？ストリートから世界的ファッションブランドになった理由',
    description: 'ニューヨークのスケートカルチャーから始まり、ストリート、アート、音楽、ファッションを巻き込みながら成長したブランドの軌跡。',
    slug: 'supreme',
    readingTime: '5分',
    featured: true,
    date: '2026-05-20',
  },
  {
    category: 'ブランド',
    title: 'コムデギャルソンの歴史',
    description: '川久保玲が1969年に東京で立ち上げたブランドが、世界のファッションをどう変えたか。アバンギャルドの巨人の軌跡。',
    slug: 'comme-des-garcons',
    readingTime: '5分',
    featured: true,
    date: '2026-05-22',
  },
  {
    category: '歴史',
    title: 'ファッションはどう変わってきた？時代で見るスタイルの移り変わり',
    description: '20世紀から現代まで、ファッションはどんな時代の空気を映してきたのか。時代ごとのスタイルの流れをたどる。',
    slug: 'fashion-history',
    readingTime: '4分',
    featured: false,
    date: '2026-05-23',
  },
  {
    category: '基礎知識',
    title: '服がおしゃれに見える理由は「シルエット」にある',
    description: 'どんな服を選ぶかより、どんな形を作るか。コーデの印象を決めるシルエットの基本を解説。',
    slug: 'silhouette-basics',
    readingTime: '4分',
    featured: false,
    date: '2026-05-23',
  },
  {
    category: '基礎知識',
    title: '色合わせが苦手な人へ。まず覚えたい3色ルール',
    description: '何色を組み合わせればいいかわからない。そんな人に知ってほしい、コーデをまとめる色使いの基本。',
    slug: 'three-color-rule',
    readingTime: '4分',
    featured: false,
    date: '2026-05-23',
  },
]

const CATEGORIES = ['すべて', 'ブランド', '基礎知識', '歴史', 'トレンド', 'スタイル'] as const

export default function ColumnsPage() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('すべて')

  const isDefaultView = !search.trim() && activeCategory === 'すべて'

  const filtered = useMemo(() => {
    let result = COLUMNS
    if (activeCategory !== 'すべて') {
      result = result.filter(c => c.category === activeCategory)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
      )
    }
    return result
  }, [search, activeCategory])

  const featured = COLUMNS.filter(c => c.featured)
  const latest = [...COLUMNS].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="feed-animate-in">
      <TopBar title="コラム" left={<BackButton variant="purple" />} />
      <div className="max-w-md mx-auto pb-24">

        {/* 検索バー */}
        <div className="px-4 pt-4 pb-3 sticky top-14 z-40" style={{ background: 'var(--bg)' }}>
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              placeholder="記事を検索…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
              style={{ color: 'var(--text)' }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="flex-shrink-0 active:opacity-60">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-muted)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* カテゴリタブ */}
        <div className="pb-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <div className="flex gap-2 px-4" style={{ width: 'max-content' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="flex-shrink-0 text-xs font-medium px-3.5 py-1.5 rounded-full transition-colors"
                style={
                  activeCategory === cat
                    ? { background: 'var(--purple)', color: 'white' }
                    : { background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* コンテンツ */}
        <div className="px-4 flex flex-col gap-6">
          {isDefaultView ? (
            <>
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                  注目記事
                </h2>
                <div className="flex flex-col gap-3">
                  {featured.map(col => <ColumnCard key={col.slug} col={col} />)}
                </div>
              </section>

              <section className="pb-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                  新着記事
                </h2>
                <div className="flex flex-col gap-3">
                  {latest.map(col => <ColumnCard key={col.slug} col={col} />)}
                </div>
              </section>
            </>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'var(--purple-dim)', border: '1px solid var(--border)' }}
              >
                <svg viewBox="0 0 24 24" className="w-8 h-8" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>記事が見つかりません</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>別のキーワードやカテゴリで試してください</p>
            </div>
          ) : (
            <section className="pb-4">
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{filtered.length}件の記事</p>
              <div className="flex flex-col gap-3">
                {filtered.map(col => <ColumnCard key={col.slug} col={col} />)}
              </div>
            </section>
          )}
        </div>

      </div>
    </div>
  )
}

const CATEGORY_CONFIG: Record<string, { gradient: string; accent: string; icon: React.ReactNode }> = {
  'ブランド': {
    gradient: 'linear-gradient(135deg, #0A1A0A 0%, #14532D 45%, #16A34A 100%)',
    accent: 'rgba(134,239,172,0.9)',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="#86EFAC" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
  },
  '基礎知識': {
    gradient: 'linear-gradient(135deg, #1A0844 0%, #5B21B6 45%, #A855F7 100%)',
    accent: 'rgba(196,181,253,0.9)',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="#C4B5FD" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  '歴史': {
    gradient: 'linear-gradient(135deg, #1C0A08 0%, #7C2D12 45%, #EA580C 100%)',
    accent: 'rgba(253,186,116,0.9)',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="#FED7AA" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  'トレンド': {
    gradient: 'linear-gradient(135deg, #1C0030 0%, #7C1D6F 50%, #EC4899 100%)',
    accent: 'rgba(249,168,212,0.9)',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="#F9A8D4" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
  'スタイル': {
    gradient: 'linear-gradient(135deg, #0C1A3A 0%, #1E3A6E 45%, #3B82F6 100%)',
    accent: 'rgba(147,197,253,0.9)',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="#93C5FD" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
  },
}

const STAR_DOTS: [number, number][] = [
  [30, 20], [80, 55], [130, 15], [200, 70], [250, 25], [310, 60], [340, 18],
  [55, 85], [175, 40], [290, 90], [150, 85], [320, 40],
]

function ColumnCard({ col }: { col: Column }) {
  const config = CATEGORY_CONFIG[col.category] ?? CATEGORY_CONFIG['基礎知識']

  return (
    <Link href={`/columns/${col.slug}`} replace className="block active:opacity-80 transition-opacity">
      <div className="rounded-3xl overflow-hidden" style={{ background: config.gradient }}>
        <div className="relative flex items-center gap-4 px-5 py-5">
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 360 110"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden
          >
            {STAR_DOTS.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.5 : 1} fill="white" opacity={0.2 + (i % 4) * 0.08} />
            ))}
          </svg>

          <div
            className="w-[56px] h-[56px] rounded-2xl flex-shrink-0 flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
          >
            {config.icon}
          </div>

          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: config.accent }}>
              {col.category}
            </span>
            <h3 className="text-white font-bold text-[14px] leading-snug mt-0.5 line-clamp-2">
              {col.title}
            </h3>
            <p className="text-[11px] mt-1 line-clamp-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {col.description}
            </p>
          </div>

          <div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.18)' }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  )
}
