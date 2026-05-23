'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'register'

export function AuthForm({ mode }: { mode: Mode }) {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.backgroundColor
    const prevBody = body.style.backgroundColor
    html.style.backgroundColor = '#0A0A1A'
    body.style.backgroundColor = '#0A0A1A'
    return () => {
      html.style.backgroundColor = prevHtml
      body.style.backgroundColor = prevBody
    }
  }, [])

  async function handleAction() {
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
        })
        if (error) throw error
        setMessage('確認メールを送信しました。メールをご確認ください。')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.href = '/feed'
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Invalid login credentials')) {
        setError('メールアドレスまたはパスワードが正しくありません')
      } else if (msg.includes('User already registered')) {
        setError('このメールアドレスは既に登録されています')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', background: 'linear-gradient(to bottom, #0A0A1A 0%, #1A0533 20%, #2D0A5F 50%, #1A0533 80%, #0A0A1A 100%)', position: 'relative' }}
    >

      {/* 戻るボタン */}
      <Link
        href="/"
        aria-label="トップに戻る"
        style={{ position: 'absolute', top: '16px', left: '16px', width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(124,58,237,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
      >
        <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#7C3AED" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </Link>

      {/* 星エフェクト — pointer-events: none で操作を一切ブロックしない */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden>
        <div style={{ position: 'absolute', top: '25%', left: '50%', transform: 'translateX(-50%)', width: '384px', height: '384px', borderRadius: '50%', background: 'rgba(124,58,237,0.2)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '25%', right: '25%', width: '256px', height: '256px', borderRadius: '50%', background: 'rgba(236,72,153,0.2)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      </div>

      <div style={{ width: '100%', maxWidth: '384px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Image
            src="/cosmohypelogo.png"
            alt="Cosmohype"
            width={220}
            height={68}
            style={{ objectFit: 'contain', margin: '0 auto 8px' }}
            priority
          />
          <p style={{ fontSize: '14px', color: '#C4B5FD' }}>ファッションで、自分を表現しよう</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: '#9B97B2', textTransform: 'uppercase', letterSpacing: '0.1em' }}>メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', color: '#111118', background: '#FFFFFF', border: '1px solid rgba(124,58,237,0.15)', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: '#9B97B2', textTransform: 'uppercase', letterSpacing: '0.1em' }}>パスワード</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'register' ? '8文字以上' : 'パスワード'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              minLength={mode === 'register' ? 8 : undefined}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', color: '#111118', background: '#FFFFFF', border: '1px solid rgba(124,58,237,0.15)', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          {error && (
            <p style={{ fontSize: '14px', color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '12px 16px' }}>
              {error}
            </p>
          )}
          {message && (
            <p style={{ fontSize: '14px', color: '#A855F7', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '12px', padding: '12px 16px' }}>
              {message}
            </p>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleAction}
            style={{
              width: '100%',
              height: '48px',
              borderRadius: '12px',
              color: 'white',
              fontWeight: 600,
              fontSize: '15px',
              marginTop: '8px',
              background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
              border: 'none',
              cursor: 'pointer',
              opacity: loading ? 0.5 : 1,
              position: 'relative',
              zIndex: 100,
            }}
          >
            {loading ? '...' : mode === 'register' ? 'アカウントを作成' : 'ログイン'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginTop: '24px' }}>
          {mode === 'login' ? (
            <>アカウントをお持ちでない方は{' '}
              <Link href="/register" style={{ color: '#A855F7', fontWeight: 500 }}>新規登録</Link>
            </>
          ) : (
            <>すでにアカウントをお持ちの方は{' '}
              <Link href="/login" style={{ color: '#A855F7', fontWeight: 500 }}>ログイン</Link>
            </>
          )}
        </p>
      </div>

    </div>
  )
}
