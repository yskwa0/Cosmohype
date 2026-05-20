'use client'
import { useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { StyleAlien } from '@/components/style-id/StyleAlien'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import type { StyleId } from '@/lib/style-id/types'

const ALL_STYLES = Object.values(STYLE_TYPES)

function StepHeader({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: 'var(--purple-glow)', color: '#fff' }}
      >
        {step}
      </span>
      <div>
        <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
          STEP {step} / {total}
        </p>
        <h2 className="text-base font-bold leading-tight" style={{ color: 'var(--text)' }}>{label}</h2>
      </div>
    </div>
  )
}

function StyleGrid({ onSelect, selected }: { onSelect: (id: StyleId) => void; selected?: StyleId | null }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {ALL_STYLES.map(s => {
        const isSelected = selected === s.id
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="flex flex-col items-center gap-1 py-2 rounded-2xl transition-all duration-100 active:scale-[0.93]"
            style={{
              background: isSelected ? 'var(--purple-dim)' : 'var(--bg-elevated)',
              border: `1.5px solid ${isSelected ? 'var(--purple)' : 'var(--border)'}`,
            }}
          >
            <StyleAlien styleId={s.id} size={52} />
            <span
              className="text-[10px] font-semibold leading-tight text-center px-1"
              style={{ color: isSelected ? 'var(--purple)' : 'var(--text-muted)' }}
            >
              {s.name.split(' ')[0]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function SelectedCard({ styleId, label, onReset }: {
  styleId: StyleId
  label: string
  onReset: () => void
}) {
  const s = STYLE_TYPES[styleId]
  return (
    <div
      className="flex items-center gap-3 rounded-2xl p-3"
      style={{ background: 'var(--purple-dim)', border: '1.5px solid var(--purple)' }}
    >
      <div className="flex-shrink-0">
        <StyleAlien styleId={styleId} size={56} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--purple)' }}>✓ {label}</p>
        <p className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{s.name}</p>
        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{s.subtitle}</p>
      </div>
      <button
        onClick={onReset}
        className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-opacity active:opacity-60"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
      >
        変える
      </button>
    </div>
  )
}

export default function CompatPage() {
  const params = useSearchParams()
  const router = useRouter()
  const preA = params.get('a') as StyleId | null
  const preR = params.get('r')

  const [styleA, setStyleA] = useState<StyleId | null>(
    preA && STYLE_TYPES[preA] ? preA : null
  )
  const [styleB, setStyleB] = useState<StyleId | null>(null)
  const [phase, setPhase] = useState<'A' | 'B'>(
    preA && STYLE_TYPES[preA] ? 'B' : 'A'
  )
  const step2Ref = useRef<HTMLDivElement>(null)

  function selectA(id: StyleId) {
    setStyleA(id)
    setStyleB(null)
    setPhase('B')
    setTimeout(() => step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120)
  }

  function resetA() {
    setStyleA(null)
    setStyleB(null)
    setPhase('A')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goToResult() {
    if (styleA && styleB) {
      router.push(`/style-id/compat/result?a=${styleA}&b=${styleB}`)
    }
  }

  return (
    <>
      <style>{`
        @keyframes compat-slide-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .compat-slide-up {
          animation: compat-slide-up 0.38s cubic-bezier(0.34, 1.3, 0.64, 1);
        }
        @keyframes btn-pop-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .btn-pop-up {
          animation: btn-pop-up 0.36s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>

      <TopBar title="相性診断" left={<BackButton href={preR ? `/style-id/result?r=${preR}` : '/style-id'} />} />

      {/* コンテンツ — ボタン分の余白を下に確保 */}
      <div className={`px-5 pt-6 flex flex-col gap-5 ${styleB ? 'pb-36' : 'pb-16'}`}>

        {phase === 'A' && (
          <div className="compat-slide-up flex flex-col gap-4">
            <StepHeader step={1} total={2} label="あなたのスタイルは？" />
            <StyleGrid onSelect={selectA} />
          </div>
        )}

        {phase === 'B' && styleA && (
          <>
            <div className="compat-slide-up">
              <SelectedCard styleId={styleA} label="あなた" onReset={resetA} />
            </div>
            <div ref={step2Ref} className="compat-slide-up flex flex-col gap-4">
              <StepHeader step={2} total={2} label="相手のスタイルは？" />
              <StyleGrid onSelect={id => setStyleB(id)} selected={styleB} />
            </div>
          </>
        )}

      </div>

      {/* 固定ボタン — B が選ばれたら下からふわっと出現 */}
      {phase === 'B' && styleB && (
        <div
          className="btn-pop-up fixed left-0 right-0 z-40 px-5 max-w-md mx-auto"
          style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            onClick={goToResult}
            className="w-full h-14 rounded-2xl text-base font-semibold text-white transition-transform duration-75 active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
              boxShadow: '0 4px 28px rgba(124,58,237,0.55)',
            }}
          >
            相性を診断する ✨
          </button>
        </div>
      )}
    </>
  )
}
