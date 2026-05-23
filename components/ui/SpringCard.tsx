'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SpringCard({ href, gradient, dots, label, infoButton, children }: {
  href: string
  gradient: string
  dots: [number, number][]
  label: string
  infoButton?: React.ReactNode
  children: React.ReactNode
}) {
  const [pressed, setPressed] = useState(false)
  const router = useRouter()

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    setPressed(false)
    // Wait 2 frames so the reset renders before navigation starts
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        router.push(href)
      })
    })
  }

  return (
    <div className="relative w-full">
      <div
        role="link"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(e as unknown as React.MouseEvent) }}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        style={{
          display: 'block',
          cursor: 'pointer',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          transform: pressed ? 'scale(0.88)' : 'scale(1)',
          transition: pressed
            ? 'transform 80ms ease-in'
            : 'transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div
          className="rounded-2xl overflow-hidden relative flex flex-col items-center justify-center gap-2 px-3 py-4 w-full"
          style={{ background: gradient, aspectRatio: '1/1' }}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 160 160" preserveAspectRatio="xMidYMid slice" aria-hidden>
            {dots.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={i % 2 === 0 ? 1.5 : 1} fill="white" opacity={0.2 + (i % 4) * 0.1} />
            ))}
          </svg>
          <div className="relative flex items-center justify-center">
            {children}
          </div>
          <p className="relative text-[11px] font-semibold text-center tracking-wide text-white opacity-90">{label}</p>
        </div>
      </div>
      {infoButton && (
        <div className="absolute top-2 right-2 z-10">
          {infoButton}
        </div>
      )}
    </div>
  )
}
