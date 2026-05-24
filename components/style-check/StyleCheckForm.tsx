'use client'
import { useState, useRef } from 'react'

function compressImage(file: File): Promise<string> {
  const MAX_SIDE = 1024
  const QUALITY = 0.8

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img
      if (width > MAX_SIDE || height > MAX_SIDE) {
        if (width >= height) {
          height = Math.round((height * MAX_SIDE) / width)
          width = MAX_SIDE
        } else {
          width = Math.round((width * MAX_SIDE) / height)
          height = MAX_SIDE
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('canvas unavailable')); return }
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', QUALITY))
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('load failed'))
    }

    img.src = objectUrl
  })
}

export function StyleCheckForm({ todayResult }: { todayResult: string | null }) {
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<string | null>(todayResult)
  const [showTodayResult, setShowTodayResult] = useState(!!todayResult)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return

    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
    if (!ALLOWED.includes(f.type)) {
      setError('JPG / PNG / WebP 形式の画像を選択してください')
      e.target.value = ''
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('5MB 以下の画像を選択してください')
      e.target.value = ''
      return
    }

    setFile(f)
    setPreview(URL.createObjectURL(f))
    setError(null)
  }

  async function handleSubmit() {
    if (!file || loading) return
    setLoading(true)
    setError(null)
    let base64: string
    try {
      base64 = await compressImage(file)
    } catch {
      setError('画像を読み込めませんでした。別の画像を選択してください。')
      setFile(null)
      setPreview(null)
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/style-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '診断に失敗しました')
        if (data.not_fashion) {
          setFile(null)
          setPreview(null)
        }
        return
      }
      setResult(data.result)
      if (data.cached) setShowTodayResult(true)
    } catch {
      setError('うまく診断できませんでした。少し時間をおいてもう一度試してください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 pt-6 pb-10 flex flex-col gap-6">
      {/* Intro */}
      <div className="flex flex-col items-center text-center gap-2">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>AIスタイル診断</h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          コーデ写真を1枚アップロードすると<br />AIがあなたのスタイルを診断します
        </p>
      </div>

      {/* Today's result (already diagnosed — from page load or cached API response) */}
      {showTodayResult && result && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-center uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            今日の診断
          </p>
          <ResultCard result={result} />
          <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            今日の診断はすでに完了しています。次の診断は明日0時からできます。
          </p>
        </div>
      )}

      {/* Upload + result flow */}
      {!showTodayResult && (
        <>
          {/* Image picker */}
          {!result && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                1人〜3人までのコーデがはっきり写った画像をアップロードしてください。
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleFileChange}
              />

              {preview ? (
                <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '3/4', maxHeight: '380px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="選択した写真" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl text-xs font-semibold"
                    style={{ background: 'rgba(0,0,0,0.55)', color: 'white', backdropFilter: 'blur(4px)' }}
                  >
                    写真を変更
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 w-full rounded-2xl border-2 border-dashed py-14 transition-opacity active:opacity-70"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
                >
                  <svg viewBox="0 0 24 24" className="w-10 h-10" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>写真を選択</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>JPEG / PNG / WebP</p>
                  </div>
                </button>
              )}

              {error && (
                <p className="text-sm text-red-500 rounded-xl px-4 py-3 text-center" style={{ background: 'rgba(239,68,68,0.08)' }}>
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!file || loading}
                className="w-full h-12 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
                  boxShadow: file && !loading ? '0 4px 20px rgba(124,58,237,0.4)' : 'none',
                }}
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={4} />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    診断中...
                  </>
                ) : (
                  '✦ 診断する'
                )}
              </button>

              <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                1日1回まで利用できます
              </p>
            </div>
          )}

          {/* Fresh result */}
          {result && (
            <div className="flex flex-col gap-4">
              {preview && (
                <div className="rounded-2xl overflow-hidden" style={{ aspectRatio: '3/4', maxHeight: '300px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="診断した写真" className="w-full h-full object-cover" />
                </div>
              )}
              <ResultCard result={result} />
              <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                今日の診断はすでに完了しています。次の診断は明日0時からできます。
              </p>
            </div>
          )}
        </>
      )}

      {/* Note */}
      <p className="text-center text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
        アップロードした画像はAI診断にのみ使用されます。<br />学習データへの利用は行いません。
      </p>
    </div>
  )
}

type DiagnosisEntry = { position: string; comment: string }

function parseResult(result: string): DiagnosisEntry[] | null {
  try {
    const parsed = JSON.parse(result)
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0].comment === 'string') {
      return parsed as DiagnosisEntry[]
    }
  } catch {
    // legacy plain text
  }
  return null
}

function ResultCard({ result }: { result: string }) {
  const diagnoses = parseResult(result)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)' }}
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        <p className="text-[11px] font-bold uppercase tracking-widest text-white">
          AI STYLE CHECK
        </p>
      </div>

      {/* Body */}
      <div className="px-4 py-4 flex flex-col gap-3" style={{ background: 'var(--purple-dim)' }}>
        {diagnoses ? (
          diagnoses.map((d, i) => (
            <div key={i} className="flex flex-col gap-1">
              {d.position && (
                <p className="text-xs font-semibold" style={{ color: 'var(--purple)' }}>
                  {d.position}の人
                </p>
              )}
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
                {d.comment}
              </p>
              {i < diagnoses.length - 1 && (
                <div className="mt-2 h-px" style={{ background: 'var(--border)' }} />
              )}
            </div>
          ))
        ) : (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
            {result}
          </p>
        )}
      </div>
    </div>
  )
}
