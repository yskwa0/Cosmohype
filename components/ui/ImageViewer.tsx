'use client'

import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { PostImage } from '@/types/database'

const CLOSE_THRESHOLD = 120  // px downward to trigger close
const VELOCITY_THRESHOLD = 0.5  // px/ms

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

  const startX = useRef(0)
  const startY = useRef(0)
  const startTime = useRef(0)
  const dragDir = useRef<'horiz' | 'vert' | null>(null)
  const closingRef = useRef(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function closeTap() {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    setVisible(false)
    setTimeout(onClose, 220)
  }

  function closeSwipe() {
    if (closingRef.current) return
    closingRef.current = true
    setSwipeOut(true)
    setClosing(true)
    setIsDragging(false)
    setVisible(false)
    setTimeout(onClose, 300)
  }

  // Background dims as user drags down
  const dragRatio = Math.min(Math.max(drag.y, 0) / CLOSE_THRESHOLD, 1)
  const bgAlpha = visible
    ? (isDragging ? Math.max(0.15, 0.93 - dragRatio * 0.78) : 0.93)
    : 0

  // Image transform — swipeOut flies the image further in the drag direction
  const ty = swipeOut ? drag.y + 420 : drag.y
  const imgScale = visible ? 1 : (closing && !swipeOut ? 0.95 : 0.88)
  const imgTransform = `translate(${drag.x}px, ${ty}px) scale(${imgScale})`

  const imgTransition = isDragging
    ? 'none'
    : swipeOut
      ? 'transform 300ms ease-in, opacity 260ms ease-in'
      : closing
        ? 'transform 210ms ease-in, opacity 210ms ease-in'
        : 'transform 340ms cubic-bezier(0.34, 1.4, 0.64, 1), opacity 280ms ease-out'

  const bgTransition = isDragging
    ? 'none'
    : closing
      ? 'background-color 260ms ease-in'
      : 'background-color 280ms ease-out'

  const uiOpacity = visible && !isDragging ? 1 : 0

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 9999,
        backgroundColor: `rgba(0,0,0,${bgAlpha})`,
        transition: bgTransition,
        touchAction: 'none',
      }}
      onClick={closeTap}
      onTouchStart={e => {
        e.stopPropagation()
        startX.current = e.touches[0].clientX
        startY.current = e.touches[0].clientY
        startTime.current = Date.now()
        dragDir.current = null
      }}
      onTouchMove={e => {
        e.stopPropagation()
        const dx = e.touches[0].clientX - startX.current
        const dy = e.touches[0].clientY - startY.current

        if (dragDir.current === null) {
          if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
          dragDir.current = Math.abs(dy) >= Math.abs(dx) ? 'vert' : 'horiz'
        }

        if (dragDir.current === 'vert') {
          setIsDragging(true)
          setDrag({ x: dx * 0.2, y: dy })
        }
      }}
      onTouchEnd={e => {
        e.stopPropagation()
        const dx = e.changedTouches[0].clientX - startX.current
        const dy = e.changedTouches[0].clientY - startY.current
        const elapsed = Math.max(1, Date.now() - startTime.current)
        const vy = dy / elapsed

        // Tap → close
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
          closeTap()
          return
        }

        if (dragDir.current === 'vert') {
          if (dy > CLOSE_THRESHOLD || (dy > 50 && vy > VELOCITY_THRESHOLD)) {
            closeSwipe()
          } else {
            // Spring back to center
            setIsDragging(false)
            setDrag({ x: 0, y: 0 })
          }
          return
        }

        // Horizontal swipe → change image
        if (Math.abs(dx) > 40) {
          if (dx < 0 && idx < images.length - 1) setIdx(i => i + 1)
          else if (dx > 0 && idx > 0) setIdx(i => i - 1)
        }
        setDrag({ x: 0, y: 0 })
      }}
    >
      {/* Close button — hides during drag */}
      <button
        onClick={e => { e.stopPropagation(); closeTap() }}
        className="absolute right-4 flex items-center justify-center w-9 h-9 rounded-full"
        style={{
          top: 'calc(1rem + env(safe-area-inset-top, 0px))',
          background: 'rgba(255,255,255,0.15)',
          zIndex: 1,
          opacity: uiOpacity,
          transition: 'opacity 200ms ease',
          pointerEvents: isDragging ? 'none' : 'auto',
        }}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Image */}
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

      {/* Multi-image navigation — hide during drag */}
      {images.length > 1 && (
        <>
          {idx > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setIdx(i => i - 1) }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.15)',
                opacity: uiOpacity,
                transition: 'opacity 200ms ease',
                pointerEvents: isDragging ? 'none' : 'auto',
              }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          {idx < images.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); setIdx(i => i + 1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.15)',
                opacity: uiOpacity,
                transition: 'opacity 200ms ease',
                pointerEvents: isDragging ? 'none' : 'auto',
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
