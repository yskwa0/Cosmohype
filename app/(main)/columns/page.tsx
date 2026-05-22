'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'

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
    <>
      <TopBar title="コラム" />
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
    </>
  )
}

function ColumnCard({ col }: { col: Column }) {
  return (
    <Link
      href={`/columns/${col.slug}`}
      className="block rounded-2xl overflow-hidden active:opacity-75 transition-opacity"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
      }}
    >
      <div
        className="h-1 w-full"
        style={{ background: 'linear-gradient(90deg, var(--purple-glow), var(--purple))' }}
      />
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-[11px] font-medium px-2.5 py-1 rounded-full"
            style={{ background: 'var(--purple-dim)', color: 'var(--purple)' }}
          >
            {col.category}
          </span>
          <div className="flex items-center gap-2.5">
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {col.readingTime}で読める
            </span>
            <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </div>
        <h3 className="text-sm font-bold leading-snug mb-2" style={{ color: 'var(--text)' }}>
          {col.title}
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {col.description}
        </p>
      </div>
    </Link>
  )
}
