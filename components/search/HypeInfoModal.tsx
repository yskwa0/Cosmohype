'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { StyleAlien } from '@/components/style-id/StyleAlien'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import type { StyleId } from '@/lib/style-id/types'

// ── 説明文 ──────────────────────────────────────────────────
const DESCRIPTION = `HYPEは、毎日変わるテーマに合わせてコーデを残し、ランキング上位を目指すデイリーチャレンジです。

自分らしい着こなしで参加して、他のユーザーからの反応を集めながら、今日のCosmohypeを盛り上げよう。`
// ────────────────────────────────────────────────────────────

// 表彰台: 画面上の並び順は 2位・1位・3位
const PODIUM: { rank: 1 | 2 | 3; id: StyleId; csize: number; bh: number }[] = [
  { rank: 2, id: 'RETRO_WAVE',   csize: 50, bh: 44 },
  { rank: 1, id: 'COSMIC_REBEL', csize: 62, bh: 62 },
  { rank: 3, id: 'FREE_SPIRIT',  csize: 44, bh: 32 },
]

const EXTRAS: { rank: number; id: StyleId }[] = [
  { rank: 4, id: 'SOFT_DREAMER' },
  { rank: 5, id: 'DARK_POET' },
]

// ── クラウンSVG ────────────────────────────────────────────
function Crown() {
  return (
    <svg viewBox="0 0 28 18" width={22} height={14} aria-hidden>
      <path d="M2,16 L5,5 L10,12 L14,2 L18,12 L23,5 L26,16 Z"
        fill="rgba(234,179,8,0.92)" />
      <rect x={2} y={14.5} width={24} height={2.5} rx={1.2}
        fill="rgba(234,179,8,0.8)" />
      <circle cx={14} cy={3} r={1.8} fill="rgba(251,191,36,1)" />
      <circle cx={4.5} cy={6} r={1.4} fill="rgba(251,191,36,0.85)" />
      <circle cx={23.5} cy={6} r={1.4} fill="rgba(251,191,36,0.85)" />
    </svg>
  )
}

// ── ランキングUI ───────────────────────────────────────────
function HypeRanking() {
  return (
    <div className="flex flex-col gap-3">

      {/* ラベル */}
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-center"
        style={{ color: 'rgba(249,168,212,0.75)' }}>
        Today's Ranking
      </p>

      {/* 表彰台 */}
      <div className="flex items-end justify-center gap-2">
        {PODIUM.map(({ rank, id, csize, bh }) => {
          const s = STYLE_TYPES[id]
          const isFirst  = rank === 1
          const isSecond = rank === 2

          return (
            <div key={id} className="flex flex-col items-center" style={{ gap: 0 }}>

              {/* クラウン (1位のみ) */}
              <div style={{ height: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                {isFirst && <Crown />}
              </div>

              {/* キャラクター丸アイコン */}
              <div style={{
                width: csize, height: csize,
                borderRadius: '50%',
                background: s.gradient,
                boxShadow: isFirst
                  ? '0 0 20px rgba(234,179,8,0.65), 0 0 40px rgba(234,179,8,0.2)'
                  : isSecond
                    ? '0 0 10px rgba(168,85,247,0.4)'
                    : '0 0 8px rgba(236,72,153,0.35)',
                border: isFirst
                  ? '2px solid rgba(234,179,8,0.7)'
                  : '1.5px solid rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}>
                <StyleAlien styleId={id} size={csize - 12} />
              </div>

              {/* 表彰台ブロック */}
              <div style={{
                width: 76, height: bh,
                borderRadius: '6px 6px 0 0',
                background: isFirst
                  ? 'linear-gradient(180deg, rgba(234,179,8,0.38) 0%, rgba(168,85,247,0.22) 100%)'
                  : isSecond
                    ? 'linear-gradient(180deg, rgba(148,163,184,0.32) 0%, rgba(99,102,241,0.18) 100%)'
                    : 'linear-gradient(180deg, rgba(251,146,60,0.28) 0%, rgba(99,102,241,0.14) 100%)',
                border: isFirst
                  ? '1px solid rgba(234,179,8,0.38)'
                  : '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  fontSize: 18, fontWeight: 900, lineHeight: 1,
                  color: isFirst
                    ? 'rgba(234,179,8,0.9)'
                    : isSecond
                      ? 'rgba(203,213,225,0.8)'
                      : 'rgba(251,146,60,0.75)',
                }}>
                  {rank}
                </span>
              </div>

            </div>
          )
        })}
      </div>

      {/* 区切り線 */}
      <div style={{ height: 1, background: 'rgba(168,85,247,0.15)', marginInline: 4 }} />

      {/* 4位・5位 */}
      <div className="flex flex-col gap-1.5">
        {EXTRAS.map(({ rank, id }) => {
          const s = STYLE_TYPES[id]
          return (
            <div
              key={id}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.14)' }}
            >
              <span className="font-bold text-xs" style={{ color: 'rgba(216,180,254,0.45)', width: 14, textAlign: 'center' }}>
                {rank}
              </span>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: s.gradient,
                overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <StyleAlien styleId={id} size={23} />
              </div>
              <span className="flex-1 text-xs font-medium" style={{ color: 'rgba(220,200,255,0.65)' }}>
                {s.name}
              </span>
              {/* ドット装飾 */}
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1 h-1 rounded-full"
                    style={{ background: 'rgba(168,85,247,0.38)' }} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}

/* ─── モーダル本体 ───────────────────────────────────────────── */
export function HypeInfoModal() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  function handleOpen(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setOpen(true)
  }
  function handleClose() { setOpen(false) }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      {/* カード右上の「？」ボタン */}
      <button
        onClick={handleOpen}
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold leading-none flex-shrink-0"
        style={{ background: 'rgba(236,72,153,0.25)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(236,72,153,0.4)' }}
        aria-label="HYPEの説明を見る"
      >
        ?
      </button>

      {mounted && open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          onClick={handleClose}
        >
          <div
            className="w-full max-w-md max-h-[calc(100dvh-2rem)] flex flex-col rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #1C0030 0%, #2D0A3E 55%, #0D0118 100%)',
              border: '1px solid rgba(236,72,153,0.28)',
              boxShadow: '0 0 60px rgba(236,72,153,0.18)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(236,72,153,0.18)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <h2 className="text-base font-bold text-white">HYPEとは？</h2>
              </div>
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
                aria-label="閉じる"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* コンテンツ */}
            <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">

              {/* 説明文 */}
              <p className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: 'rgba(249,168,212,0.85)' }}>
                {DESCRIPTION}
              </p>

              {/* ランキング */}
              <HypeRanking />

              {/* CTA */}
              <Link
                href="/hype"
                className="rounded-2xl px-4 py-3.5 flex items-center justify-between"
                style={{
                  background: 'linear-gradient(135deg, rgba(124,29,237,0.35) 0%, rgba(236,72,153,0.25) 100%)',
                  border: '1px solid rgba(236,72,153,0.32)',
                }}
              >
                <span className="text-sm font-medium text-white">HYPEに参加する</span>
                <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5}
                  style={{ color: 'rgba(249,168,212,0.9)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>

            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
