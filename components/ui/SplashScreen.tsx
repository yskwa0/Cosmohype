'use client'
import { useEffect, useState } from 'react'

const SESSION_KEY = '_ch_splash'

type Phase = 'show' | 'fade' | 'gone'

export function SplashScreen() {
  const [phase, setPhase] = useState<Phase>('show')

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) {
        setPhase('gone')
        return
      }
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch { /* private/incognito */ }

    // 1800ms 表示 → fade開始 → 550ms後にDOM削除
    const t1 = setTimeout(() => setPhase('fade'), 1800)
    const t2 = setTimeout(() => setPhase('gone'), 2350)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (phase === 'gone') return null

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        minHeight: '100dvh',
        zIndex: 99999,
        background: 'linear-gradient(160deg, #090714 0%, #1A0533 35%, #2D0A5F 60%, #090714 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        overflow: 'hidden',
        opacity: phase === 'fade' ? 0 : 1,
        transition: phase === 'fade' ? 'opacity 0.5s ease-out' : 'none',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/cosmohypelogo.png"
        alt="Cosmohype"
        style={{
          width: '180px',
          height: 'auto',
          display: 'block',
        }}
      />
    </div>
  )
}
