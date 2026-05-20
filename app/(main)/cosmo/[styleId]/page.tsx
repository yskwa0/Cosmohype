import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BackButton } from '@/components/ui/BackButton'
import { TopBar } from '@/components/layout/TopBar'
import { StyleAlien } from '@/components/style-id/StyleAlien'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import type { StyleId } from '@/lib/style-id/types'

export default async function CosmoStylePage({
  params,
}: {
  params: Promise<{ styleId: string }>
}) {
  const { styleId } = await params
  const style = STYLE_TYPES[styleId as StyleId]
  if (!style) notFound()

  const others = Object.values(STYLE_TYPES).filter(s => s.id !== styleId)

  return (
    <>
      <TopBar title={style.name} left={<BackButton href="/cosmo" />} />

      {/* ── ヒーロー ── */}
      <div
        className="relative flex flex-col items-center justify-center pt-10 pb-8 px-5 gap-4"
        style={{
          background: `linear-gradient(160deg, ${style.palette[0]}30 0%, var(--bg) 60%)`,
        }}
      >
        {/* グラデーションライン */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background: style.gradient }}
        />

        <StyleAlien styleId={style.id as StyleId} size={130} />

        <div className="text-center flex flex-col gap-2">
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
            {style.name}
          </h1>
          <span
            className="inline-block px-4 py-1 rounded-full text-xs font-bold self-center"
            style={{
              background: `${style.palette[0]}22`,
              border: `1.5px solid ${style.palette[0]}55`,
              color: style.palette[0],
            }}
          >
            {style.subtitle}
          </span>
        </div>
      </div>

      {/* ── 詳細コンテンツ ── */}
      <div className="px-5 pb-10 flex flex-col gap-5">

        {/* 説明文 */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-sub)' }}>
            {style.description}
          </p>
        </div>

        {/* 似合う色 */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            似合う色
          </p>
          <div className="flex gap-3">
            {style.palette.map((color, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div
                  className="w-12 h-12 rounded-2xl flex-shrink-0"
                  style={{ background: color, border: '1px solid var(--border)' }}
                />
                <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  {color.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 特徴 */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            特徴
          </p>
          <div className="flex flex-wrap gap-2">
            {style.traits.map(t => (
              <span
                key={t}
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  background: 'var(--purple-dim)',
                  color: 'var(--purple)',
                  border: '1px solid var(--border)',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* おすすめアイテム */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            おすすめアイテム・スタイル
          </p>
          <div className="flex flex-wrap gap-2">
            {style.keywords.map(k => (
              <span
                key={k}
                className="px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-sub)',
                  border: '1px solid var(--border)',
                }}
              >
                # {k}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3 pt-2">
          <Link
            href="/style-id"
            className="w-full h-14 rounded-2xl flex items-center justify-center text-base font-semibold text-white transition-transform duration-75 active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
              boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
            }}
          >
            STYLE ID診断をする ✨
          </Link>
        </div>

        {/* 他のSTYLE IDも見る */}
        <div className="flex flex-col gap-3 pt-2">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            他のSTYLE IDも見る
          </p>

          {/* 横スクロールカード */}
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {others.map(s => (
              <Link
                key={s.id}
                href={`/cosmo/${s.id}`}
                className="flex-shrink-0 active:opacity-75 transition-opacity duration-75"
              >
                <div
                  className="w-28 rounded-2xl overflow-hidden flex flex-col"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="h-[3px]" style={{ background: s.gradient }} />
                  <div className="flex flex-col items-center gap-1.5 px-2 pt-3 pb-3">
                    <StyleAlien styleId={s.id as StyleId} size={52} />
                    <p
                      className="text-[11px] font-bold text-center leading-tight"
                      style={{ color: 'var(--text)' }}
                    >
                      {s.name}
                    </p>
                    <p
                      className="text-[9px] text-center"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {s.subtitle}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <Link
            href="/cosmo"
            className="w-full h-11 rounded-2xl flex items-center justify-center text-sm font-semibold transition-all duration-75 active:scale-[0.97] active:opacity-80"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-sub)',
            }}
          >
            すべてのSTYLE IDを見る
          </Link>
        </div>
      </div>
    </>
  )
}
