'use client'
import { useRef, useState } from 'react'
import Image from 'next/image'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_MB = 5
const MAX_FILES = 3

interface ImageUploadProps {
  files: File[]
  onChange: (files: File[]) => void
  error?: string
}

export function ImageUpload({ files, onChange, error }: ImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const previews = files.map(f => URL.createObjectURL(f))

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    setLocalError(null)

    const invalid = selected.find(f => !ALLOWED_TYPES.includes(f.type))
    if (invalid) {
      setLocalError('JPEG / PNG / WebP のみ対応しています')
      return
    }

    const oversize = selected.find(f => f.size > MAX_SIZE_MB * 1024 * 1024)
    if (oversize) {
      setLocalError(`1ファイル${MAX_SIZE_MB}MB以下にしてください`)
      return
    }

    if (files.length + selected.length > MAX_FILES) {
      setLocalError(`写真は最大${MAX_FILES}枚まで追加できます`)
      e.target.value = ''
      return
    }

    onChange([...files, ...selected])
    e.target.value = ''
  }

  function remove(index: number) {
    onChange(files.filter((_, i) => i !== index))
  }

  const displayError = error || localError

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {previews.map((src, i) => (
          <div key={i} className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden"
            style={{ background: 'var(--bg-subtle)' }}>
            <Image src={src} alt={`upload ${i}`} fill className="object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
              aria-label="削除"
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {files.length < MAX_FILES && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex-shrink-0 w-24 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors hover:border-[#7C3AED] hover:text-[#7C3AED]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <span className="text-[10px]">追加</span>
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleChange}
      />

      {displayError && <p className="text-xs text-red-500">{displayError}</p>}
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>最大{MAX_FILES}枚 · 各{MAX_SIZE_MB}MB以下</p>
    </div>
  )
}
