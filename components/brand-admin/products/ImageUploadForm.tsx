'use client'

import { useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { Spinner } from '@/lib/brandAdminUi'

interface Props {
  productId: string
  action: (formData: FormData) => Promise<void>
  /** 5 枚到達等で外側から uploader 自体を無効化する場合 true */
  disabled?: boolean
}

/**
 * ファイル選択と同時に自動 submit する画像 upload form。
 * server action 側の uploadImageAction は redirect で終わるため
 * upload 完了 = page 全体 revalidate になり、file input も自動 reset される。
 * upload 中は file input を disable + 「アップロード中…」を表示、二重 upload を防ぐ。
 */
export default function ImageUploadForm({ productId, action, disabled }: Props) {
  const formRef = useRef<HTMLFormElement | null>(null)
  return (
    <form ref={formRef} action={action} className="flex items-center gap-3 flex-wrap">
      <input type="hidden" name="product_id" value={productId} />
      <UploaderInput
        disabled={!!disabled}
        onChosen={() => formRef.current?.requestSubmit()}
      />
    </form>
  )
}

function UploaderInput({ disabled, onChosen }: { disabled: boolean; onChosen: () => void }) {
  const { pending } = useFormStatus()
  const isDisabled = disabled || pending
  return (
    <>
      <input
        type="file"
        name="file"
        accept="image/*"
        required
        disabled={isDisabled}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onChosen()
          }
        }}
        className={
          'text-[12px] file:mr-2 file:px-3 file:py-1.5 file:rounded file:border ' +
          'file:border-neutral-300 file:bg-white file:text-neutral-800 file:cursor-pointer ' +
          'file:transition-transform file:duration-100 file:active:scale-[0.97] file:active:opacity-90 ' +
          'disabled:opacity-50 disabled:cursor-not-allowed'
        }
      />
      {pending ? (
        <span className="text-[11px] text-neutral-600 inline-flex items-center gap-1.5">
          <Spinner size={10} />
          アップロード中…
        </span>
      ) : (
        <span className="text-[10px] text-neutral-500">
          ファイルを選択すると自動でアップロードします。JPEG / PNG / WebP など、8MB 以下。
        </span>
      )}
    </>
  )
}
