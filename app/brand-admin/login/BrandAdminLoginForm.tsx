'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { pressableClass, Spinner } from '@/lib/brandAdminUi'

// Cosmohype iOS アプリの App Store URL (既存資産、DB 管理外)。
// Brand Admin 直接訪問者向けのアカウント作成導線として、外部リンクで開く。
const COSMOHYPE_APP_STORE_URL =
  'https://apps.apple.com/app/cosmohype/id6775345816'

interface Props {
  initialError?: string | null
  /** login 成功後の遷移先 (safeRedirect 済、default: /brand-admin) */
  redirectPath?: string
}

/**
 * Brand Admin ログインフォーム。
 * 通常 Web と同一 Supabase Auth session を使う (二重 session 管理はしない)。
 * ログイン成功 → redirectPath (未指定なら /brand-admin) に飛ぶ。
 * protected layout 側で shop_brand_members active を再検証し、
 * 無ければ /brand-admin/login?err=no_membership に戻る。
 *
 * 【UI: 補助導線】
 * ログインフォームの下に区切り線を挟んで、Cosmohype アカウント未所持の
 * ブランド担当者向けに App Store 誘導を表示する。 login flow / auth / redirect
 * の実装は一切変更していない (UI 追加のみ)。
 */
export default function BrandAdminLoginForm({
  initialError = null,
  redirectPath = '/brand-admin',
}: Props) {
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
      router.replace(redirectPath)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-100 py-14">
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
            className={
              'w-full h-11 mt-2 inline-flex items-center justify-center gap-2 ' +
              'bg-white text-neutral-900 rounded-md text-sm font-semibold disabled:opacity-40 ' +
              pressableClass
            }
          >
            {isSubmitting && <Spinner />}
            {isSubmitting ? 'サインイン中…' : 'サインイン'}
          </button>
        </form>

        {/* 区切り */}
        <div className="mt-10 border-t border-neutral-800" aria-hidden />

        {/* Cosmohype アカウント未所持者向け案内 */}
        <section className="mt-8" aria-labelledby="brand-admin-no-account-heading">
          <h2
            id="brand-admin-no-account-heading"
            className="text-sm font-semibold tracking-wide text-neutral-100 mb-3"
          >
            Cosmohype アカウントをお持ちでない方
          </h2>
          <p className="text-[12px] text-neutral-400 leading-relaxed mb-5">
            Brand Admin をご利用いただくには、Cosmohype アカウントが必要です。<br />
            Cosmohype アプリをダウンロードしてアカウントを作成後、こちらの画面から
            同じメールアドレスでログインしてください。
          </p>
          <a
            href={COSMOHYPE_APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={
              'w-full h-11 flex items-center justify-center gap-2 ' +
              'bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-md ' +
              'text-sm font-semibold ' +
              pressableClass
            }
          >
            {/* 既存 landing/AuthForm と同じ Apple 風 SVG (currentColor 追従) */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17.05 12.53a4.19 4.19 0 0 1 2-3.52 4.28 4.28 0 0 0-3.38-1.83c-1.42-.15-2.79.84-3.51.84-.74 0-1.85-.82-3.05-.8a4.5 4.5 0 0 0-3.79 2.3c-1.63 2.82-.42 7 1.16 9.29.77 1.12 1.68 2.38 2.87 2.34 1.15-.05 1.59-.74 2.98-.74 1.39 0 1.79.74 3.01.72 1.24-.02 2.03-1.14 2.79-2.27a10.1 10.1 0 0 0 1.27-2.6 4.06 4.06 0 0 1-2.35-3.73zM14.7 5.32a4.11 4.11 0 0 0 .93-2.95 4.19 4.19 0 0 0-2.72 1.41 3.92 3.92 0 0 0-.95 2.86 3.46 3.46 0 0 0 2.74-1.32z" />
            </svg>
            App Store で Cosmohype を開く
          </a>
          <p className="mt-4 text-[11px] text-neutral-500 leading-relaxed text-center">
            すでに Cosmohype アカウントをお持ちの方は、<br />
            上のフォームからログインしてください。
          </p>
        </section>
      </div>
    </div>
  )
}
