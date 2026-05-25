import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { StyleAlien } from '@/components/style-id/StyleAlien'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import type { StyleId } from '@/lib/style-id/types'

const ALL_STYLES = Object.values(STYLE_TYPES)

export default function CosmoPage() {
  return (
    <div className="feed-animate-in">
      <TopBar title="COSMO" left={<BackButton variant="purple" />} />

      <div
        className="flex flex-col"
        style={{ minHeight: 'calc(100svh - 136px)' }}
      >
        {/* Text — upper area */}
        <div className="px-5 pt-10 text-center">
          <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: 'var(--purple)' }}>
            STYLE ID DISCOVERY
          </p>
          <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
            スタイルから探す
          </h1>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
            気になるSTYLE IDをタップしてみよう
          </p>
        </div>

        {/* Grid — centered in remaining space */}
        <div className="flex-1 flex flex-col justify-center px-4">
          <div className="grid grid-cols-4 gap-2">
            {ALL_STYLES.map(s => (
              <StyleCard key={s.id} style={s} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StyleCard({ style }: { style: typeof ALL_STYLES[number] }) {
  return (
    <Link
      href={`/cosmo/${style.id}`}
      className="block active:scale-95 active:opacity-90 transition-all duration-150 ease-out"
    >
      <div
        className="rounded-2xl overflow-hidden flex flex-col items-center"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      >
        <div className="h-[3px] w-full" style={{ background: style.gradient }} />
        <div className="flex flex-col items-center gap-1.5 px-1.5 pt-3 pb-3">
          <StyleAlien styleId={style.id as StyleId} size={64} />
          <p
            className="text-[10px] font-bold text-center leading-tight"
            style={{ color: 'var(--text)' }}
          >
            {style.name}
          </p>
        </div>
      </div>
    </Link>
  )
}
