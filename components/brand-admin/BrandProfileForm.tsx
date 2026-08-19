'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import BrandImageCropEditor, { type BrandCropValue } from './BrandImageCropEditor'
import { pressableClass, Spinner } from '@/lib/brandAdminUi'

export interface BrandProfileInitial {
  brandName: string
  description: string
  logoURL: string | null   // 表示用 public URL (nullable)
  logoPath: string | null  // 現行 storage path (RPC 送出用)
  coverURL: string | null
  coverPath: string | null
  logoCrop: BrandCropValue
  coverCrop: BrandCropValue
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
 * ブランドプロフィール編集フォーム (Migration 147)。
 *
 * 変更点 (Migration 147):
 *   ・Website / Instagram URL 入力欄を完全撤去 (HYPE 内購入導線保護)
 *   ・logo / cover に crop editor (drag + zoom slider) を統合、Migration 137 商品画像
 *     crop と同一 formula (`scale(zoom) translate(offset*100%)`)
 *
 * 保持:
 *   ・name / description の editable (Migration 146)
 *   ・logo / cover の upload preview (local BLOB)
 *   ・SaveButton `useFormStatus()` の pending 表示
 */
export default function BrandProfileForm({ initial, action, disabled, disabledReason }: Props) {
  const [brandName,   setBrandName]   = useState(initial.brandName)
  const [description, setDescription] = useState(initial.description)

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

  // Migration 146: brand name 必須 + 100 文字上限 (server 側 RPC でも再検証)
  const brandNameTrimmed = brandName.trim()
  const brandNameValid = brandNameTrimmed.length > 0 && brandNameTrimmed.length <= 100
  const canSubmit = !disabled && brandNameValid

  // Crop editor に流す画像 URL: local preview (新規選択直後) > 既存 public URL > null
  const logoEditorURL  = logoPreviewURL  ?? initial.logoURL
  const coverEditorURL = coverPreviewURL ?? initial.coverURL

  // 画像を新しく選択した場合、crop は初期値 (中央) にリセットするのが自然。
  // 既存画像を編集中は initial の crop 値を維持。
  const logoEditorInitial: BrandCropValue = logoPreviewURL
    ? { zoom: 1.0, offsetX: 0.0, offsetY: 0.0 }
    : initial.logoCrop
  const coverEditorInitial: BrandCropValue = coverPreviewURL
    ? { zoom: 1.0, offsetX: 0.0, offsetY: 0.0 }
    : initial.coverCrop

  return (
    <form action={action} className="space-y-6 max-w-2xl">
      {/* Brand name */}
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
        <input type="hidden" name="existing_logo_path" value={initial.logoPath ?? ''} />
        <div className="space-y-3">
          {/* 円形 crop editor (drag + zoom slider) */}
          <div className="max-w-[220px]">
            <BrandImageCropEditor
              imageURL={logoEditorURL}
              aspectRatio={1.0}
              shape="circle"
              namePrefix="logo"
              initial={logoEditorInitial}
              disabled={disabled}
            />
          </div>
          <div>
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
              円形 avatar として表示されます (推奨 512x512、8MB まで)。
              アップロード後、プレビューをドラッグ / Zoom スライダーで表示位置を調整できます。
            </div>
          </div>
        </div>
      </Row>

      {/* Cover */}
      <Row label="カバー画像" required={false}>
        <input type="hidden" name="existing_cover_path" value={initial.coverPath ?? ''} />
        <div className="space-y-3">
          {/* 16:9 crop editor (drag + zoom slider) */}
          <BrandImageCropEditor
            imageURL={coverEditorURL}
            aspectRatio={16.0 / 9.0}
            shape="rectangle"
            namePrefix="cover"
            initial={coverEditorInitial}
            disabled={disabled}
          />
          <div>
            <input
              ref={coverInputRef}
              type="file"
              name="cover_file"
              accept="image/*"
              disabled={disabled}
              onChange={(e) => onCoverChosen(e.target.files?.[0] ?? null)}
              className="text-xs"
            />
            <div className="mt-1 text-[10px] text-neutral-500">
              16:9 横長 (推奨 1600x900、8MB まで)。 iOS ブランドページ上部に表示されます。
              アップロード後、プレビューをドラッグ / Zoom スライダーで表示位置を調整できます。
            </div>
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

      {/* Website / Instagram は Migration 147 で完全撤去 (HYPE 内購入導線保護) */}

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
