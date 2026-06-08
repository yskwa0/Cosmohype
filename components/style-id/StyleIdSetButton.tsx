'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { StyleId } from '@/lib/style-id/types'

type Props = {
  styleId: StyleId
  isLoggedIn: boolean
  encodedResult: string
}

export function StyleIdSetButton({ styleId, isLoggedIn, encodedResult }: Props) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoggedIn) {
      localStorage.setItem('cosmohype_pending_style_id', styleId)
    }
  }, [styleId, isLoggedIn])

  const handleSet = async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/login'
      return
    }
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ style_id: styleId })
      .eq('id', user.id)
    if (updateError) {
      setError('設定に失敗しました。もう一度お試しください。')
      setLoading(false)
      return
    }
    setDone(true)
    setLoading(false)
  }

  // ログイン後に結果ページへ戻るためのリダイレクトURL
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
          プロフィールに設定する
        </p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-sub)' }}>
          同じ感性の人に見つけてもらいやすくなります
        </p>
      </div>

      {isLoggedIn ? (
        <>
          {done ? (
            <div className="flex flex-col gap-2">
              <div
                className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold"
                style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--purple)', border: '1px solid var(--border)' }}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                STYLE IDをプロフィールに設定しました
              </div>
              <Link
                href="/profile/me"
                className="text-xs text-center transition-opacity active:opacity-60"
                style={{ color: 'var(--text-muted)' }}
              >
                プロフィールを見る →
              </Link>
            </div>
          ) : (
            <button
              onClick={handleSet}
              disabled={loading}
              className="w-full py-3 rounded-xl flex items-center justify-center text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
              }}
            >
              {loading ? '設定中...' : 'このSTYLE IDをプロフィールに設定する'}
            </button>
          )}
          {error && (
            <p className="text-xs text-center" style={{ color: 'rgba(252,165,165,0.9)' }}>
              {error}
            </p>
          )}
        </>
      ) : (
        <Link
          href={loginHref}
          onClick={() => localStorage.setItem('cosmohype_pending_style_id', styleId)}
          className="w-full py-3 rounded-xl flex items-center justify-center text-sm font-bold transition-all active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
          }}
        >
          ログイン / 登録してプロフィールに設定
        </Link>
      )}
    </div>
  )
}
