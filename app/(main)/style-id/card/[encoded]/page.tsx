import { notFound } from 'next/navigation'
import Link from 'next/link'
import { StyleAlien } from '@/components/style-id/StyleAlien'
import { decodeResult } from '@/lib/style-id/scoring'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ encoded: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { encoded } = await params
  const result = decodeResult(encoded)
  if (!result) return { title: 'STYLE ID' }
  const primary = STYLE_TYPES[result.primaryStyle]
  return {
    title: `${primary.emoji} ${primary.name} | STYLE ID — Cosmohype`,
    description: `${primary.subtitle} — ${primary.description.slice(0, 80)}...`,
  }
}

export default async function StyleCardPage({ params }: Props) {
  const { encoded } = await params
  const result = decodeResult(encoded)
  if (!result) notFound()

  const primary = STYLE_TYPES[result.primaryStyle]
  const secondary = STYLE_TYPES[result.secondaryStyle]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10" style={{ background: 'var(--bg)' }}>
      {/* Card */}
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
      >
        {/* Gradient header */}
        <div
          className="relative flex flex-col items-center justify-center py-10 px-8 text-center"
          style={{ background: primary.gradient }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{ background: 'radial-gradient(circle at 50% 100%, rgba(0,0,0,0.8) 0%, transparent 60%)' }}
          />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="drop-shadow-2xl">
              <StyleAlien styleId={result.primaryStyle} size={110} />
            </div>
            <div>
              <p className="text-white/70 text-sm font-medium">MY STYLE ID</p>
              <h1 className="text-2xl font-black text-white tracking-tight mt-1">{primary.name}</h1>
              <p className="text-white/80 text-sm mt-1">{primary.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 flex flex-col gap-5" style={{ background: 'var(--bg-elevated)' }}>
          <p className="text-sm leading-relaxed text-center" style={{ color: 'var(--text-sub)' }}>
            {primary.description}
          </p>

          {/* Traits */}
          <div className="flex flex-wrap gap-2 justify-center">
            {primary.traits.map(t => (
              <span
                key={t}
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'var(--purple-dim)', color: 'var(--purple)', border: '1px solid var(--border)' }}
              >
                {t}
              </span>
            ))}
          </div>

          {/* Sub style */}
          <div
            className="flex items-center gap-3 rounded-2xl p-3"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
          >
            <div className="flex-shrink-0">
              <StyleAlien styleId={result.secondaryStyle} size={44} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>サブスタイル</p>
              <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{secondary.name}</p>
            </div>
          </div>

          {/* Color palette */}
          <div className="flex gap-2 justify-center">
            {primary.palette.map((color, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-lg"
                style={{ background: color, border: '1px solid rgba(255,255,255,0.1)' }}
              />
            ))}
          </div>

          {/* Branding */}
          <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              Powered by{' '}
              <span className="font-bold" style={{ color: 'var(--purple)' }}>Cosmohype</span>
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>あなたのスタイルIDは？</p>
        <Link
          href="/style-id"
          className="px-8 h-12 rounded-2xl flex items-center justify-center text-sm font-semibold text-white transition-transform duration-75 active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
            boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
          }}
        >
          診断してみる ✨
        </Link>
      </div>
    </div>
  )
}
