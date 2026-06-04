'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const STORAGE_KEY = 'styleIdPromoDismissedDate'

function getTodayKey() {
  return new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'
}

export function StyleIdPromoModal({ show }: { show: boolean }) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!show) return
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY)
      if (dismissed === getTodayKey()) return
    } catch {
      // localStorage unavailable — show the modal anyway
    }
    // Small delay so the profile page renders first
    const t = setTimeout(() => setVisible(true), 600)
    return () => clearTimeout(t)
  }, [show])

  function handleLater() {
    try {
      localStorage.setItem(STORAGE_KEY, getTodayKey())
    } catch {
      // ignore
    }
    setVisible(false)
  }

  function handleGoToStyleId() {
    setVisible(false)
    router.push('/style-id')
  }

  if (!mounted || !visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-4"
      style={{
        background: 'rgba(0,0,0,0.62)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
      }}
      onClick={handleLater}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(160deg, #1A0533 0%, #0D0A1F 60%, #0A0714 100%)',
          border: '1px solid rgba(124,58,237,0.35)',
          boxShadow: '0 0 40px rgba(124,58,237,0.18), 0 24px 48px rgba(0,0,0,0.5)',
          maxHeight: 'calc(100dvh - 120px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Purple glow top strip */}
        <div style={{ height: 3, flexShrink: 0, background: 'linear-gradient(90deg, transparent, #7C3AED, #A855F7, transparent)' }} />

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 pt-5 pb-2">
          {/* Icon */}
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.3)' }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#A855F7" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-base font-bold mb-2" style={{ color: '#EDE9FE' }}>
            まだプロフィールにSTYLE IDが設定されていません
          </h2>

          {/* Body */}
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(196,181,253,0.8)' }}>
            STYLE ID診断をすると、自分に近いファッション系統がわかります。
            <br /><br />
            診断後は「プロフィールを編集」から、自分のSTYLE IDを設定できます。
            STYLE IDを設定すると、COSMOで感性や雰囲気が近い人のスタイルを見つけやすくなり、コーデの参考にもなります。
          </p>
        </div>

        {/* Buttons — always visible, outside scroll area */}
        <div className="px-6 pt-4 pb-5 flex-shrink-0">
          <button
            onClick={handleGoToStyleId}
            className="w-full h-12 rounded-2xl text-sm font-bold mb-3 transition-opacity active:opacity-80"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
            }}
          >
            STYLE ID診断をする
          </button>
          <button
            onClick={handleLater}
            className="w-full h-10 rounded-2xl text-sm transition-opacity active:opacity-60"
            style={{ color: 'rgba(196,181,253,0.55)' }}
          >
            あとで
          </button>
        </div>
      </div>
    </div>
  )
}
