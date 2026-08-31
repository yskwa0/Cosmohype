'use client'

import { useState } from 'react'

interface Props {
  token:  string
  action: (formData: FormData) => Promise<void>
}

export default function HypeInviteSetupForm({ token, action }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (submitting) { e.preventDefault(); return }
    if (pw.length < 8)  { e.preventDefault(); alert('パスワードは 8 文字以上で入力してください。'); return }
    if (pw !== pw2)     { e.preventDefault(); alert('2 つのパスワードが一致しません。'); return }
    setSubmitting(true)
  }

  const inputCls =
    'w-full h-11 px-3 bg-neutral-900 border border-neutral-800 rounded-md text-sm outline-none focus:border-neutral-500 disabled:opacity-60'
  const labelCls = 'block text-[10px] tracking-widest text-neutral-500 mb-1'

  return (
    <form action={action} onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div>
        <label className={labelCls} htmlFor="password">パスワード</label>
        <input id="password" name="password" type="password" required minLength={8} maxLength={200}
               value={pw} onChange={(e) => setPw(e.target.value)}
               disabled={submitting} className={inputCls} autoComplete="new-password" />
      </div>

      <div>
        <label className={labelCls} htmlFor="password_confirm">パスワード (確認)</label>
        <input id="password_confirm" name="password_confirm" type="password" required minLength={8} maxLength={200}
               value={pw2} onChange={(e) => setPw2(e.target.value)}
               disabled={submitting} className={inputCls} autoComplete="new-password" />
      </div>

      <button
        type="submit"
        disabled={submitting || pw.length < 8 || pw !== pw2}
        className="w-full h-11 mt-3 inline-flex items-center justify-center gap-2 bg-white text-neutral-900 rounded-md text-sm font-semibold disabled:opacity-50">
        {submitting ? '設定中…' : 'アカウントを設定する'}
      </button>
    </form>
  )
}
