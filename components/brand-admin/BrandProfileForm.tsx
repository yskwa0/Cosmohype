'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'

export interface BrandProfileInitial {
  brandName: string
  description: string
  logoURL: string | null   // 表示用 public URL (nullable)
  logoPath: string | null  // 現行 storage path (RPC 送出用)
  coverURL: string | null
  coverPath: string | null
  websiteURL: string
  instagramURL: string
}

interface Props {
  initial: BrandProfileInitial
  action: (formData: FormData) => Promise<void>
  disabled?: boolean       // staff 等で編集不可の時は true
  disabledReason?: string
}

function SaveButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={!enabled || pending}
      className={
        'px-4 py-2 rounded-md text-sm font-semibold ' +
        'bg-neutral-900 text-white hover:bg-neutral-800 ' +
        'disabled:bg-neutral-400 disabled:text-neutral-100 disabled:cursor-not-allowed'
      }
    >
      {pending ? '保存中…' : '保存する'}
    </button>
  )
}

/**
 * ブランドプロフィール編集フォーム (Migration 145)。
 *
 * ・ブランド名は現時点で編集不可 (RPC が p_name 引数を持たない、migration 146 で拡張予定)
 * ・logo / cover は選択直後にローカル preview (URL.createObjectURL) を即時表示、
 *   保存後に server 側の public URL に置換
 * ・URL 系 (website / instagram) は空欄可、値がある場合のみ http(s):// を最低限 validate
 * ・保存中は useFormStatus() で SaveButton を disable + "保存中…" 表記
 */
export default function BrandProfileForm({ initial, action, disabled, disabledReason }: Props) {
  const [brandName,   setBrandName]   = useState(initial.brandName)
  const [description, setDescription] = useState(initial.description)
  const [websiteURL,  setWebsiteURL]  = useState(initial.websiteURL)
  const [instagramURL, setInstagramURL] = useState(initial.instagramURL)

  const [logoPreviewURL,  setLogoPreviewURL]  = useState<string | null>(null)
  const [coverPreviewURL, setCoverPreviewURL] = useState<string | null>(null)
  const logoInputRef  = useRef<HTMLInputElement | null>(null)
  const coverInputRef = useRef<HTMLInputElement | null>(null)

  // アンマウント時 preview BLOB 解放
  useEffect(() => {
    return () => {
      if (logoPreviewURL)  URL.revokeObjectURL(logoPreviewURL)
      if (coverPreviewURL) URL.revokeObjectURL(coverPreviewURL)
    }
  }, [logoPreviewURL, coverPreviewURL])

  function onLogoChosen(file: File | null) {
    if (logoPreviewURL) URL.revokeObjectURL(logoPreviewURL)
    setLogoPreviewURL(file ? URL.createObjectURL(file) : null)
  }
  function onCoverChosen(file: File | null) {
    if (coverPreviewURL) URL.revokeObjectURL(coverPreviewURL)
    setCoverPreviewURL(file ? URL.createObjectURL(file) : null)
  }

  // URL 妥当性 (client 側の即時 feedback、server でも再検証)
  function isURLValid(v: string): boolean {
    if (v.trim().length === 0) return true
    try {
      const u = new URL(v.trim())
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch { return false }
  }
  const websiteValid   = isURLValid(websiteURL)
  const instagramValid = isURLValid(instagramURL)
  // Migration 146: brand name 必須 + 100 文字上限 (server 側 RPC でも再検証)
  const brandNameTrimmed = brandName.trim()
  const brandNameValid = brandNameTrimmed.length > 0 && brandNameTrimmed.length <= 100
  const canSubmit = !disabled && brandNameValid && websiteValid && instagramValid

  return (
    <form action={action} className="space-y-6 max-w-2xl">
      {/* Brand name: Migration 146 で editable 化 */}
      <Row label="ブランド名" required>
        <input
          type="text"
          name="name"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          disabled={disabled}
          maxLength={100}
          required
          className={fieldClass}
          placeholder="例: URBAN NOTE"
        />
        {!brandNameValid && brandName.length > 0 && (
          <div className="mt-1 text-[11px] text-red-600">
            {brandNameTrimmed.length === 0
              ? 'ブランド名を入力してください。'
              : 'ブランド名は 100 文字以内で入力してください。'}
          </div>
        )}
      </Row>

      {/* Logo */}
      <Row label="ロゴ画像" required={false}>
        <input
          type="hidden"
          name="existing_logo_path"
          value={initial.logoPath ?? ''}
        />
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden border border-neutral-200 bg-neutral-50 flex items-center justify-center">
            {logoPreviewURL ? (
              <ImgFit src={logoPreviewURL} alt="ロゴ preview" />
            ) : initial.logoURL ? (
              <ImgFit src={initial.logoURL} alt="現在のロゴ" />
            ) : (
              <div className="text-[10px] text-neutral-400">未設定</div>
            )}
          </div>
          <div className="flex-1">
            <input
              ref={logoInputRef}
              type="file"
              name="logo_file"
              accept="image/*"
              disabled={disabled}
              onChange={(e) => onLogoChosen(e.target.files?.[0] ?? null)}
              className="text-xs"
            />
            <div className="mt-1 text-[10px] text-neutral-500">
              円形 avatar として表示されます (推奨 512x512、8MB まで)
            </div>
          </div>
        </div>
      </Row>

      {/* Cover */}
      <Row label="カバー画像" required={false}>
        <input
          type="hidden"
          name="existing_cover_path"
          value={initial.coverPath ?? ''}
        />
        <div className="space-y-2">
          <div className="w-full aspect-[16/9] rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50 flex items-center justify-center">
            {coverPreviewURL ? (
              <ImgFit src={coverPreviewURL} alt="カバー preview" />
            ) : initial.coverURL ? (
              <ImgFit src={initial.coverURL} alt="現在のカバー" />
            ) : (
              <div className="text-xs text-neutral-400">未設定</div>
            )}
          </div>
          <input
            ref={coverInputRef}
            type="file"
            name="cover_file"
            accept="image/*"
            disabled={disabled}
            onChange={(e) => onCoverChosen(e.target.files?.[0] ?? null)}
            className="text-xs"
          />
          <div className="text-[10px] text-neutral-500">
            16:9 横長 (推奨 1600x900、8MB まで)。 iOS ブランドページ上部に表示されます。
          </div>
        </div>
      </Row>

      {/* Description (bio) */}
      <Row label="紹介文" required={false}>
        <textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={disabled}
          maxLength={2000}
          rows={5}
          className={fieldClass + ' h-auto py-2 resize-y'}
          placeholder="ブランドの紹介やコンセプトを記載してください。"
        />
        <div className="mt-1 text-[10px] text-neutral-400 text-right">
          {description.length} / 2000
        </div>
      </Row>

      {/* Website URL */}
      <Row label="Website URL" required={false}>
        <input
          type="url"
          name="website_url"
          value={websiteURL}
          onChange={(e) => setWebsiteURL(e.target.value)}
          disabled={disabled}
          maxLength={500}
          className={fieldClass}
          placeholder="https://example.com"
          inputMode="url"
        />
        {!websiteValid && websiteURL.length > 0 && (
          <div className="mt-1 text-[11px] text-red-600">
            http:// または https:// で始まる URL を入力してください。
          </div>
        )}
      </Row>

      {/* Instagram URL */}
      <Row label="Instagram URL" required={false}>
        <input
          type="url"
          name="instagram_url"
          value={instagramURL}
          onChange={(e) => setInstagramURL(e.target.value)}
          disabled={disabled}
          maxLength={500}
          className={fieldClass}
          placeholder="https://www.instagram.com/your_brand/"
          inputMode="url"
        />
        {!instagramValid && instagramURL.length > 0 && (
          <div className="mt-1 text-[11px] text-red-600">
            http:// または https:// で始まる URL を入力してください。
          </div>
        )}
      </Row>

      <div className="pt-2 flex items-center gap-3">
        <SaveButton enabled={canSubmit} />
        {disabled && disabledReason && (
          <span className="text-[11px] text-neutral-500">{disabledReason}</span>
        )}
      </div>
    </form>
  )
}

const fieldClass =
  'w-full h-10 border border-neutral-300 rounded px-3 text-sm bg-white ' +
  'disabled:bg-neutral-100 disabled:text-neutral-500'

function Row({
  label,
  required,
  children,
}: {
  label: string
  required: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
        {label}
        {required ? (
          <span className="ml-1 text-red-600">*</span>
        ) : (
          <span className="ml-1 text-neutral-400 font-normal">(任意)</span>
        )}
      </label>
      {children}
    </div>
  )
}

/** next/image は Storage 未 whitelist の場合エラーになるため <img> を使用 (preview / public URL 両対応) */
function ImgFit({ src, alt }: { src: string; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="w-full h-full object-cover" />
}
