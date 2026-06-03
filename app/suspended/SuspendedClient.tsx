'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export function SuspendedClient() {
  useEffect(() => {
    createClient().auth.signOut()
  }, [])

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        background: 'linear-gradient(to bottom, #090714 0%, #1A0533 40%, #090714 100%)',
        boxSizing: 'border-box',
        textAlign: 'center',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
        }}
      >
        <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="rgba(252,165,165,0.85)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      </div>

      {/* Title */}
      <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#F5F3FF', marginBottom: '12px', lineHeight: 1.4 }}>
        このアカウントは停止されています
      </h1>

      {/* Description */}
      <p style={{ fontSize: '14px', color: 'rgba(196,186,224,0.8)', lineHeight: 1.8, marginBottom: '32px', maxWidth: '320px' }}>
        利用規約への違反が確認されたため、アカウントへのアクセスを停止しました。
        <br />
        ご不明な点はサポートまでお問い合わせください。
      </p>

      {/* Contact */}
      <a
        href="mailto:support@cosmohype.jp"
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          borderRadius: '12px',
          background: 'rgba(124,58,237,0.15)',
          border: '1px solid rgba(124,58,237,0.3)',
          color: '#A855F7',
          fontSize: '14px',
          fontWeight: 500,
          textDecoration: 'none',
          marginBottom: '24px',
        }}
      >
        support@cosmohype.jp
      </a>

      {/* Links */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
        <Link href="/terms" style={{ fontSize: '12px', color: 'rgba(168,85,247,0.6)', textDecoration: 'underline' }}>
          利用規約
        </Link>
        <Link href="/privacy" style={{ fontSize: '12px', color: 'rgba(168,85,247,0.6)', textDecoration: 'underline' }}>
          プライバシーポリシー
        </Link>
      </div>
    </div>
  )
}
