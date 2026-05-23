'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

type Vec2 = { x: number; y: number }

export function AvatarCropper({
  src,
  onConfirm,
  onCancel,
  confirmLabel = '完了',
  onExitStart,
}: {
  src: string
  onConfirm: (blob: Blob) => void | Promise<void>
  onCancel: () => void
  confirmLabel?: string
  onExitStart?: () => void
}) {
  const [entered, setEntered] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [ready, setReady] = useState(false)
  const [offset, setOffset] = useState<Vec2>({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [dims, setDims] = useState({ vw: 375, vh: 667, cropR: 140 })
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [btnPressed, setBtnPressed] = useState(false)

  // Stable refs — safe to read from native event listeners
  const containerRef = useRef<HTMLDivElement>(null)
  const loadedImg = useRef<HTMLImageElement | null>(null)
  const imgNatural = useRef<Vec2>({ x: 0, y: 0 })
  const offsetRef = useRef<Vec2>({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  const minScaleRef = useRef(1)
  const cropRRef = useRef(140)
  const gestureOffset = useRef<Vec2>({ x: 0, y: 0 })
  const gestureScale = useRef(1)
  const gestureMid = useRef<Vec2>({ x: 0, y: 0 })
  const gestureDist = useRef(0)
  const mouseDown = useRef(false)
  const mousePrev = useRef<Vec2>({ x: 0, y: 0 })

  // ── Setup ──────────────────────────────────────────────────────
  useEffect(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const cropR = Math.round(Math.min(vw * 0.42, vh * 0.32))
    cropRRef.current = cropR
    setDims({ vw, vh, cropR })

    const img = new window.Image()
    img.onload = () => {
      loadedImg.current = img
      imgNatural.current = { x: img.naturalWidth, y: img.naturalHeight }
      const ms = (cropR * 2) / Math.min(img.naturalWidth, img.naturalHeight)
      minScaleRef.current = ms
      applyTransform({ x: 0, y: 0 }, ms)
      setReady(true)
    }
    img.src = src

    requestAnimationFrame(() => setEntered(true))
  }, [src])

  // ── Non-passive touch + wheel (passive:false required for preventDefault) ──
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function clamp(o: Vec2, s: number): Vec2 {
      const r = cropRRef.current
      const maxX = Math.max(0, (imgNatural.current.x * s) / 2 - r)
      const maxY = Math.max(0, (imgNatural.current.y * s) / 2 - r)
      return {
        x: Math.max(-maxX, Math.min(maxX, o.x)),
        y: Math.max(-maxY, Math.min(maxY, o.y)),
      }
    }

    function commit(newOffset: Vec2, newScale: number) {
      const clamped = clamp(newOffset, newScale)
      offsetRef.current = clamped
      scaleRef.current = newScale
      setOffset(clamped)
      setScale(newScale)
    }

    function mid(t: TouchList): Vec2 {
      return t.length === 1
        ? { x: t[0].clientX, y: t[0].clientY }
        : { x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 }
    }

    function pinchDist(t: TouchList): number {
      if (t.length < 2) return 0
      const dx = t[1].clientX - t[0].clientX
      const dy = t[1].clientY - t[0].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    function snapshot(t: TouchList) {
      gestureOffset.current = { ...offsetRef.current }
      gestureScale.current = scaleRef.current
      gestureMid.current = mid(t)
      if (t.length >= 2) gestureDist.current = pinchDist(t)
    }

    function onTouchStart(e: TouchEvent) {
      if ((e.target as HTMLElement).closest('button')) return
      e.preventDefault()
      snapshot(e.touches)
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault()
      const m = mid(e.touches)
      const dx = m.x - gestureMid.current.x
      const dy = m.y - gestureMid.current.y
      let s = gestureScale.current
      if (e.touches.length >= 2 && gestureDist.current > 0) {
        s = Math.max(
          minScaleRef.current,
          Math.min(gestureScale.current * (pinchDist(e.touches) / gestureDist.current), minScaleRef.current * 8)
        )
      }
      commit({ x: gestureOffset.current.x + dx, y: gestureOffset.current.y + dy }, s)
    }

    function onTouchEnd(e: TouchEvent) {
      if ((e.target as HTMLElement).closest('button')) return
      e.preventDefault()
      if (e.touches.length > 0) snapshot(e.touches)
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const factor = e.deltaY > 0 ? 0.92 : 1.08
      const s = Math.max(minScaleRef.current, Math.min(scaleRef.current * factor, minScaleRef.current * 8))
      commit(offsetRef.current, s)
    }

    const opts = { passive: false }
    el.addEventListener('touchstart', onTouchStart, opts)
    el.addEventListener('touchmove', onTouchMove, opts)
    el.addEventListener('touchend', onTouchEnd, opts)
    el.addEventListener('wheel', onWheel, opts)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('wheel', onWheel)
    }
  }, [])

  // ── Mouse (desktop) ────────────────────────────────────────────
  function applyTransform(newOffset: Vec2, newScale: number) {
    const r = cropRRef.current
    const maxX = Math.max(0, (imgNatural.current.x * newScale) / 2 - r)
    const maxY = Math.max(0, (imgNatural.current.y * newScale) / 2 - r)
    const clamped = {
      x: Math.max(-maxX, Math.min(maxX, newOffset.x)),
      y: Math.max(-maxY, Math.min(maxY, newOffset.y)),
    }
    offsetRef.current = clamped
    scaleRef.current = newScale
    setOffset(clamped)
    setScale(newScale)
  }

  function handleMouseDown(e: React.MouseEvent) {
    mouseDown.current = true
    mousePrev.current = { x: e.clientX, y: e.clientY }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!mouseDown.current) return
    const dx = e.clientX - mousePrev.current.x
    const dy = e.clientY - mousePrev.current.y
    mousePrev.current = { x: e.clientX, y: e.clientY }
    applyTransform({ x: offsetRef.current.x + dx, y: offsetRef.current.y + dy }, scaleRef.current)
  }

  // ── Cancel with slide-down animation ──────────────────────────
  function handleCancel() {
    setExiting(true)
    onExitStart?.()
    setTimeout(onCancel, 270)
  }

  // ── Crop & save ────────────────────────────────────────────────
  async function handleConfirm() {
    if (!loadedImg.current || confirming) return
    setConfirming(true)
    setError(null)

    try {
      const img = loadedImg.current
      const OUTPUT = 480
      const canvas = document.createElement('canvas')
      canvas.width = OUTPUT
      canvas.height = OUTPUT
      const ctx = canvas.getContext('2d')!
      const { x: imgW, y: imgH } = imgNatural.current
      const s = scaleRef.current
      const { x: ox, y: oy } = offsetRef.current
      const r = cropRRef.current
      const srcCx = imgW / 2 - ox / s
      const srcCy = imgH / 2 - oy / s
      const srcR = r / s
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, srcCx - srcR, srcCy - srcR, srcR * 2, srcR * 2, 0, 0, OUTPUT, OUTPUT)

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('blob')), 'image/jpeg', 0.92)
      )

      await onConfirm(blob)
      // Parent calls setCropperSrc(null) on success → component unmounts
    } catch {
      setError('保存に失敗しました。もう一度お試しください。')
      setConfirming(false)
    }
  }

  const { vw, vh, cropR } = dims
  const cx = vw / 2
  const cy = vh / 2

  const overlayPath = [
    `M0,0 H${vw} V${vh} H0 Z`,
    `M${cx},${cy} m${-cropR},0`,
    `a${cropR},${cropR} 0 1,1 ${cropR * 2},0`,
    `a${cropR},${cropR} 0 1,1 ${-cropR * 2},0`,
  ].join(' ')

  // Slide-up on enter, slide-down on exit
  const slideY = !entered || exiting ? '100%' : '0%'
  const slideTrans = exiting
    ? 'transform 260ms cubic-bezier(0.4, 0, 1, 1)'
    : 'transform 380ms cubic-bezier(0.32, 0.72, 0, 1)'

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0"
      style={{
        zIndex: 9998,
        background: '#000',
        userSelect: 'none',
        touchAction: 'none',
        transform: `translateY(${slideY})`,
        transition: slideTrans,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => { mouseDown.current = false }}
      onMouseLeave={() => { mouseDown.current = false }}
    >
      {/* Image */}
      {ready && (
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: imgNatural.current.x,
            height: imgNatural.current.y,
            marginLeft: -imgNatural.current.x / 2,
            marginTop: -imgNatural.current.y / 2,
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '50% 50%',
            maxWidth: 'none',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Dark overlay with circular hole */}
      <svg className="absolute inset-0 pointer-events-none" width={vw} height={vh} viewBox={`0 0 ${vw} ${vh}`}>
        <path d={overlayPath} fill="rgba(0,0,0,0.62)" fillRule="evenodd" />
        <circle cx={cx} cy={cy} r={cropR} fill="none" stroke="white" strokeWidth={1.5} opacity={0.5} />
      </svg>

      {/* Top bar */}
      <div
        className="absolute inset-x-0 flex items-center justify-between px-5"
        style={{ top: 'calc(0.875rem + env(safe-area-inset-top, 0px))', zIndex: 1 }}
      >
        <button
          onClick={handleCancel}
          disabled={confirming}
          className="text-sm font-medium text-white py-2 pr-3 disabled:opacity-40"
        >
          キャンセル
        </button>
        <span className="text-sm font-semibold text-white opacity-80">プロフィール写真</span>
        <div className="w-16" />
      </div>

      {/* Image loading spinner */}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg className="animate-spin w-8 h-8" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="9" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <path d="M11 2a9 9 0 019 9" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {/* Hint + error */}
      {ready && (
        <div
          className="absolute inset-x-0 flex flex-col items-center gap-2 pointer-events-none"
          style={{ top: cy + cropR + 18 }}
        >
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            ドラッグで移動・ピンチで拡大縮小
          </p>
          {error && (
            <p className="text-xs text-red-400 bg-black/50 px-3 py-1 rounded-full">{error}</p>
          )}
        </div>
      )}

      {/* Save button */}
      <div
        className="absolute inset-x-0 flex justify-center"
        style={{ bottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))', zIndex: 1 }}
      >
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!ready || confirming}
          onPointerDown={(e) => { e.stopPropagation(); if (ready && !confirming) setBtnPressed(true) }}
          onPointerUp={(e) => { e.stopPropagation(); setBtnPressed(false) }}
          onPointerLeave={() => setBtnPressed(false)}
          onPointerCancel={() => setBtnPressed(false)}
          className="px-10 py-3 rounded-full text-sm font-bold text-white flex items-center gap-2"
          style={{
            background: '#7C3AED',
            opacity: !ready ? 0.4 : 1,
            transform: btnPressed ? 'scale(0.93)' : 'scale(1)',
            transition: btnPressed
              ? 'transform 60ms ease-out'
              : 'transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {confirming && (
            <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
              <path d="M11 2a9 9 0 019 9" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
          {confirmLabel}
        </button>
      </div>
    </div>,
    document.body
  )
}
