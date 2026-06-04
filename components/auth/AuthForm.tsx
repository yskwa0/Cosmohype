'use client'
import { useState } from 'react'
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

  async function handleAction() {
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
                ? `${window.location.origin}/api/auth/callback`
                : 'https://cosmohype.jp/api/auth/callback',
          },
        })
        if (error) throw error
        setMessage('確認メールを送信しました。メール内のリンクをタップして、登録を完了してください。')
        setLoading(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const params = new URLSearchParams(window.location.search)
        const redirectTo = params.get('redirect')
        const dest = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/feed'
        window.location.href = dest
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
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '64px',
        paddingRight: '24px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 64px)',
        paddingLeft: '24px',
        background: 'linear-gradient(to bottom, #090714 0%, #1A0533 20%, #2D0A5F 50%, #1A0533 80%, #090714 100%)',
        boxSizing: 'border-box',
      }}
    >
      {/* 戻るボタン */}
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 16px)', left: '16px' }}>
        <Link
          href="/"
          aria-label="トップに戻る"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(124,58,237,0.18)',
          }}
        >
          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#7C3AED" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
      </div>

      <div style={{ width: '100%', maxWidth: '384px' }}>
        {/* ロゴ */}
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

        {/* フォーム */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: '#9B97B2', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              メールアドレス
            </label>
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
            <label style={{ fontSize: '11px', fontWeight: 500, color: '#9B97B2', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              パスワード
            </label>
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
            <p style={{ fontSize: '14px', color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '12px 16px', margin: 0 }}>
              {error}
            </p>
          )}
          {message && (
            <p style={{ fontSize: '14px', color: '#A855F7', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '12px', padding: '12px 16px', margin: 0, whiteSpace: 'pre-line', lineHeight: '1.7' }}>
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={handleAction}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 600,
              color: '#FFFFFF',
              background: loading ? 'rgba(124,58,237,0.5)' : 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              touchAction: 'manipulation',
            }}
          >
            {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '登録する'}
          </button>

          {mode === 'register' && (
            <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.38)', lineHeight: 2.2 }}>
              登録することで、
              <Link href="/terms" style={{ color: '#A855F7', textDecoration: 'underline', textUnderlineOffset: '3px' }}>利用規約</Link>
              と
              <Link href="/privacy" style={{ color: '#A855F7', textDecoration: 'underline', textUnderlineOffset: '3px' }}>プライバシーポリシー</Link>
              に同意したものとみなされます。
            </p>
          )}
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

        {/* STYLE ID診断サブ導線 */}
        <Link
          href="/style-id"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: '14px',
            border: '1px solid rgba(124,58,237,0.25)',
            background: 'rgba(124,58,237,0.06)',
            textDecoration: 'none',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#A855F7' }}>
            まずはSTYLE ID診断を試す
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)' }}>
            登録前にあなたの系統をチェックできます
          </span>
        </Link>

        {mode === 'login' && (
          <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '32px' }}>
            <Link href="/terms" style={{ color: 'rgba(168,85,247,0.7)' }}>利用規約</Link>
            <span style={{ margin: '0 8px', color: 'rgba(255,255,255,0.2)' }}>·</span>
            <Link href="/privacy" style={{ color: 'rgba(168,85,247,0.7)' }}>プライバシーポリシー</Link>
          </p>
        )}
      </div>
    </div>
  )
}
