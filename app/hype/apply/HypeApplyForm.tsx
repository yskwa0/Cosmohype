'use client'

import { useState, useEffect, useRef } from 'react'
import Script from 'next/script'

interface Props {
  action:  (formData: FormData) => Promise<void>
  siteKey: string   // NEXT_PUBLIC_TURNSTILE_SITE_KEY (Test: 1x00000000000000000000AA)
}

// Cloudflare Turnstile global
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void; 'expired-callback'?: () => void; 'error-callback'?: () => void; theme?: 'light'|'dark'|'auto' }) => string
      reset:  (id?: string) => void
    }
  }
}

export default function HypeApplyForm({ action, siteKey }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string>('')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef  = useRef<string | null>(null)

  // Render Turnstile widget once script + container are ready
  useEffect(() => {
    let cancelled = false
    function tryRender() {
      if (cancelled) return
      if (!containerRef.current || !window.turnstile) {
        setTimeout(tryRender, 100); return
      }
      if (widgetIdRef.current) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => setCaptchaToken(token),
        'expired-callback': () => setCaptchaToken(''),
        'error-callback':   () => setCaptchaToken(''),
        theme: 'dark',
      })
    }
    tryRender()
    return () => { cancelled = true }
  }, [siteKey])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (submitting) { e.preventDefault(); return }
    if (!captchaToken) {
      e.preventDefault()
      alert('セキュリティチェックを完了してください。')
      return
    }
    setSubmitting(true)
  }

  const inputCls =
    'w-full h-11 px-3 bg-neutral-900 border border-neutral-800 rounded-md text-sm outline-none focus:border-neutral-500 disabled:opacity-60'
  const labelCls =
    'block text-[10px] tracking-widest text-neutral-500 mb-1'

  return (
    <form action={action} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls} htmlFor="brand_name">
          ブランド名 <span className="text-rose-400">*</span>
        </label>
        <input id="brand_name" name="brand_name" type="text" required maxLength={100}
               disabled={submitting} className={inputCls} placeholder="例) URBAN NOTE" autoComplete="organization" />
      </div>

      <div>
        <label className={labelCls} htmlFor="contact_name">
          担当者名 <span className="text-rose-400">*</span>
        </label>
        <input id="contact_name" name="contact_name" type="text" required maxLength={100}
               disabled={submitting} className={inputCls} placeholder="例) 山田 太郎" autoComplete="name" />
      </div>

      <div>
        <label className={labelCls} htmlFor="contact_email">
          担当者メールアドレス <span className="text-rose-400">*</span>
        </label>
        <input id="contact_email" name="contact_email" type="email" required maxLength={200}
               disabled={submitting} className={inputCls} placeholder="you@example.com" autoComplete="email" />
      </div>

      <div>
        <label className={labelCls} htmlFor="website_url">公式サイト URL</label>
        <input id="website_url" name="website_url" type="url" maxLength={500}
               disabled={submitting} className={inputCls} placeholder="https://example.com" autoComplete="url" />
      </div>

      <div>
        <label className={labelCls} htmlFor="instagram_url">Instagram URL</label>
        <input id="instagram_url" name="instagram_url" type="url" maxLength={500}
               disabled={submitting} className={inputCls} placeholder="https://www.instagram.com/..." />
      </div>

      <div>
        <label className={labelCls} htmlFor="notes">ご要望・補足 (任意)</label>
        <textarea id="notes" name="notes" rows={3} maxLength={500}
                  disabled={submitting}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-sm outline-none focus:border-neutral-500 leading-relaxed disabled:opacity-60"
                  placeholder="ブランドの紹介や取り扱いカテゴリ等" />
      </div>

      <div className="mt-4" ref={containerRef} data-testid="turnstile-container" />
      {/* hidden input mirroring the token so the Server Action reads it via FormData */}
      <input type="hidden" name="cf-turnstile-response" value={captchaToken} />

      <button
        type="submit"
        disabled={submitting || !captchaToken}
        className="w-full h-11 mt-3 inline-flex items-center justify-center gap-2 bg-white text-neutral-900 rounded-md text-sm font-semibold disabled:opacity-50">
        {submitting ? '送信中…' : '申し込む'}
      </button>

      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        async
        defer
      />
    </form>
  )
}
