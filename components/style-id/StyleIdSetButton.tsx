'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { StyleId } from '@/lib/style-id/types'

type Props = {
  styleId: StyleId
  isLoggedIn: boolean
  encodedResult: string
}

export function StyleIdSetButton({ styleId, isLoggedIn, encodedResult }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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
      router.push('/login')
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
    router.push('/profile/me')
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
            {loading ? '設定中...' : 'このSTYLE IDをプロフィールに設定'}
          </button>
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
