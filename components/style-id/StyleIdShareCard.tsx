'use client'
import { useRef, useState } from 'react'
import { StyleAlien } from './StyleAlien'
import type { StyleId, StyleType } from '@/lib/style-id/types'
import { track } from '@/lib/analytics'

interface Props {
  styleId: StyleId
  primary: StyleType
}

// Instagram Stories比率 9:16
const CW = 720
const CH = 1280
const SCALE = 2

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = src
  })
}

export function StyleIdShareCard({ styleId, primary }: Props) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const svgRef = useRef<HTMLDivElement>(null)

  async function handleSaveImage() {
    if (saveStatus !== 'idle') return
    setSaveStatus('loading')
    try {
      const svgEl = svgRef.current?.querySelector('svg')
      if (!svgEl) throw new Error('svg not found')

      const svgStr = new XMLSerializer().serializeToString(svgEl)
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
      const svgUrl = URL.createObjectURL(svgBlob)

      let alienImg: HTMLImageElement
      let logoImg: HTMLImageElement | null = null
      try {
        ;[alienImg, logoImg] = await Promise.all([
          loadImg(svgUrl),
          loadImg('/cosmohypewh.png').catch(() => null as unknown as HTMLImageElement),
        ])
      } finally {
        URL.revokeObjectURL(svgUrl)
      }

      const canvas = document.createElement('canvas')
      canvas.width = CW * SCALE
      canvas.height = CH * SCALE
      const ctx = canvas.getContext('2d')!
      ctx.scale(SCALE, SCALE)

      // 背景グラデーション（パレット色使用）
      const pal = primary.palette
      const bg = ctx.createLinearGradient(0, 0, CW, CH)
      bg.addColorStop(0,    pal[0] ?? '#0A0714')
      bg.addColorStop(0.45, pal[1] ?? '#2D0A5F')
      bg.addColorStop(1,    pal[2] ?? '#0A0714')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, CW, CH)

      // 下部ビネット
      const vignette = ctx.createLinearGradient(0, CH * 0.48, 0, CH)
      vignette.addColorStop(0, 'rgba(0,0,0,0)')
      vignette.addColorStop(1, 'rgba(0,0,0,0.62)')
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, CW, CH)

      ctx.textAlign = 'center'

      // 上部バッジ
      ctx.font = '600 28px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.52)'
      ctx.fillText('✦  STYLE ID  ✦', CW / 2, 108)

      // エイリアン
      const alienH = 460
      const alienW = alienH * (100 / 120)
      ctx.drawImage(alienImg, (CW - alienW) / 2, 150, alienW, alienH)

      // スタイル名
      ctx.font = '900 92px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(primary.name, CW / 2, 718)

      // サブタイトル
      ctx.font = '400 36px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.72)'
      ctx.fillText(primary.subtitle, CW / 2, 776)

      // 区切り線
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(CW * 0.25, 820)
      ctx.lineTo(CW * 0.75, 820)
      ctx.stroke()

      // CTAテキスト
      ctx.font = '400 28px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.42)'
      ctx.fillText('あなたのSTYLE IDは？', CW / 2, 872)

      // ロゴ
      if (logoImg) {
        const logoH = 72
        const logoW = logoH * (logoImg.naturalWidth / logoImg.naturalHeight)
        ctx.drawImage(logoImg, (CW - logoW) / 2, CH - 106, logoW, logoH)
      } else {
        ctx.font = '700 30px system-ui'
        ctx.fillStyle = 'rgba(255,255,255,0.42)'
        ctx.fillText('Cosmohype', CW / 2, CH - 78)
      }

      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png')
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `styleid-${styleId.toLowerCase()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      track.shareStyleId(styleId, 'save_image')
      setSaveStatus('done')
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch (err) {
      console.error(err)
      setSaveStatus('idle')
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* カードプレビュー */}
      <div
        className="relative overflow-hidden rounded-3xl w-full"
        style={{
          maxWidth: '260px',
          aspectRatio: '9 / 16',
          background: primary.gradient,
        }}
      >
        {/* ビネット */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, transparent 42%, rgba(0,0,0,0.65) 100%)' }}
        />

        {/* canvas用の隠しSVG（serialization用） */}
        <div
          ref={svgRef}
          aria-hidden
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', top: 0, left: 0, width: 1, height: 1, overflow: 'hidden' }}
        >
          <StyleAlien styleId={styleId} size={400} />
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-between py-5 px-4 z-10">
          {/* 上部ラベル */}
          <p
            className="text-[10px] font-semibold tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.52)' }}
          >
            ✦ STYLE ID ✦
          </p>

          {/* エイリアン＋テキスト */}
          <div className="flex flex-col items-center gap-2">
            <StyleAlien styleId={styleId} size={110} />
            <div className="text-center mt-1">
              <p className="text-xl font-black text-white tracking-tight leading-tight">
                {primary.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {primary.subtitle}
              </p>
            </div>
          </div>

          {/* ロゴ */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-px" style={{ background: 'rgba(255,255,255,0.2)' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cosmohypewh.png"
              alt="Cosmohype"
              style={{ width: '96px', height: 'auto', opacity: 0.62 }}
            />
          </div>
        </div>
      </div>

      {/* ボタン */}
      <div className="flex flex-col gap-3 w-full">
        <button
          type="button"
          onClick={handleSaveImage}
          disabled={saveStatus === 'loading'}
          className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-75 active:scale-[0.97]"
          style={{
            background: saveStatus === 'done'
              ? 'var(--bg-elevated)'
              : 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
            color: saveStatus === 'done' ? 'var(--purple)' : '#fff',
            border: saveStatus === 'done' ? '1px solid var(--border)' : 'none',
            opacity: saveStatus === 'loading' ? 0.7 : 1,
            cursor: saveStatus === 'loading' ? 'wait' : 'pointer',
          }}
        >
          {saveStatus === 'loading' ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              生成中...
            </>
          ) : saveStatus === 'done' ? (
            <>
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              保存しました
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              画像として保存
            </>
          )}
        </button>
      </div>
    </div>
  )
}
