'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  title: string
  description: string
}

export function CardInfoButton({ title, description }: Props) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  function handleOpen(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setOpen(true)
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="absolute top-3 right-3 z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold leading-none"
        style={{ background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.85)' }}
        aria-label="機能の説明を見る"
      >
        ?
      </button>

      {mounted && open && createPortal(
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
          <div
            className="fixed bottom-24 left-4 right-4 z-[90] max-w-md mx-auto rounded-2xl p-5"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</h3>
              <button
                onClick={() => setOpen(false)}
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
                aria-label="閉じる"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-muted)' }}>
              {description || '（説明は準備中です）'}
            </p>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
