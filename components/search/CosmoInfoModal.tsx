'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { StyleAlien } from '@/components/style-id/StyleAlien'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import type { StyleId } from '@/lib/style-id/types'

// ── 説明文（後から自由に編集） ──────────────────────────────────
const DESCRIPTION = `COSMOは、あなたと近い感性を持つユーザーが集まる、Cosmohypeのスタイル宇宙です。

STYLE IDをもとに、同じ雰囲気の人や気になるコーデを発見できます。自分に似たセンスの仲間を見つけたり、新しい着こなしのヒントに出会える場所です。`
// ───────────────────────────────────────────────────────────────

// 中央キャラ
const CENTER_ID: StyleId = 'COSMIC_REBEL'
const CX = 50   // % (左右中央)
const CY = 46   // % (上下)

// 周囲キャラ（xp/yp はコンテナに対する % ）
const SATELLITES: { id: StyleId; xp: number; yp: number }[] = [
  { id: 'SOFT_DREAMER', xp: 20, yp: 20 },
  { id: 'RETRO_WAVE',   xp: 80, yp: 20 },
  { id: 'FREE_SPIRIT',  xp: 13, yp: 74 },
  { id: 'DARK_POET',    xp: 87, yp: 74 },
  { id: 'URBAN_EDGE',   xp: 50, yp: 88 },
]

// ── 宇宙マップ ─────────────────────────────────────────────────
// viewBox="0 0 100 100" + preserveAspectRatio="none" で
// xp/yp が CSS % と完全一致する座標系になる
function CosmoScene() {
  return (
    <div className="relative w-full" style={{ height: '260px' }}>

      {/* 装飾 SVG: 軌道リング・接続線・星 */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 外側の点線オービット */}
        <ellipse cx={CX} cy={CY} rx={44} ry={40}
          stroke="rgba(165,180,252,0.13)" strokeWidth={0.28} strokeDasharray="1.4 4.5" />

        {/* 中央グロー内リング */}
        <ellipse cx={CX} cy={CY} rx={20} ry={18}
          stroke="rgba(168,85,247,0.25)" strokeWidth={0.28} />
        <ellipse cx={CX} cy={CY} rx={20} ry={18}
          fill="rgba(168,85,247,0.06)" />

        {/* 中央→各衛星への接続線 + 中間ドット */}
        {SATELLITES.map(({ id, xp, yp }) => (
          <g key={id}>
            <line
              x1={CX} y1={CY} x2={xp} y2={yp}
              stroke="rgba(165,180,252,0.3)" strokeWidth={0.26}
            />
            <circle
              cx={(CX + xp) / 2} cy={(CY + yp) / 2}
              r={0.65} fill="#A5B4FC" opacity={0.58}
            />
          </g>
        ))}

        {/* 星 */}
        <circle cx={5}  cy={7}  r={0.44} fill="#C4B5FD" opacity={0.75} />
        <circle cx={18} cy={3}  r={0.36} fill="#EC4899"  opacity={0.6} />
        <circle cx={40} cy={5}  r={0.44} fill="#A5B4FC"  opacity={0.7} />
        <circle cx={63} cy={8}  r={0.36} fill="#C4B5FD"  opacity={0.65} />
        <circle cx={80} cy={4}  r={0.44} fill="#A855F7"  opacity={0.6} />
        <circle cx={94} cy={13} r={0.36} fill="#EC4899"  opacity={0.5} />
        <circle cx={2}  cy={38} r={0.36} fill="#A5B4FC"  opacity={0.38} />
        <circle cx={98} cy={36} r={0.36} fill="#A5B4FC"  opacity={0.38} />
        <circle cx={28} cy={14} r={0.32} fill="#FBCFE8"  opacity={0.5} />
        <circle cx={72} cy={11} r={0.32} fill="#FBCFE8"  opacity={0.45} />
        <circle cx={50} cy={2}  r={0.4}  fill="#C4B5FD"  opacity={0.6} />
      </svg>

      {/* 中央キャラ（大） */}
      <div
        className="absolute"
        style={{ left: `${CX}%`, top: `${CY}%`, transform: 'translate(-50%,-50%)', zIndex: 2 }}
      >
        <div style={{
          width: 90, height: 90,
          borderRadius: '50%',
          background: STYLE_TYPES[CENTER_ID].gradient,
          boxShadow: '0 0 22px rgba(168,85,247,0.55), 0 0 52px rgba(168,85,247,0.18)',
          border: '2px solid rgba(168,85,247,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          <StyleAlien styleId={CENTER_ID} size={76} />
        </div>
      </div>

      {/* 衛星キャラ（小） */}
      {SATELLITES.map(({ id, xp, yp }) => (
        <div
          key={id}
          className="absolute"
          style={{ left: `${xp}%`, top: `${yp}%`, transform: 'translate(-50%,-50%)', zIndex: 1 }}
        >
          <div style={{
            width: 54, height: 54,
            borderRadius: '50%',
            background: STYLE_TYPES[id].gradient,
            boxShadow: '0 0 10px rgba(168,85,247,0.22)',
            border: '1.5px solid rgba(255,255,255,0.16)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <StyleAlien styleId={id} size={44} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── モーダル本体 ───────────────────────────────────────────── */
export function CosmoInfoModal() {
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
        style={{ background: 'rgba(99,102,241,0.25)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(99,102,241,0.4)' }}
        aria-label="COSMOの説明を見る"
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
              background: 'linear-gradient(180deg, #0F0A2E 0%, #0D1A3A 60%, #080D20 100%)',
              border: '1px solid rgba(99,102,241,0.3)',
              boxShadow: '0 0 60px rgba(79,70,229,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(99,102,241,0.2)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🪐</span>
                <h2 className="text-base font-bold text-white">COSMOとは？</h2>
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
            <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'rgba(199,210,254,0.85)' }}>
                {DESCRIPTION}
              </p>

              <CosmoScene />

              <Link
                href="/cosmo"
                className="rounded-2xl px-4 py-3.5 flex items-center justify-between"
                style={{ background: 'rgba(79,70,229,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}
              >
                <span className="text-sm font-medium text-white">COSMOを探索する</span>
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-indigo-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5}>
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
