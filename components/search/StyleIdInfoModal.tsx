'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { StyleAlien } from '@/components/style-id/StyleAlien'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import type { StyleId } from '@/lib/style-id/types'

// ── 説明文（後から自由に編集） ──────────────────────────────────
const DESCRIPTION = `STYLE IDは、あなたの好み・雰囲気・コーデ傾向から、Cosmohype独自のスタイルタイプを診断する機能です。

自分のファッションの軸を知ったり、近い感性のユーザーを見つけるきっかけになります。`

const ALL_STYLE_IDS: StyleId[] = [
  'COSMIC_REBEL',
  'SOFT_DREAMER',
  'URBAN_EDGE',
  'CLASSIC_ELITE',
  'FREE_SPIRIT',
  'DARK_POET',
  'RETRO_WAVE',
  'MINIMAL_SOUL',
]
// ───────────────────────────────────────────────────────────────

export function StyleIdInfoModal() {
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
        style={{ background: 'rgba(168,85,247,0.25)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(168,85,247,0.4)' }}
        aria-label="STYLE IDの説明を見る"
      >
        ?
      </button>

      {/* モーダル */}
      {mounted && open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          onClick={handleClose}
        >
          <div
            className="w-full max-w-md max-h-[calc(100dvh-2rem)] flex flex-col rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #0F0A2E 0%, #1A0A38 60%, #0D0820 100%)',
              border: '1px solid rgba(168,85,247,0.3)',
              boxShadow: '0 0 60px rgba(124,58,237,0.25)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(168,85,247,0.2)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">✦</span>
                <h2 className="text-base font-bold text-white">STYLE IDとは？</h2>
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

            {/* スクロール可能なコンテンツ */}
            <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">

              {/* 説明文 */}
              <p
                className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: 'rgba(220,200,255,0.85)' }}
              >
                {DESCRIPTION}
              </p>

              {/* 8キャラクター */}
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-4"
                  style={{ color: 'rgba(168,85,247,0.8)' }}
                >
                  8つのSTYLE ID
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {ALL_STYLE_IDS.map(id => {
                    const s = STYLE_TYPES[id]
                    return (
                      <div key={id} className="flex flex-col items-center gap-1.5">
                        <div
                          className="w-full aspect-square rounded-2xl flex items-center justify-center overflow-hidden"
                          style={{ background: s.gradient }}
                        >
                          <StyleAlien styleId={id} size={52} />
                        </div>
                        <span
                          className="text-[10px] font-semibold text-center leading-tight"
                          style={{ color: 'rgba(220,200,255,0.9)' }}
                        >
                          {s.name}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 診断へのCTA */}
              <Link
                href="/style-id"
                className="rounded-2xl px-4 py-3.5 flex items-center justify-between"
                style={{
                  background: 'rgba(124,58,237,0.25)',
                  border: '1px solid rgba(168,85,247,0.3)',
                }}
              >
                <span className="text-sm font-medium text-white">あなたのタイプを診断する</span>
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-purple-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5}>
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
