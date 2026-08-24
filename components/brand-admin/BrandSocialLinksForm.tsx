'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { pressableClass, Spinner } from '@/lib/brandAdminUi'

/**
 * ブランドプロフィール SNS リンク編集フォーム (Migration 162)。
 *
 * ブランド公式サイト URL と Instagram URL の 2 つを更新する。 保存は
 * shop_brand_update_social_links RPC (owner/admin gate + server 側 URL validation)。
 * 空文字は server 側で NULL に正規化される。
 *
 * このフォームは既存の BrandProfileForm (Migration 147、name/description/logo/cover
 * だけを扱う) とは完全分離。 blast radius を小さく保つため独立セクション化。
 */

export interface BrandSocialLinksInitial {
  websiteUrl:   string | null
  instagramUrl: string | null
}

interface Props {
  initial: BrandSocialLinksInitial
  action: (formData: FormData) => Promise<void>
  disabled?: boolean
  disabledReason?: string
}

const MAX_LEN = 500

function SaveButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={!enabled || pending}
      className={
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold ' +
        'bg-neutral-900 text-white hover:bg-neutral-800 ' +
        'disabled:bg-neutral-400 disabled:text-neutral-100 disabled:cursor-not-allowed ' +
        pressableClass
      }
    >
      {pending && <Spinner />}
      {pending ? '保存中…' : '保存する'}
    </button>
  )
}

/**
 * client 側 pre-validation (server と同じルール、ここで先に UX として弾く)。
 * server 側の shop_brand_update_social_links がもう一度 enforce する。
 */
function isHttpUrl(v: string): boolean {
  return /^https?:\/\/[^\s]+$/.test(v)
}
function isInstagramUrl(v: string): boolean {
  return /^https?:\/\/(www\.)?instagram\.com\/[^\s]*$/.test(v)
}

export default function BrandSocialLinksForm({ initial, action, disabled, disabledReason }: Props) {
  const [website,   setWebsite]   = useState(initial.websiteUrl   ?? '')
  const [instagram, setInstagram] = useState(initial.instagramUrl ?? '')

  const websiteTrim   = website.trim()
  const instagramTrim = instagram.trim()

  const websiteOk   = websiteTrim.length === 0   || (websiteTrim.length   <= MAX_LEN && isHttpUrl(websiteTrim))
  const instagramOk = instagramTrim.length === 0 || (instagramTrim.length <= MAX_LEN && isInstagramUrl(instagramTrim))

  const canSubmit = !disabled && websiteOk && instagramOk

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="website_url" className="block text-[12px] font-semibold text-neutral-700 mb-1">
          公式サイト URL (任意)
        </label>
        <input
          id="website_url"
          name="website_url"
          type="url"
          inputMode="url"
          autoComplete="off"
          maxLength={MAX_LEN + 1}
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://example.com"
          disabled={disabled}
          className="w-full h-10 border border-neutral-300 rounded px-3 text-sm bg-white disabled:bg-neutral-100"
        />
        <div className="mt-1 flex items-center justify-between text-[11px]">
          <span className={websiteOk ? 'text-neutral-500' : 'text-red-600'}>
            {websiteOk
              ? 'http:// または https:// で始まる URL。 空欄で「未設定」に戻せます。'
              : 'http:// または https:// で始まる有効な URL を入力してください。'}
          </span>
          <span className={websiteTrim.length > MAX_LEN ? 'text-red-600' : 'text-neutral-400'}>
            {websiteTrim.length} / {MAX_LEN}
          </span>
        </div>
      </div>

      <div>
        <label htmlFor="instagram_url" className="block text-[12px] font-semibold text-neutral-700 mb-1">
          Instagram URL (任意)
        </label>
        <input
          id="instagram_url"
          name="instagram_url"
          type="url"
          inputMode="url"
          autoComplete="off"
          maxLength={MAX_LEN + 1}
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          placeholder="https://www.instagram.com/example/"
          disabled={disabled}
          className="w-full h-10 border border-neutral-300 rounded px-3 text-sm bg-white disabled:bg-neutral-100"
        />
        <div className="mt-1 flex items-center justify-between text-[11px]">
          <span className={instagramOk ? 'text-neutral-500' : 'text-red-600'}>
            {instagramOk
              ? 'Instagram プロフィールの URL 全文 (ユーザー名だけは不可)。 空欄で「未設定」に戻せます。'
              : 'https://www.instagram.com/<username>/ 形式で入力してください。'}
          </span>
          <span className={instagramTrim.length > MAX_LEN ? 'text-red-600' : 'text-neutral-400'}>
            {instagramTrim.length} / {MAX_LEN}
          </span>
        </div>
      </div>

      {disabled && disabledReason && (
        <div className="text-[11px] text-neutral-500">{disabledReason}</div>
      )}

      <div>
        <SaveButton enabled={canSubmit} />
      </div>
    </form>
  )
}
