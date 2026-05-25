import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BackButton } from '@/components/ui/BackButton'
import { StyleAlien } from '@/components/style-id/StyleAlien'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import { getCompatibility } from '@/lib/style-id/compatibility'
import type { StyleId } from '@/lib/style-id/types'

export default async function CompatResultPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>
}) {
  const { a, b } = await searchParams
  const styleA = a as StyleId
  const styleB = b as StyleId

  if (!STYLE_TYPES[styleA] || !STYLE_TYPES[styleB]) redirect('/style-id/compat')

  const typeA = STYLE_TYPES[styleA]
  const typeB = STYLE_TYPES[styleB]
  const result = getCompatibility(styleA, styleB)

  const scoreColor =
    result.score >= 85 ? '#A855F7' :
    result.score >= 70 ? '#3B82F6' :
    result.score >= 55 ? '#10B981' : '#F59E0B'

  return (
    <div className="slide-up-enter min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* ヘッダー */}
      <header className="sticky top-0 z-40 backdrop-blur-xl" style={{ background: 'var(--nav-bg)', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-md mx-auto flex items-center px-5 h-14">
          <BackButton variant="purple" />
          <span className="ml-2 text-base font-semibold" style={{ color: 'var(--text)' }}>相性診断結果</span>
        </div>
        <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }} />
      </header>

      <div className="flex-1 max-w-md mx-auto w-full flex flex-col">

        {/* ── キャラクターエリア ── */}
        <div
          className="relative flex flex-col items-center justify-center px-5 py-10 gap-6"
          style={{
            background: `linear-gradient(160deg, ${typeA.palette[0]}28 0%, var(--bg) 45%, ${typeB.palette[0]}28 100%)`,
          }}
        >
          {/* 両キャラ */}
          <div className="flex items-end justify-center w-full gap-0">
            {/* キャラ A */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <StyleAlien styleId={styleA} size={130} />
              <span className="text-xs font-bold" style={{ color: 'var(--text-sub)' }}>{typeA.name}</span>
            </div>

            {/* 中央スコア */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0 pb-10 px-1">
              <div
                className="text-[52px] font-black leading-none tabular-nums"
                style={{
                  color: scoreColor,
                  textShadow: `0 0 40px ${scoreColor}88`,
                }}
              >
                {result.score}
              </div>
              <div className="text-xl font-black" style={{ color: scoreColor }}>%</div>
            </div>

            {/* キャラ B */}
            <div className="flex flex-col items-center gap-2 flex-1">
              <StyleAlien styleId={styleB} size={130} />
              <span className="text-xs font-bold" style={{ color: 'var(--text-sub)' }}>{typeB.name}</span>
            </div>
          </div>

          {/* ラベルバッジ */}
          <div
            className="px-5 py-2 rounded-full font-bold text-sm"
            style={{
              background: `${scoreColor}1A`,
              border: `1.5px solid ${scoreColor}55`,
              color: scoreColor,
            }}
          >
            {result.label}
          </div>
        </div>

        {/* ── 詳細エリア ── */}
        <div className="flex flex-col gap-4 px-5 pb-24">

          {/* スコアバー */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>相性スコア</span>
              <span className="text-sm font-black" style={{ color: scoreColor }}>{result.score}%</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${result.score}%`,
                  background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}77)`,
                  boxShadow: `0 0 8px ${scoreColor}88`,
                }}
              />
            </div>
          </div>

          {/* 説明文 */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-sub)' }}>
              {result.description}
            </p>
          </div>

          {/* アクション */}
          <Link
            href="/style-id/compat"
            className="w-full h-12 rounded-2xl flex items-center justify-center text-sm font-semibold transition-all duration-75 active:scale-[0.97]"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-sub)',
            }}
          >
            もう一度診断する
          </Link>
        </div>

      </div>
    </div>
  )
}
