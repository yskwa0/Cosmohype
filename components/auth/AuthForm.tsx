'use client'
import { useState, InputHTMLAttributes } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function DarkInput({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[#9B97B2] uppercase tracking-widest">{label}</label>
      <input
        className="w-full px-4 py-3 rounded-xl text-[#111118] placeholder:text-[#D1CAEC] text-sm focus:outline-none transition-all"
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(124,58,237,0.15)',
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.45)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.15)' }}
        {...props}
      />
    </div>
  )
}

type Mode = 'login' | 'register'

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
        router.push('/feed')
        router.refresh()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'エラーが発生しました'
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#FAFAFA]">

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black tracking-tighter mb-1"
            style={{ background: 'linear-gradient(90deg, #7C3AED 0%, #A855F7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Cosmohype
          </h1>
          <p className="text-sm text-[#9B97B2]">ファッションで、自分を表現しよう</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DarkInput
            label="メールアドレス"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            autoComplete="email"
          />
          <DarkInput
            label="パスワード"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={mode === 'register' ? '8文字以上' : 'パスワード'}
            required
            minLength={mode === 'register' ? 8 : undefined}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />

          {error && (
            <p className="text-sm text-red-400 rounded-xl px-4 py-3"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          )}
          {message && (
            <p className="text-sm text-[#A855F7] rounded-xl px-4 py-3"
              style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl text-white font-semibold mt-2 transition-opacity disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)', boxShadow: '0 4px 20px rgba(168,85,247,0.4)' }}
          >
            {loading
              ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : mode === 'register' ? 'アカウントを作成' : 'ログイン'
            }
          </button>
        </form>

        <p className="text-center text-sm text-[#4A4468] mt-6">
          {mode === 'login' ? (
            <>アカウントをお持ちでない方は{' '}
              <Link href="/register" className="text-[#A855F7] font-medium">新規登録</Link>
            </>
          ) : (
            <>すでにアカウントをお持ちの方は{' '}
              <Link href="/login" className="text-[#A855F7] font-medium">ログイン</Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
