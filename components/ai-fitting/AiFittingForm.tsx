'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/compressImage'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

type UploadSlot = {
  file: File | null
  preview: string | null
  error: string | null
}

const EMPTY_SLOT: UploadSlot = { file: null, preview: null, error: null }

type TryOnStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed'

export function AiFittingForm({ userId }: { userId: string }) {
  const [person, setPerson] = useState<UploadSlot>(EMPTY_SLOT)
  const [garment, setGarment] = useState<UploadSlot>(EMPTY_SLOT)
  const [status, setStatus] = useState<TryOnStatus>('idle')
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const personInputRef = useRef<HTMLInputElement>(null)
  const garmentInputRef = useRef<HTMLInputElement>(null)

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) return 'JPG / PNG / WebP のみ対応しています'
    if (file.size > MAX_BYTES) return '5MB 以下の画像を選んでください'
    return null
  }

  async function handleFileSelect(
    file: File,
    setSlot: (s: UploadSlot) => void
  ) {
    const err = validateFile(file)
    if (err) { setSlot({ file: null, preview: null, error: err }); return }

    const compressed = await compressImage(file, 1024, 0.88)
    const preview = URL.createObjectURL(compressed)
    setSlot({ file: compressed, preview, error: null })
  }

  function onPersonChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    handleFileSelect(file, setPerson)
    e.target.value = ''
  }

  function onGarmentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    handleFileSelect(file, setGarment)
    e.target.value = ''
  }

  async function handleSubmit() {
    setSubmitError(null)
    if (!person.file) { setSubmitError('全身写真を選択してください'); return }
    if (!garment.file) { setSubmitError('服の画像を選択してください'); return }

    setStatus('uploading')
    const supabase = createClient()

    try {
      // 画像を Supabase Storage にアップロード
      const ts = Date.now()
      const personPath = `${userId}/person_${ts}.jpg`
      const garmentPath = `${userId}/garment_${ts}.jpg`

      const [personUpload, garmentUpload] = await Promise.all([
        supabase.storage.from('ai-tryons').upload(personPath, person.file, { upsert: false }),
        supabase.storage.from('ai-tryons').upload(garmentPath, garment.file, { upsert: false }),
      ])

      if (personUpload.error || garmentUpload.error) {
        throw new Error('画像のアップロードに失敗しました')
      }

      const personUrl = supabase.storage.from('ai-tryons').getPublicUrl(personPath).data.publicUrl
      const garmentUrl = supabase.storage.from('ai-tryons').getPublicUrl(garmentPath).data.publicUrl

      setStatus('processing')

      const res = await fetch('/api/ai-fitting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personImageUrl: personUrl,
          garmentImageUrl: garmentUrl,
          sourceType: 'upload',
        }),
      })

      const data = await res.json()

      if (data.status === 'completed' && data.resultImageUrl) {
        setResultUrl(data.resultImageUrl)
        setStatus('completed')
      } else {
        // FASHN.ai 未接続のため pending/failed になる（想定内）
        setStatus('failed')
        setSubmitError('AI試着の準備中です。まもなく利用可能になります。')
      }
    } catch (e) {
      setStatus('failed')
      setSubmitError(e instanceof Error ? e.message : '予期しないエラーが発生しました')
    }
  }

  const canSubmit = !!person.file && !!garment.file && status !== 'uploading' && status !== 'processing'

  return (
    <div className="px-4 pt-2 pb-24 flex flex-col gap-6">

      {/* 画像アップロードエリア */}
      <div className="grid grid-cols-2 gap-3">
        <ImageUploadSlot
          label="全身写真"
          hint="正面・全身が写った写真"
          preview={person.preview}
          error={person.error}
          onTap={() => personInputRef.current?.click()}
          onRemove={() => setPerson(EMPTY_SLOT)}
          icon={<PersonIcon />}
        />
        <ImageUploadSlot
          label="服の画像"
          hint="白背景が推奨"
          preview={garment.preview}
          error={garment.error}
          onTap={() => garmentInputRef.current?.click()}
          onRemove={() => setGarment(EMPTY_SLOT)}
          icon={<GarmentIcon />}
        />
      </div>

      <input ref={personInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPersonChange} />
      <input ref={garmentInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onGarmentChange} />

      {/* エラーメッセージ */}
      {submitError && (
        <p className="text-sm text-center px-2" style={{ color: '#F87171' }}>
          {submitError}
        </p>
      )}

      {/* 試着する ボタン */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full h-14 rounded-2xl text-sm font-bold transition-all active:scale-[0.97]"
        style={{
          background: canSubmit
            ? 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)'
            : 'var(--purple-dim)',
          color: canSubmit ? '#fff' : 'var(--purple)',
          opacity: canSubmit ? 1 : 0.55,
          boxShadow: canSubmit ? '0 4px 20px rgba(124,58,237,0.4)' : 'none',
        }}
      >
        {status === 'uploading' && (
          <span className="flex items-center justify-center gap-2">
            <Spinner /> アップロード中…
          </span>
        )}
        {status === 'processing' && (
          <span className="flex items-center justify-center gap-2">
            <Spinner /> AI処理中…
          </span>
        )}
        {(status === 'idle' || status === 'completed' || status === 'failed') && '試着する'}
      </button>

      {/* 結果表示 */}
      {status === 'completed' && resultUrl && (
        <div className="flex flex-col items-center gap-3">
          <div
            className="rounded-2xl overflow-hidden w-full"
            style={{ border: '1px solid rgba(124,58,237,0.35)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resultUrl} alt="試着結果" className="w-full object-cover" />
          </div>
        </div>
      )}

      {/* Coming Soon バナー（FASHN.ai 未接続時）*/}
      {status === 'idle' && (
        <div
          className="rounded-2xl px-4 py-4 flex items-start gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(168,85,247,0.07) 100%)',
            border: '1px solid rgba(124,58,237,0.22)',
          }}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="#A855F7" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
          </svg>
          <div>
            <p className="text-sm font-semibold mb-0.5" style={{ color: '#C4B5FD' }}>
              AI試着エンジンを準備中
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(196,181,253,0.65)' }}>
              写真をアップロードしておくと、エンジン公開後すぐに試着できます。画像は安全に保存されます。
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 画像アップロードスロット ──────────────────────────────────────────────────

function ImageUploadSlot({
  label, hint, preview, error, onTap, onRemove, icon,
}: {
  label: string
  hint: string
  preview: string | null
  error: string | null
  onTap: () => void
  onRemove: () => void
  icon: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div
        onClick={preview ? undefined : onTap}
        className="relative rounded-2xl overflow-hidden flex flex-col items-center justify-center"
        style={{
          aspectRatio: '3/4',
          background: preview
            ? 'transparent'
            : 'linear-gradient(145deg, rgba(124,58,237,0.10) 0%, rgba(168,85,247,0.05) 100%)',
          border: error
            ? '1.5px solid #F87171'
            : preview
            ? '1px solid rgba(124,58,237,0.35)'
            : '1.5px dashed rgba(124,58,237,0.35)',
          cursor: preview ? 'default' : 'pointer',
        }}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={label} className="w-full h-full object-cover" />
            <button
              onClick={(e) => { e.stopPropagation(); onRemove() }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
              aria-label="削除"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 px-3 py-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.15)' }}>
              {icon}
            </div>
            <p className="text-[10px] text-center leading-snug" style={{ color: 'rgba(196,181,253,0.6)' }}>{hint}</p>
          </div>
        )}
      </div>
      {error && <p className="text-[10px]" style={{ color: '#F87171' }}>{error}</p>}
    </div>
  )
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#A855F7" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
    </svg>
  )
}

function GarmentIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#A855F7" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.86H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.86l.58-3.57a2 2 0 00-1.34-2.23z" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
