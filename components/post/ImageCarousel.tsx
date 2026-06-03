'use client'
import Image from 'next/image'
import { useState, useRef } from 'react'
import type { PostImage } from '@/types/database'

const SWIPE_THRESHOLD = 40

interface Props {
  images: PostImage[]
  alt?: string
  sizes?: string
  priority?: boolean
  className?: string
  aspectRatio?: string | null
  onTap?: (e: React.MouseEvent<HTMLDivElement>) => void
  onIndexChange?: (idx: number) => void
  children?: React.ReactNode
}

export function ImageCarousel({
  images, alt = '', sizes, priority, className = '',
  aspectRatio, onTap, onIndexChange, children,
}: Props) {
  const [idx, setIdx] = useState(0)
  // Refs: idxRef avoids stale closures; stripRef drives animation without re-renders
  const idxRef = useRef(0)
  const stripRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const dirRef = useRef<'h' | 'v' | null>(null)
  const swipedRef = useRef(false)

  if (images.length === 0) return null

  function applyTransform(dragX: number, animate: boolean) {
    if (!stripRef.current) return
    stripRef.current.style.transition = animate
      ? 'transform 280ms cubic-bezier(0.25,0.46,0.45,0.94)'
      : 'none'
    stripRef.current.style.transform =
      `translateX(calc(${-idxRef.current * 100}% + ${dragX}px))`
  }

  function goTo(next: number) {
    const clamped = Math.max(0, Math.min(images.length - 1, next))
    idxRef.current = clamped
    applyTransform(0, true)
    setIdx(clamped)          // only re-render for dots
    onIndexChange?.(clamped)
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (swipedRef.current) {
      e.stopPropagation()
      return
    }
    onTap?.(e)
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ touchAction: 'pan-y' }}
      onClick={handleClick}
      onTouchStart={e => {
        startX.current = e.touches[0].clientX
        startY.current = e.touches[0].clientY
        dirRef.current = null
        swipedRef.current = false
      }}
      onTouchMove={e => {
        const dx = e.touches[0].clientX - startX.current
        const dy = e.touches[0].clientY - startY.current

        if (dirRef.current === null) {
          if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return
          dirRef.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
        }

        if (dirRef.current === 'h') {
          const i = idxRef.current
          const atStart = i === 0 && dx > 0
          const atEnd = i === images.length - 1 && dx < 0
          applyTransform(atStart || atEnd ? dx * 0.2 : dx, false)
        }
      }}
      onTouchEnd={e => {
        const dx = e.changedTouches[0].clientX - startX.current

        if (dirRef.current === 'h') {
          if (Math.abs(dx) >= SWIPE_THRESHOLD) {
            swipedRef.current = true
            goTo(dx < 0 ? idxRef.current + 1 : idxRef.current - 1)
          } else {
            if (Math.abs(dx) >= 8) swipedRef.current = true
            applyTransform(0, true)
          }
        }
      }}
    >
      {/* Sliding strip — transformed via DOM ref, zero React re-renders during drag */}
      <div
        ref={stripRef}
        style={{ display: 'flex', alignItems: 'flex-start', willChange: 'transform' }}
      >
        {images.map((img, i) => {
          const ratioCSS = aspectRatio ? aspectRatio.replace(':', '/') : null
          return (
            <div
              key={img.id ?? i}
              style={{
                minWidth: '100%',
                flexShrink: 0,
                ...(ratioCSS ? { position: 'relative', aspectRatio: ratioCSS } : {}),
              }}
            >
              {ratioCSS ? (
                <Image
                  src={img.url}
                  alt={alt}
                  fill
                  sizes={sizes}
                  style={{ objectFit: 'cover' }}
                  priority={priority && i === 0}
                  draggable={false}
                />
              ) : (
                <Image
                  src={img.url}
                  alt={alt}
                  width={0}
                  height={0}
                  sizes={sizes}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                  priority={priority && i === 0}
                  draggable={false}
                />
              )}
            </div>
          )
        })}
      </div>

      {children}

      {images.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
          {images.map((_, i) => (
            <span
              key={i}
              style={{
                display: 'block',
                height: 5,
                width: i === idx ? 18 : 5,
                borderRadius: 9999,
                background: i === idx ? 'white' : 'rgba(255,255,255,0.5)',
                transition: 'width 180ms ease, background 180ms ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
