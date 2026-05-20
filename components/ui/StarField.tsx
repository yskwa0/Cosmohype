'use client'
import { useEffect, useState } from 'react'

type Star = {
  x: number; y: number
  size: number
  duration: number; delay: number
  purple: boolean
}

export function StarField() {
  const [stars, setStars] = useState<Star[]>([])

  useEffect(() => {
    const generated: Star[] = Array.from({ length: 80 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() < 0.15 ? Math.random() * 1.5 + 1.5 : Math.random() * 1 + 0.5,
      duration: Math.random() * 4 + 2,
      delay: Math.random() * 6,
      purple: Math.random() < 0.2,
    }))
    setStars(generated)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 65%)', animation: 'nebula-pulse 8s ease-in-out infinite' }} />
      <div className="absolute bottom-[15%] right-[10%] w-72 h-72 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 65%)', animation: 'nebula-pulse 11s 3s ease-in-out infinite' }} />
      {stars.map((star, i) => (
        <div key={i} className="absolute rounded-full"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            background: star.purple ? '#C084FC' : '#FFFFFF',
            boxShadow: star.size > 1.8
              ? star.purple ? '0 0 4px #C084FC, 0 0 8px rgba(192,132,252,0.5)' : '0 0 4px #fff, 0 0 8px rgba(255,255,255,0.4)'
              : 'none',
            animation: `${star.size > 1.5 ? 'twinkle' : 'twinkle-slow'} ${star.duration}s ${star.delay}s ease-in-out infinite`,
            willChange: 'opacity',
          }}
        />
      ))}
    </div>
  )
}
