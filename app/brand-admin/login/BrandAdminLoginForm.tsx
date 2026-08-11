'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  initialError?: string | null
}

/**
 * Brand Admin ログインフォーム。
 * 通常 Web と同一 Supabase Auth session を使う (二重 session 管理はしない)。
 * ログイン成功 → /brand-admin に飛ぶ。protected layout 側で
 * shop_brand_members active を再検証し、無ければ /brand-admin/login?err=no_membership に戻る。
 */
export default function BrandAdminLoginForm({ initialError = null }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(initialError)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return
    setError(null)
    setSubmitting(true)
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (authErr) {
        setError('メールまたはパスワードが正しくありません。')
        return
      }
      router.replace('/brand-admin')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-100">
      <div className="w-full max-w-sm px-8">
        <div className="text-center mb-10">
          <div className="text-[10px] tracking-[0.3em] text-neutral-500 mb-3">
            HYPE
          </div>
          <div className="text-lg font-semibold tracking-wide">
            Brand Admin
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] tracking-widest text-neutral-500 mb-1">
              EMAIL
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-3 bg-neutral-900 border border-neutral-800 rounded-md text-sm outline-none focus:border-neutral-500"
            />
          </div>
          <div>
            <label className="block text-[10px] tracking-widest text-neutral-500 mb-1">
              PASSWORD
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-3 bg-neutral-900 border border-neutral-800 rounded-md text-sm outline-none focus:border-neutral-500"
            />
          </div>
          {error && (
            <div className="text-[11px] text-red-400 leading-relaxed">{error}</div>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !email || !password}
            className="w-full h-11 mt-2 bg-white text-neutral-900 rounded-md text-sm font-semibold disabled:opacity-40"
          >
            {isSubmitting ? 'サインイン中…' : 'サインイン'}
          </button>
        </form>
        <div className="mt-8 text-[10px] text-neutral-500 leading-relaxed text-center">
          Brand Admin はブランド担当者専用です。
          <br />
          アカウント作成はブランドマネージャーまたは Cosmohype 運営までお問い合わせください。
        </div>
      </div>
    </div>
  )
}
