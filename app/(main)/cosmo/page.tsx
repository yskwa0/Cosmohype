import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { StyleAlien } from '@/components/style-id/StyleAlien'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import type { StyleId } from '@/lib/style-id/types'

const ALL_STYLES = Object.values(STYLE_TYPES)

export default function CosmoPage() {
  return (
    <>
      <TopBar title="COSMO" />

      {/* Hero */}
      <div className="px-5 pt-7 pb-1 text-center">
        <p
          className="text-[10px] font-bold tracking-widest uppercase mb-2"
          style={{ color: 'var(--purple)' }}
        >
          STYLE ID DISCOVERY
        </p>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
          スタイルから探す
        </h1>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          気になるSTYLE IDをタップして、<br />同じスタイルの人や投稿を見てみよう。
        </p>
      </div>

      {/* Grid */}
      <div className="px-4 pt-5 pb-6 grid grid-cols-2 gap-3">
        {ALL_STYLES.map(s => (
          <StyleCard key={s.id} style={s} />
        ))}
      </div>
    </>
  )
}

function StyleCard({ style }: { style: typeof ALL_STYLES[number] }) {
  return (
    <Link
      href={`/cosmo/${style.id}`}
      className="block active:opacity-75 transition-opacity duration-75"
    >
      <div
        className="rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
        }}
      >
        {/* グラデーションライン */}
        <div className="h-[3px] flex-shrink-0" style={{ background: style.gradient }} />

        <div className="flex flex-col items-center gap-2.5 px-3 pt-4 pb-4">
          {/* キャラクター */}
          <StyleAlien styleId={style.id as StyleId} size={80} />

          {/* テキスト */}
          <div className="text-center">
            <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text)' }}>
              {style.name}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {style.subtitle}
            </p>
          </div>

          {/* トレイトチップ */}
          <div className="flex flex-wrap gap-1 justify-center">
            {style.traits.slice(0, 2).map(t => (
              <span
                key={t}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium"
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
      </div>
    </Link>
  )
}
