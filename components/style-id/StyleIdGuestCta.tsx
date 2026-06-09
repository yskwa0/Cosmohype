'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import type { StyleId } from '@/lib/style-id/types'

// TODO: Set NEXT_PUBLIC_APP_STORE_URL in .env.local / Vercel env when App Store listing is live
// Example: NEXT_PUBLIC_APP_STORE_URL=https://apps.apple.com/app/cosmohype/id000000000

const PENDING_STYLE_KEY = 'cosmohype_pending_style_id'

type Props = {
  styleId: StyleId
  encodedResult: string
  appStoreUrl: string | null
}

export function StyleIdGuestCta({ styleId, encodedResult, appStoreUrl }: Props) {
  useEffect(() => {
    try {
      localStorage.setItem(PENDING_STYLE_KEY, styleId)
    } catch { /* ignore */ }
  }, [styleId])

  const loginHref = `/login?redirect=${encodeURIComponent(`/style-id/result?r=${encodedResult}`)}`

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
    >
      <div>
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--purple)' }}>
          STYLE ID
        </span>
        <p className="text-sm font-bold mt-1" style={{ color: 'var(--text)' }}>
          このSTYLE IDをCosmohypeで使ってみる
        </p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-sub)' }}>
          プロフィールにSTYLE IDを設定すると、同じ感性の人のコーデを見つけやすくなります。
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {/* Primary: Register */}
        <Link
          href="/register"
          onClick={() => {
            try { localStorage.setItem(PENDING_STYLE_KEY, styleId) } catch { /* ignore */ }
          }}
          className="w-full py-3 rounded-xl flex items-center justify-center text-sm font-bold transition-all active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
          }}
        >
          Cosmohypeをはじめる
        </Link>

        {/* App Store — shown only when URL is configured */}
        {appStoreUrl && (
          <a
            href={appStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all active:scale-[0.97]"
            style={{
              background: 'var(--bg-subtle)',
              color: 'var(--text-sub)',
              border: '1px solid var(--border)',
            }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.18 1.28-2.16 3.81.03 3.02 2.65 4.03 2.68 4.04l-.07.27zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            App Storeで開く
          </a>
        )}

        {/* Login for existing users */}
        <Link
          href={loginHref}
          className="text-xs text-center py-1 transition-opacity active:opacity-60"
          style={{ color: 'var(--text-muted)' }}
        >
          すでにアカウントをお持ちの方はこちら
        </Link>
      </div>
    </div>
  )
}
