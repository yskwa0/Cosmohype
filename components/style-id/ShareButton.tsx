'use client'
import { useRef, useState } from 'react'
import { StyleAlien } from './StyleAlien'
import type { StyleId, StyleType } from '@/lib/style-id/types'
import { track } from '@/lib/analytics'

interface Props {
  styleId: StyleId
  primary: StyleType
  shareUrl: string
}

const W = 600
const H = 750
const SCALE = 2  // retina: actual canvas buffer is W*SCALE × H*SCALE

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = src
  })
}

export function ShareButton({ styleId, primary, shareUrl }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const svgWrapRef = useRef<HTMLDivElement>(null)

  async function buildCard(): Promise<Blob> {
    const svgEl = svgWrapRef.current?.querySelector('svg')
    if (!svgEl) throw new Error('svg not found')

    // Serialize the alien SVG → object URL
    const svgStr = new XMLSerializer().serializeToString(svgEl)
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
    const svgObjUrl = URL.createObjectURL(svgBlob)

    let alienImg: HTMLImageElement
    let logoImg: HTMLImageElement | null = null
    try {
      ;[alienImg, logoImg] = await Promise.all([
        loadImg(svgObjUrl),
        loadImg('/cosmohypewh.png').catch(() => null as any),
      ])
    } finally {
      URL.revokeObjectURL(svgObjUrl)
    }

    const canvas = document.createElement('canvas')
    canvas.width = W * SCALE
    canvas.height = H * SCALE
    const ctx = canvas.getContext('2d')!
    ctx.scale(SCALE, SCALE)  // all draw calls use logical W×H coords

    // Rounded card clip
    ctx.save()
    ctx.beginPath()
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(0, 0, W, H, 32)
    } else {
      ctx.rect(0, 0, W, H)
    }
    ctx.clip()

    // Background gradient (palette colors)
    const pal = primary.palette
    const bg = ctx.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0,    pal[0] ?? '#7C3AED')
    bg.addColorStop(0.55, pal[1] ?? pal[0])
    bg.addColorStop(1,    pal[2] ?? pal[1] ?? pal[0])
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // "STYLE ID" header
    ctx.textAlign = 'center'
    ctx.font = '700 13px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillText('✦  STYLE ID  ✦', W / 2, 52)

    // Alien character — viewBox 100×120, so aspect = 5:6
    const alienH = 320
    const alienW = alienH * (100 / 120)
    ctx.drawImage(alienImg, (W - alienW) / 2, 74, alienW, alienH)

    // Bottom dark overlay
    const overlay = ctx.createLinearGradient(0, H * 0.52, 0, H)
    overlay.addColorStop(0, 'rgba(0,0,0,0)')
    overlay.addColorStop(0.35, 'rgba(0,0,0,0.42)')
    overlay.addColorStop(1, 'rgba(0,0,0,0.75)')
    ctx.fillStyle = overlay
    ctx.fillRect(0, 0, W, H)

    // English type name
    ctx.textAlign = 'center'
    ctx.font = '700 52px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(primary.name, W / 2, H - 152)

    // Japanese subtitle
    ctx.font = '400 23px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.68)'
    ctx.fillText(primary.subtitle, W / 2, H - 110)

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(W * 0.2, H - 82)
    ctx.lineTo(W * 0.8, H - 82)
    ctx.stroke()

    // Cosmohype logo (white version, 2048×768 source → drawn large for clarity)
    if (logoImg) {
      const logoH = 44
      const logoW = logoH * (logoImg.naturalWidth / logoImg.naturalHeight)
      ctx.drawImage(logoImg, (W - logoW) / 2, H - 62, logoW, logoH)
    } else {
      ctx.font = '600 18px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.fillText('Cosmohype', W / 2, H - 38)
    }

    ctx.restore()

    return new Promise((res, rej) =>
      canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png')
    )
  }

  async function handleShare() {
    if (status !== 'idle') return
    setStatus('loading')
    try {
      const blob = await buildCard()
      const file = new File([blob], `cosmohype-${styleId.toLowerCase()}.png`, { type: 'image/png' })

      // Web Share API with file (iOS Safari 15.1+, Android Chrome 86+)
      if (
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            files: [file],
            title: `私のSTYLE IDは ${primary.name}！`,
            text: `${primary.subtitle} — Cosmohypeでスタイル診断してみて！`,
          })
          track.shareStyleId(styleId, 'file')
          setStatus('idle')
          return
        } catch (e) {
          if (e instanceof Error && e.name === 'AbortError') {
            setStatus('idle')
            return
          }
          // Fall through to download
        }
      }

      // Fallback 1: download the image
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cosmohype-${styleId.toLowerCase()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      track.shareStyleId(styleId, 'download')
      setStatus('done')
      setTimeout(() => setStatus('idle'), 2500)
    } catch {
      // Fallback 2: text-only share
      setStatus('idle')
      try {
        if (typeof navigator.share === 'function') {
          await navigator.share({ title: `私のSTYLE IDは ${primary.name}！`, url: shareUrl })
          track.shareStyleId(styleId, 'text')
        }
      } catch { /* ignore */ }
    }
  }

  return (
    <>
      {/* Off-screen alien SVG, kept mounted for serialization */}
      <div
        ref={svgWrapRef}
        aria-hidden
        style={{ position: 'fixed', top: '-9999px', left: '-9999px' }}
      >
        <StyleAlien styleId={styleId} size={600} />
      </div>

      <button
        onClick={handleShare}
        disabled={status === 'loading'}
        className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-75 active:scale-[0.97]"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          color: status === 'done' ? 'var(--purple)' : 'var(--text-sub)',
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
        ) : status === 'done' ? (
          <>
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            保存しました
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            シェアする
          </>
        )}
      </button>
    </>
  )
}
