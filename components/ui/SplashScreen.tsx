'use client'
import { useEffect, useState } from 'react'

const SESSION_KEY = '_ch_splash'

const STARS = [
  { top: '8%',  left: '12%', size: 2,   opacity: 0.55 },
  { top: '14%', left: '78%', size: 1.5, opacity: 0.45 },
  { top: '6%',  left: '48%', size: 1,   opacity: 0.65 },
  { top: '28%', left: '93%', size: 2,   opacity: 0.35 },
  { top: '38%', left: '4%',  size: 1.5, opacity: 0.50 },
  { top: '70%', left: '7%',  size: 2,   opacity: 0.55 },
  { top: '82%', left: '88%', size: 1.5, opacity: 0.45 },
  { top: '90%', left: '32%', size: 1,   opacity: 0.40 },
  { top: '60%', left: '96%', size: 1.5, opacity: 0.50 },
  { top: '5%',  left: '25%', size: 1,   opacity: 0.50 },
  { top: '94%', left: '62%', size: 1.5, opacity: 0.45 },
  { top: '76%', left: '52%', size: 1,   opacity: 0.35 },
]

export function SplashScreen() {
  // Start visible so SSR and client hydration agree (no mismatch).
  // useEffect immediately hides if session already seen.
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) {
        setVisible(false)
        return
      }
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch { /* private/incognito */ }
    const t = setTimeout(() => setVisible(false), 1800)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

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
      }}
    >
      {/* Stars */}
      {STARS.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: s.top,
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            borderRadius: '50%',
            background: '#ffffff',
            opacity: s.opacity,
          }}
        />
      ))}

      {/* Nebula glow — pure radial-gradient fading to transparent; no filter:blur to avoid rectangular artifact */}
      <div
        style={{
          position: 'absolute',
          width: '520px',
          height: '520px',
          background: 'radial-gradient(ellipse at center, rgba(139,58,237,0.55) 0%, rgba(168,85,247,0.3) 22%, rgba(124,58,237,0.12) 50%, rgba(100,40,200,0.04) 68%, transparent 80%)',
        }}
      />

      {/* Logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/cosmohypelogo.png"
        alt="Cosmohype"
        style={{
          width: '180px',
          height: 'auto',
          display: 'block',
          position: 'relative',
          filter: 'drop-shadow(0 0 20px rgba(168,85,247,0.75))',
        }}
      />
    </div>
  )
}
