'use client'

import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { PostImage } from '@/types/database'

const CLOSE_THRESHOLD = 120
const VELOCITY_THRESHOLD = 0.5
const MAX_SCALE = 5

export function ImageViewer({
  images,
  initialIdx,
  onClose,
}: {
  images: PostImage[]
  initialIdx: number
  onClose: () => void
}) {
  const [idx, setIdx] = useState(initialIdx)
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)
  const [swipeOut, setSwipeOut] = useState(false)
  const [drag, setDrag] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isPanning, setIsPanning] = useState(false)

  // Zoom / pan (state + ref mirror to avoid stale closures)
  const [scale, setScaleState] = useState(1)
  const [panX, setPanXState] = useState(0)
  const [panY, setPanYState] = useState(0)
  const [isPinching, setIsPinching] = useState(false)
  const scaleRef = useRef(1)
  const panXRef = useRef(0)
  const panYRef = useRef(0)
  const isPinchingRef = useRef(false)

  // Touch tracking
  const startX = useRef(0)
  const startY = useRef(0)
  const startTime = useRef(0)
  const dragDir = useRef<'horiz' | 'vert' | null>(null)
  const closingRef = useRef(false)
  const prevPinchDist = useRef(0)
  const prevPinchMidX = useRef(0)
  const prevPinchMidY = useRef(0)
  const panStartX = useRef(0)
  const panStartY = useRef(0)
  const justPinchedRef = useRef(false)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  // 3-slide strip: [prev | current | next]
  // translateX(-100vw) keeps the CENTER slot visible.
  // Each slot is exactly 100vw wide; strip is 300vw total.
  const stripRef = useRef<HTMLDivElement>(null)
  const idxRef = useRef(initialIdx)

  function setScale(v: number) { scaleRef.current = v; setScaleState(v) }
  function setPanX(v: number) { panXRef.current = v; setPanXState(v) }
  function setPanY(v: number) { panYRef.current = v; setPanYState(v) }

  useEffect(() => { setVisible(true) }, [])

  useEffect(() => {
    idxRef.current = idx
    scaleRef.current = 1; setScaleState(1)
    panXRef.current = 0; setPanXState(0)
    panYRef.current = 0; setPanYState(0)
  }, [idx])

  // Direct DOM transform — zero React re-renders during drag
  function applyStrip(dragX: number, animate: boolean) {
    if (!stripRef.current) return
    stripRef.current.style.transition = animate
      ? 'transform 260ms cubic-bezier(0.25,0.46,0.45,0.94)'
      : 'none'
    // Center slot starts at x=100vw in the strip; translateX(-100vw) brings it to screen left=0
    stripRef.current.style.transform = dragX === 0
      ? 'translateX(-100vw)'
      : `translateX(calc(-100vw + ${dragX}px))`
  }

  // Animate to adjacent slide, then swap idx
  function slideToAdj(delta: number) {
    const newIdx = idxRef.current + delta
    if (newIdx < 0 || newIdx >= images.length) return
    // delta +1 (next) → strip slides left  (dragX = -innerWidth)
    // delta -1 (prev) → strip slides right (dragX = +innerWidth)
    applyStrip(-delta * window.innerWidth, true)
    setTimeout(() => {
      if (closingRef.current) return
      applyStrip(0, false)  // instant reset to center
      setIdx(newIdx)
    }, 260)
  }

  function closeTap() {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    setVisible(false)
    setTimeout(() => onCloseRef.current(), 170)
  }

  function closeSwipe() {
    if (closingRef.current) return
    closingRef.current = true
    setSwipeOut(true)
    setClosing(true)
    setIsDragging(false)
    setVisible(false)
    setTimeout(() => onCloseRef.current(), 260)
  }

  function getPinchDist(touches: React.TouchList) {
    return Math.hypot(
      touches[1].clientX - touches[0].clientX,
      touches[1].clientY - touches[0].clientY,
    )
  }

  const dragRatio = Math.min(Math.max(drag.y, 0) / CLOSE_THRESHOLD, 1)
  const bgAlpha = visible
    ? (isDragging ? Math.max(0.15, 0.93 - dragRatio * 0.78) : 0.93)
    : 0

  const ty = swipeOut ? drag.y + 420 : drag.y
  const imgOpenScale = visible ? 1 : (closing && !swipeOut ? 0.96 : 0.92)

  const imgTransform = scale > 1
    ? `translate(${panX}px, ${panY}px) scale(${scale})`
    : `translate(${drag.x}px, ${ty}px) scale(${imgOpenScale})`

  const imgTransition = isDragging || isPinching || isPanning
    ? 'none'
    : swipeOut
      ? 'transform 220ms ease-in, opacity 200ms ease-in'
      : closing
        ? 'transform 140ms ease-in, opacity 130ms ease-in'
        : 'transform 120ms ease-out, opacity 100ms ease-out'

  const bgTransition = isDragging
    ? 'none'
    : closing
      ? 'background-color 200ms ease-in'
      : 'background-color 160ms ease-out'

  const closeButtonOpacity = visible && !isDragging ? 1 : 0
  const uiOpacity = visible && !isDragging && scale === 1 ? 1 : 0

  const prevImg = images[idx - 1] ?? null
  const nextImg = images[idx + 1] ?? null

  // Slide style shared by left/right slots
  const sideSlideStyle: React.CSSProperties = {
    width: '100vw',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  return createPortal(
    <div
      className="fixed inset-0"
      style={{
        zIndex: 9999,
        backgroundColor: `rgba(0,0,0,${bgAlpha})`,
        transition: bgTransition,
        touchAction: 'none',
      }}
      onClick={closeTap}
      onTouchStart={e => {
        e.stopPropagation()
        if (closingRef.current) return

        if (e.touches.length === 2) {
          isPinchingRef.current = true
          setIsPinching(true)
          setIsPanning(false)
          prevPinchDist.current = getPinchDist(e.touches)
          prevPinchMidX.current = (e.touches[0].clientX + e.touches[1].clientX) / 2 - window.innerWidth / 2
          prevPinchMidY.current = (e.touches[0].clientY + e.touches[1].clientY) / 2 - window.innerHeight / 2
          return
        }

        startX.current = e.touches[0].clientX
        startY.current = e.touches[0].clientY
        startTime.current = Date.now()
        dragDir.current = null
        panStartX.current = panXRef.current
        panStartY.current = panYRef.current
        if (scaleRef.current > 1) setIsPanning(true)
      }}
      onTouchMove={e => {
        e.stopPropagation()
        if (closingRef.current) return

        if (e.touches.length === 2) {
          if (!isPinchingRef.current) {
            isPinchingRef.current = true
            setIsPinching(true)
            setIsPanning(false)
            prevPinchDist.current = getPinchDist(e.touches)
            prevPinchMidX.current = (e.touches[0].clientX + e.touches[1].clientX) / 2 - window.innerWidth / 2
            prevPinchMidY.current = (e.touches[0].clientY + e.touches[1].clientY) / 2 - window.innerHeight / 2
          }
          const dist = getPinchDist(e.touches)
          const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - window.innerWidth / 2
          const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - window.innerHeight / 2

          const rawScale = scaleRef.current * (dist / prevPinchDist.current)
          const newScale = Math.max(1, Math.min(MAX_SCALE, rawScale))
          const actualRatio = newScale / scaleRef.current
          const newPanX = mx + actualRatio * (panXRef.current - prevPinchMidX.current)
          const newPanY = my + actualRatio * (panYRef.current - prevPinchMidY.current)

          setScale(newScale)
          if (newScale <= 1) { setPanX(0); setPanY(0) }
          else { setPanX(newPanX); setPanY(newPanY) }

          prevPinchDist.current = dist
          prevPinchMidX.current = mx
          prevPinchMidY.current = my
          return
        }

        if (e.touches.length === 1) {
          const dx = e.touches[0].clientX - startX.current
          const dy = e.touches[0].clientY - startY.current

          if (scaleRef.current > 1) {
            if (!isPanning) setIsPanning(true)
            setPanX(panStartX.current + dx)
            setPanY(panStartY.current + dy)
            return
          }

          if (dragDir.current === null) {
            if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
            dragDir.current = Math.abs(dy) >= Math.abs(dx) ? 'vert' : 'horiz'
          }

          if (dragDir.current === 'vert' && dy > 0) {
            setIsDragging(true)
            setDrag({ x: dx * 0.2, y: dy })
          }

          if (dragDir.current === 'horiz') {
            const i = idxRef.current
            const atEdge = (i === 0 && dx > 0) || (i === images.length - 1 && dx < 0)
            applyStrip(atEdge ? dx * 0.2 : dx, false)
          }
        }
      }}
      onTouchEnd={e => {
        e.stopPropagation()
        if (closingRef.current) return

        if (isPinchingRef.current && e.touches.length === 1) {
          startX.current = e.touches[0].clientX
          startY.current = e.touches[0].clientY
          panStartX.current = panXRef.current
          panStartY.current = panYRef.current
          dragDir.current = null
          return
        }

        if (e.touches.length === 0) {
          setIsPanning(false)

          if (isPinchingRef.current) {
            isPinchingRef.current = false
            setIsPinching(false)
            justPinchedRef.current = true
            setTimeout(() => { justPinchedRef.current = false }, 200)
          }

          if (scaleRef.current > 1) {
            setIsDragging(false)
            setDrag({ x: 0, y: 0 })
            return
          }

          const dx = e.changedTouches[0].clientX - startX.current
          const dy = e.changedTouches[0].clientY - startY.current
          const elapsed = Math.max(1, Date.now() - startTime.current)
          const vy = dy / elapsed

          if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
            if (!justPinchedRef.current) closeTap()
            return
          }

          if (dragDir.current === 'vert') {
            if (dy > CLOSE_THRESHOLD || (dy > 50 && vy > VELOCITY_THRESHOLD)) {
              closeSwipe()
            } else {
              setIsDragging(false)
              setDrag({ x: 0, y: 0 })
            }
            return
          }

          const canGoNext = dx < 0 && idxRef.current < images.length - 1
          const canGoPrev = dx > 0 && idxRef.current > 0
          if (Math.abs(dx) > 40 && (canGoNext || canGoPrev)) {
            slideToAdj(dx < 0 ? 1 : -1)
          } else {
            applyStrip(0, true)  // bounce back
          }
          setDrag({ x: 0, y: 0 })
        }
      }}
    >
      {/* Close button */}
      <button
        onClick={e => { e.stopPropagation(); closeTap() }}
        className="absolute right-4 flex items-center justify-center w-9 h-9 rounded-full"
        style={{
          top: 'calc(1rem + env(safe-area-inset-top, 0px))',
          background: 'rgba(255,255,255,0.15)',
          zIndex: 10,
          opacity: closeButtonOpacity,
          transition: 'opacity 200ms ease',
          pointerEvents: isDragging ? 'none' : 'auto',
        }}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* 3-slide strip container — clips overflow */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {/*
          Strip: 300vw wide, absolutely positioned at top-left.
          translateX(-100vw) brings the CENTER slot (starting at 100vw) to screen position 0.
          During drag: translateX(calc(-100vw + dragXpx)) follows the finger.
        */}
        <div
          ref={stripRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            display: 'flex',
            width: '300vw',
            height: '100%',
            alignItems: 'center',
            willChange: 'transform',
            transform: 'translateX(-100vw)',
          }}
        >
          {/* Left slot: prev image */}
          <div style={sideSlideStyle}>
            {prevImg && (
              <Image
                src={prevImg.url}
                alt=""
                width={0}
                height={0}
                sizes="100vw"
                style={{ width: '100%', height: 'auto', maxHeight: '90svh', objectFit: 'contain' }}
                draggable={false}
              />
            )}
          </div>

          {/* Center slot: current image — all animations apply here */}
          <div style={{ width: '100vw', flexShrink: 0 }}>
            <div
              onClick={e => e.stopPropagation()}
              style={{
                opacity: visible ? 1 : 0,
                transform: imgTransform,
                transition: imgTransition,
                width: '100%',
                willChange: 'transform, opacity',
              }}
            >
              <Image
                src={images[idx].url}
                alt=""
                width={0}
                height={0}
                sizes="100vw"
                style={{ width: '100%', height: 'auto', maxHeight: '90svh', objectFit: 'contain' }}
                draggable={false}
              />
            </div>
          </div>

          {/* Right slot: next image */}
          <div style={sideSlideStyle}>
            {nextImg && (
              <Image
                src={nextImg.url}
                alt=""
                width={0}
                height={0}
                sizes="100vw"
                style={{ width: '100%', height: 'auto', maxHeight: '90svh', objectFit: 'contain' }}
                draggable={false}
              />
            )}
          </div>
        </div>
      </div>

      {/* Navigation: arrows + dots */}
      {images.length > 1 && (
        <>
          {idx > 0 && (
            <button
              onClick={e => { e.stopPropagation(); slideToAdj(-1) }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.15)',
                zIndex: 10,
                opacity: uiOpacity,
                transition: 'opacity 200ms ease',
                pointerEvents: isDragging || scale > 1 ? 'none' : 'auto',
              }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          {idx < images.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); slideToAdj(1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.15)',
                zIndex: 10,
                opacity: uiOpacity,
                transition: 'opacity 200ms ease',
                pointerEvents: isDragging || scale > 1 ? 'none' : 'auto',
              }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          )}
          <div
            className="absolute inset-x-0 flex justify-center gap-1.5 pointer-events-none"
            style={{
              bottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
              zIndex: 10,
              opacity: uiOpacity,
              transition: 'opacity 200ms ease',
            }}
          >
            {images.map((_, i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'white', opacity: i === idx ? 1 : 0.35, transition: 'opacity 200ms' }}
              />
            ))}
          </div>
        </>
      )}
    </div>,
    document.body
  )
}
