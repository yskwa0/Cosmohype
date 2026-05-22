'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'

const DESCRIPTION = `コーデ画像をもとに、AIが色合わせ・シルエット・アイテムバランス・全体の雰囲気をチェックします。

顔・体型・年齢・性別・容姿は評価しません。`

// cx=160, cy=108 を中心にしたコーデシルエット + 4点分析ノード
function AiScanScene() {
  const cx = 160
  const cy = 108

  // ドレスシルエットのパス（肩→ウエスト→スカートの広がり）
  const outfitPath = [
    `M ${cx} 62`,
    `C ${cx - 12} 64, ${cx - 22} 70, ${cx - 26} 80`,
    `C ${cx - 24} 90, ${cx - 20} 100, ${cx - 20} 110`,
    `C ${cx - 22} 130, ${cx - 32} 152, ${cx - 42} 175`,
    `L ${cx + 42} 175`,
    `C ${cx + 32} 152, ${cx + 22} 130, ${cx + 20} 110`,
    `C ${cx + 20} 100, ${cx + 24} 90, ${cx + 26} 80`,
    `C ${cx + 22} 70, ${cx + 12} 64, ${cx} 62`,
    'Z',
  ].join(' ')

  const neckPath = `M ${cx - 8} 68 L ${cx} 80 L ${cx + 8} 68`

  const nodes: { x: number; y: number; label: string; en: string; left: boolean }[] = [
    { x: 80,  y: 52,  label: '色合わせ',        en: 'Color',   left: true },
    { x: 240, y: 52,  label: 'シルエット',       en: 'Shape',   left: false },
    { x: 78,  y: 168, label: 'アイテムバランス', en: 'Balance', left: true },
    { x: 248, y: 168, label: '全体の雰囲気',     en: 'Vibe',    left: false },
  ]

  return (
    <div className="relative w-full" style={{ height: '220px' }}>
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 220" fill="none">
        {/* 星 */}
        <circle cx={22}  cy={16}  r={0.9} fill="#93C5FD" opacity={0.55} />
        <circle cx={52}  cy={6}   r={0.7} fill="#60A5FA" opacity={0.45} />
        <circle cx={280} cy={12}  r={0.9} fill="#BAE6FD" opacity={0.5} />
        <circle cx={305} cy={22}  r={0.7} fill="#93C5FD" opacity={0.5} />
        <circle cx={160} cy={4}   r={0.8} fill="#BFDBFE" opacity={0.45} />
        <circle cx={12}  cy={158} r={0.7} fill="#93C5FD" opacity={0.3} />
        <circle cx={312} cy={148} r={0.7} fill="#60A5FA" opacity={0.3} />
        <circle cx={160} cy={212} r={0.7} fill="#BAE6FD" opacity={0.35} />

        {/* 外側の点線リング */}
        <circle cx={cx} cy={cy} r={72}
          stroke="rgba(96,165,250,0.1)" strokeWidth={0.5} strokeDasharray="3 7" />

        {/* 中心グロー */}
        <circle cx={cx} cy={cy} r={50} fill="rgba(59,130,246,0.05)" />
        <circle cx={cx} cy={cy} r={34} fill="rgba(59,130,246,0.05)" />

        {/* 中心→ノードへの接続線 */}
        {nodes.map(({ x, y, label }) => (
          <line key={label}
            x1={x} y1={y} x2={cx} y2={cy}
            stroke="rgba(96,165,250,0.22)" strokeWidth={0.6} strokeDasharray="2 5"
          />
        ))}

        {/* 中間ドット */}
        {nodes.map(({ x, y, label }) => (
          <circle key={label + 'mid'}
            cx={(cx + x) / 2} cy={(cy + y) / 2}
            r={1.2} fill="#60A5FA" opacity={0.35}
          />
        ))}

        {/* コーデシルエット */}
        <path d={outfitPath}
          fill="rgba(96,165,250,0.09)"
          stroke="rgba(147,197,253,0.62)"
          strokeWidth={1.3}
          strokeLinejoin="round"
        />
        {/* Vネックライン */}
        <path d={neckPath}
          fill="none"
          stroke="rgba(147,197,253,0.45)"
          strokeWidth={0.9}
          strokeLinejoin="round"
        />

        {/* スキャンライン */}
        <line x1={cx - 30} y1={cy} x2={cx + 30} y2={cy}
          stroke="rgba(96,165,250,0.38)" strokeWidth={1} />
        <line x1={cx - 30} y1={cy} x2={cx - 8} y2={cy}
          stroke="rgba(147,197,253,0.9)" strokeWidth={1} />

        {/* スパークル */}
        <text x={cx + 26} y={60} fontSize={8} fill="#FCD34D" opacity={0.8}>✦</text>

        {/* 分析ノード */}
        {nodes.map(({ x, y, label }) => (
          <g key={label + 'node'}>
            <circle cx={x} cy={y} r={5.5} fill="rgba(59,130,246,0.25)" />
            <circle cx={x} cy={y} r={3.2} fill="rgba(96,165,250,0.7)" />
            <circle cx={x} cy={y} r={1.3} fill="white" opacity={0.9} />
          </g>
        ))}

        {/* ラベル */}
        {nodes.map(({ x, y, label, en, left }) => (
          <g key={label + 'label'}>
            <text
              x={left ? x - 10 : x + 10}
              y={y - 2}
              fontSize={8}
              fontWeight={700}
              textAnchor={left ? 'end' : 'start'}
              fill="rgba(255,255,255,0.88)"
            >
              {label}
            </text>
            <text
              x={left ? x - 10 : x + 10}
              y={y + 9}
              fontSize={6.5}
              textAnchor={left ? 'end' : 'start'}
              fill="rgba(96,165,250,0.6)"
            >
              {en}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

export function StyleCheckInfoModal() {
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
        style={{ background: 'rgba(59,130,246,0.25)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(59,130,246,0.4)' }}
        aria-label="AIコーデ診断の説明を見る"
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
              background: 'linear-gradient(180deg, #060F28 0%, #0C1E42 60%, #060E1E 100%)',
              border: '1px solid rgba(59,130,246,0.3)',
              boxShadow: '0 0 60px rgba(59,130,246,0.18)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(59,130,246,0.2)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <h2 className="text-base font-bold text-white">AIコーデ診断とは？</h2>
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
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'rgba(186,220,255,0.85)' }}>
                {DESCRIPTION}
              </p>

              <AiScanScene />

              <Link
                href="/style-check"
                className="rounded-2xl px-4 py-3.5 flex items-center justify-between"
                style={{
                  background: 'rgba(59,130,246,0.18)',
                  border: '1px solid rgba(59,130,246,0.32)',
                }}
              >
                <span className="text-sm font-medium text-white">コーデをAI診断してみる</span>
                <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5}
                  style={{ color: 'rgba(147,197,253,0.9)' }}
                >
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
