'use client'
import { useState, useEffect } from 'react'

export function CosmoLoading({ delay = 0 }: { delay?: number }) {
  const [visible, setVisible] = useState(delay === 0)

  useEffect(() => {
    if (delay === 0) return
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'var(--bg)' }}
    >
      {/* ダイヤモンドスピナー */}
      <div className="relative mb-6" style={{ width: 48, height: 48 }}>
        {/* 外リング */}
        <svg
          viewBox="0 0 48 48"
          width={48}
          height={48}
          className="absolute inset-0"
          style={{ animation: 'cosmo-spin 2.4s linear infinite' }}
        >
          <circle
            cx={24} cy={24} r={20}
            fill="none"
            stroke="url(#cosmo-ring-grad)"
            strokeWidth={1.5}
            strokeDasharray="30 96"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="cosmo-ring-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
        </svg>

        {/* 中央ダイヤモンド */}
        <svg
          viewBox="0 0 60 60"
          width={22}
          height={22}
          className="absolute"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'cosmo-pulse 2.4s ease-in-out infinite',
          }}
        >
          <path d="M30 10 L50 30 L30 50 L10 30Z" fill="#FBCFE8" opacity={0.85} />
          <path d="M30 20 L40 30 L30 40 L20 30Z" fill="white" opacity={0.9} />
          <circle cx={30} cy={30} r={5} fill="#EC4899" />
        </svg>
      </div>

      {/* テキスト */}
      <p
        className="text-xs font-semibold tracking-widest uppercase"
        style={{
          color: 'var(--text-muted)',
          animation: 'cosmo-fade 2.4s ease-in-out infinite',
        }}
      >
        Tuning your Cosmo ID...
      </p>

      <style>{`
        @keyframes cosmo-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes cosmo-pulse {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(0.88); }
          50%       { opacity: 1;   transform: translate(-50%, -50%) scale(1);    }
        }
        @keyframes cosmo-fade {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.9; }
        }
      `}</style>
    </div>
  )
}
