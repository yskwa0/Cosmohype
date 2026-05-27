import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { ShareButton } from '@/components/style-id/ShareButton'
import { StyleAlien } from '@/components/style-id/StyleAlien'
import { decodeResult } from '@/lib/style-id/scoring'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import { PageTracker } from '@/components/analytics/PageTracker'

function AdviceRow({ label, items, accent, muted }: {
  label: string
  items: string[]
  accent?: boolean
  muted?: boolean
}) {
  return (
    <div className="px-5 py-3.5" style={{ borderColor: 'var(--border)' }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(item => (
          <span
            key={item}
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={
              muted
                ? { background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.75)', border: '1px solid rgba(239,68,68,0.15)' }
                : accent
                  ? { background: 'var(--purple-dim)', color: 'var(--purple)', border: '1px solid var(--border)' }
                  : { background: 'var(--bg-subtle)', color: 'var(--text-sub)', border: '1px solid var(--border)' }
            }
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

export default async function ResultPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const { r } = await searchParams
  if (!r) redirect('/style-id')

  const result = decodeResult(r)
  if (!result) redirect('/style-id')

  const primary = STYLE_TYPES[result.primaryStyle]
  const secondary = STYLE_TYPES[result.secondaryStyle]

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cosmohype.vercel.app'
  const shareUrl = `${appUrl}/style-id/card/${r}`

  return (
    <>
      <PageTracker event="style_id_complete" params={{ style_id: result.primaryStyle }} />
      <TopBar title="診断結果" left={<BackButton href="/style-id" variant="purple" />} />

      {/* Hero */}
      <div
        className="relative flex flex-col items-center justify-center py-10 px-5 text-center"
        style={{ background: primary.gradient }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{ background: 'radial-gradient(circle at 50% 90%, rgba(0,0,0,0.7) 0%, transparent 65%)' }}
        />
        <div className="relative z-10 flex flex-col items-center gap-4">
          {/* Alien character */}
          <div className="drop-shadow-2xl">
            <StyleAlien styleId={result.primaryStyle} size={130} />
          </div>
          <div>
            <p className="text-white/70 text-sm font-medium mb-1">あなたのSTYLE IDは</p>
            <h1 className="text-3xl font-black text-white tracking-tight">{primary.name}</h1>
            <p className="text-white/80 text-base mt-1">{primary.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 flex flex-col gap-6">
        {/* Description */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-sub)' }}>
            {primary.description}
          </p>
        </div>

        {result.isNeutral && (
          <div
            className="rounded-2xl p-4"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              まだスタイルが定まっていないかもしれません。もう少し直感で選んでみると、より精度の高い結果が出ます。
            </p>
          </div>
        )}

        {/* Traits */}
        <div>
          <p className="text-xs font-semibold mb-3 tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>特徴</p>
          <div className="flex flex-wrap gap-2">
            {primary.traits.map(t => (
              <span
                key={t}
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: 'var(--purple-dim)', color: 'var(--purple)', border: '1px solid var(--border)' }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div>
          <p className="text-xs font-semibold mb-3 tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>キーワード</p>
          <div className="flex flex-wrap gap-2">
            {primary.keywords.map(k => (
              <span
                key={k}
                className="px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
              >
                # {k}
              </span>
            ))}
          </div>
        </div>

        {/* Sub style */}
        <div
          className="flex items-center gap-4 rounded-2xl p-4"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <div className="flex-shrink-0">
            <StyleAlien styleId={result.secondaryStyle} size={56} />
          </div>
          <div>
            <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>サブスタイル</p>
            <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{secondary.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{secondary.subtitle}</p>
          </div>
        </div>

        {/* Color palette */}
        <div>
          <p className="text-xs font-semibold mb-3 tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>カラーパレット</p>
          <div className="flex gap-2">
            {primary.palette.map((color, i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-xl flex-shrink-0"
                style={{ background: color, border: '1px solid var(--border)' }}
              />
            ))}
          </div>
        </div>

        {/* Body type CTA — always visible */}
        <div
          className="rounded-2xl p-5 flex flex-col gap-4"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--purple)' }}>
              骨格 × STYLE ID
            </span>
            <p className="text-sm font-bold mt-1" style={{ color: 'var(--text)' }}>
              次は骨格診断へ
            </p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-sub)' }}>
              骨格タイプを組み合わせると、あなたに似合うコーデが分かります。
            </p>
          </div>
          <Link
            href={`/body-type?r=${r}`}
            className="w-full py-3 rounded-xl flex items-center justify-center text-sm font-bold transition-all active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
              color: '#fff',
            }}
          >
            骨格診断をする
          </Link>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2">
          <ShareButton
            styleId={result.primaryStyle}
            primary={primary}
            shareUrl={shareUrl}
          />
          <Link
            href={`/style-id/compat?a=${result.primaryStyle}&r=${r}`}
            replace
            className="w-full h-12 rounded-2xl flex items-center justify-center text-sm font-semibold transition-all duration-75 active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
            }}
          >
            相性診断をする
          </Link>
        </div>

      </div>
    </>
  )
}
