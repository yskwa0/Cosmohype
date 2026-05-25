'use client'
import { useEffect, useState } from 'react'

export function SplashScreen() {
  const [phase, setPhase] = useState<'show' | 'fade' | 'done'>('show')

  useEffect(() => {
    if (sessionStorage.getItem('splash_shown')) {
      setPhase('done')
      return
    }
    sessionStorage.setItem('splash_shown', '1')

    const t1 = setTimeout(() => setPhase('fade'), 1200)
    const t2 = setTimeout(() => setPhase('done'), 1600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (phase === 'done') return null

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'linear-gradient(to bottom, #0A0A1A 0%, #1A0533 20%, #2D0A5F 50%, #1A0533 80%, #0A0A1A 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: phase === 'fade' ? 0 : 1,
        transition: phase === 'fade' ? 'opacity 400ms ease-out' : 'none',
        pointerEvents: 'none',
      }}
    >
      {/* Purple nebula glow */}
      <div style={{ position: 'absolute', top: '25%', left: '50%', transform: 'translateX(-50%)', width: '360px', height: '360px', borderRadius: '50%', background: 'rgba(124,58,237,0.22)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(236,72,153,0.18)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/cosmohypelogo.png"
        alt="Cosmohype"
        style={{ position: 'relative', width: '168px', height: 'auto', display: 'block' }}
      />
    </div>
  )
}
