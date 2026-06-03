'use client'
import { useEffect } from 'react'
import Image from 'next/image'

export function ConfirmedClient({ needsSetup }: { needsSetup: boolean }) {
  useEffect(() => {
    async function redirectIfNative() {
      const { Capacitor } = await import('@capacitor/core')
      if (!Capacitor.isNativePlatform()) return
      window.location.href = needsSetup ? '/profile/setup' : '/feed'
    }
    redirectIfNative()
  }, [needsSetup])

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '48px',
        paddingRight: '24px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 48px)',
        paddingLeft: '24px',
        background: 'linear-gradient(to bottom, #090714 0%, #1A0533 20%, #2D0A5F 50%, #1A0533 80%, #090714 100%)',
        boxSizing: 'border-box',
        textAlign: 'center',
      }}
    >
      <Image
        src="/cosmohypelogo.png"
        alt="Cosmohype"
        width={180}
        height={56}
        style={{ objectFit: 'contain', marginBottom: '40px' }}
        priority
      />

      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
        }}
      >
        <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>

      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#FFFFFF', marginBottom: '12px' }}>
        メールアドレスの認証が完了しました
      </h1>

      <p style={{ fontSize: '15px', color: '#C4B5FD', lineHeight: 1.7, marginBottom: '32px', maxWidth: '320px' }}>
        Cosmohypeアプリに戻って、ログインしてください。
      </p>

      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>
        アプリが見つからない場合は、App Storeから<br />Cosmohypeをダウンロードしてください。
      </p>
    </div>
  )
}
