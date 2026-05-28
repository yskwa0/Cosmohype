import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { StyleAlien } from '@/components/style-id/StyleAlien'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import type { StyleId } from '@/lib/style-id/types'

const STYLE_IDS: StyleId[] = [
  'COSMIC_REBEL', 'SOFT_DREAMER', 'URBAN_EDGE', 'CLASSIC_ELITE',
  'FREE_SPIRIT', 'DARK_POET', 'RETRO_WAVE', 'MINIMAL_SOUL',
]

export default function StyleIdTopPage() {
  return (
    <div className="feed-animate-in">
      <TopBar title="STYLE ID" left={<BackButton variant="purple" />} />

      <div className="px-5 pt-6 pb-12 flex flex-col gap-8">

        {/* Hero — キャラクターパレード */}
        <div className="flex flex-col items-center gap-5">
          <div className="grid grid-cols-4 gap-2 w-full">
            {STYLE_IDS.map((id) => {
              const style = STYLE_TYPES[id]
              return (
                <div
                  key={id}
                  className="rounded-2xl overflow-hidden flex flex-col items-center"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                >
                  <div className="h-[3px] w-full" style={{ background: style.gradient }} />
                  <div className="flex flex-col items-center gap-1.5 px-1.5 pt-3 pb-3">
                    <StyleAlien styleId={id} size={64} />
                    <p
                      className="text-[10px] font-bold text-center leading-tight"
                      style={{ color: 'var(--text)' }}
                    >
                      {style.name}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="text-center pt-1">
            <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--text)' }}>
              あなたはどのタイプ？
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              15の質問で、自分だけのスタイルIDを診断。<br />ファッション星座を見つけよう。
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Link
            href="/style-id/quiz"
            className="w-full h-14 rounded-2xl flex items-center justify-center text-base font-semibold text-white transition-transform duration-75 active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
              boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
            }}
          >
            診断スタート →
          </Link>
          <Link
            href="/style-id/compat"
            className="w-full h-12 rounded-2xl flex items-center justify-center text-sm font-semibold transition-all duration-75 active:scale-[0.97] active:opacity-80"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-sub)',
            }}
          >
            相性診断をする
          </Link>
        </div>

      </div>
    </div>
  )
}
