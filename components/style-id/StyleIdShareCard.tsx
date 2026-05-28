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
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [modalUrl, setModalUrl] = useState<string | null>(null)
  const svgRef = useRef<HTMLDivElement>(null)

  async function handleGenerateImage() {
    if (status === 'loading') return
    setStatus('loading')
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

      // 背景グラデーション
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
      track.shareStyleId(styleId, 'save_image')
      setStatus('idle')
      setModalUrl(url)
    } catch (err) {
      console.error('[StyleIdShareCard] 画像生成失敗:', err)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  function handleCloseModal() {
    if (modalUrl) {
      URL.revokeObjectURL(modalUrl)
      setModalUrl(null)
    }
  }

  return (
    <>
      {/* 画像モーダル */}
      {modalUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)' }}
          onClick={handleCloseModal}
        >
          <div
            className="flex flex-col items-center gap-5 w-full"
            onClick={e => e.stopPropagation()}
          >
            {/* 生成画像 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={modalUrl}
              alt="STYLE IDカード"
              style={{
                maxHeight: '68vh',
                maxWidth: '280px',
                width: '100%',
                borderRadius: '20px',
                display: 'block',
                boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
              }}
            />

            {/* 保存案内 */}
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-sm font-semibold text-white">
                画像を長押しして保存してください
              </p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Long press the image to save
              </p>
            </div>

            {/* 閉じるボタン */}
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-8 py-3 rounded-full text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.14)', color: '#fff' }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

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
            onClick={handleGenerateImage}
            disabled={status === 'loading'}
            className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-75 active:scale-[0.97]"
            style={{
              background: status === 'error'
                ? 'rgba(239,68,68,0.15)'
                : 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
              color: status === 'error' ? '#EF4444' : '#fff',
              border: status === 'error' ? '1px solid rgba(239,68,68,0.3)' : 'none',
              opacity: status === 'loading' ? 0.7 : 1,
              cursor: status === 'loading' ? 'wait' : 'pointer',
            }}
          >
            {status === 'loading' ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                生成中...
              </>
            ) : status === 'error' ? (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                画像の生成に失敗しました
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M13.5 12h.008v.008H13.5V12zm0 0L12 10.5m1.5 1.5l1.5-1.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                画像を表示して保存
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
