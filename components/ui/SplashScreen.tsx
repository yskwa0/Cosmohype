'use client'
import { useEffect, useState } from 'react'

const SESSION_KEY = '_ch_splash'
type Phase = 'show' | 'fadeout' | 'gone'

export function SplashScreen() {
  // ssr: false で動的インポートされるため window / sessionStorage は必ず存在する。
  // 初期値でsessionStorageを確認し、表示済みなら最初から 'gone' にする。
  const [phase, setPhase] = useState<Phase>(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return 'gone'
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch { /* private/incognito */ }
    return 'show'
  })

  useEffect(() => {
    if (phase !== 'show') return
    // SplashFallback背景(即時) + ロゴフェードイン(0.3s) + 表示(1.5s) = 1800ms → フェードアウト開始
    const t1 = setTimeout(() => setPhase('fadeout'), 1800)
    const t2 = setTimeout(() => setPhase('gone'), 2300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [phase])

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
        opacity: phase === 'fadeout' ? 0 : 1,
        transition: phase === 'fadeout' ? 'opacity 0.5s ease-out' : 'none',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/cosmohypelogo.png"
        alt="Cosmohype"
        className="splash-logo-in"
        style={{
          width: '180px',
          height: 'auto',
          display: 'block',
        }}
      />
    </div>
  )
}
