'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/compressImage'
import { formatRelativeTime } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type GarmentSlot = { file: File | null; preview: string | null; error: string | null }
type SubmitStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed'

export type TryonRow = {
  id: string
  status: string
  result_image_url: string | null  // Storage path（DBに保存）
  garment_image_url: string        // Storage path（DBに保存）
  created_at: string
  display_url: string | null       // 表示用 signed URL（DBには保存しない）
}

interface Props {
  userId: string
  initialBodyImagePath: string | null   // DBに保存されている Storage path
  initialBodySignedUrl: string | null   // サーバー側で生成した表示用 signed URL
  initialTryons: TryonRow[]
}

const EMPTY_GARMENT: GarmentSlot = { file: null, preview: null, error: null }
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'JPG / PNG / WebP のみ対応しています'
  if (file.size > MAX_BYTES) return '5MB 以下の画像を選んでください'
  return null
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AiFittingForm({ userId, initialBodyImagePath, initialBodySignedUrl, initialTryons }: Props) {
  // 全身写真: path を DB に保存、表示は signed URL を使用
  const [bodyImagePath, setBodyImagePath] = useState<string | null>(initialBodyImagePath)
  const [bodyDisplayUrl, setBodyDisplayUrl] = useState<string | null>(initialBodySignedUrl)
  const [bodyLocalPreview, setBodyLocalPreview] = useState<string | null>(null)
  const [isSavingBody, setIsSavingBody] = useState(false)
  const [bodyError, setBodyError] = useState<string | null>(null)

  // 服画像: セッション内のみ保持
  const [garment, setGarment] = useState<GarmentSlot>(EMPTY_GARMENT)

  // 送信状態
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)

  // 試着履歴
  const [tryons, setTryons] = useState<TryonRow[]>(initialTryons)

  // 拡大ビューア
  const [viewedUrl, setViewedUrl] = useState<string | null>(null)

  const bodyInputRef = useRef<HTMLInputElement>(null)
  const garmentInputRef = useRef<HTMLInputElement>(null)

  // ── 全身写真: ファイル選択と同時にアップロード・プロフィール更新 ────────────
  async function onBodyFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const err = validateFile(file)
    if (err) { setBodyError(err); return }
    setBodyError(null)

    const compressed = await compressImage(file, 1200, 0.88)
    const localUrl = URL.createObjectURL(compressed)
    setBodyLocalPreview(localUrl)
    setIsSavingBody(true)

    try {
      const supabase = createClient()
      const path = `${userId}/body/body-${Date.now()}.jpg`

      const { error: upErr } = await supabase.storage
        .from('ai-tryons')
        .upload(path, compressed, { upsert: false, contentType: 'image/jpeg' })
      if (upErr) throw upErr

      // DBには path を保存（public URL ではない）
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          ai_fitting_body_image_url: path,
          ai_fitting_body_image_updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
      if (profileErr) throw profileErr

      // 表示用 signed URL をクライアント側で生成（1時間有効）
      const { data: signedData } = await supabase.storage
        .from('ai-tryons')
        .createSignedUrl(path, 3600)

      URL.revokeObjectURL(localUrl)
      setBodyImagePath(path)
      setBodyDisplayUrl(signedData?.signedUrl ?? null)
      setBodyLocalPreview(null)
    } catch {
      setBodyError('写真の保存に失敗しました。もう一度お試しください。')
      URL.revokeObjectURL(localUrl)
      setBodyLocalPreview(null)
    } finally {
      setIsSavingBody(false)
    }
  }

  // ── 服画像: ローカルプレビューのみ、送信時にアップロード ──────────────────
  async function onGarmentFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const err = validateFile(file)
    if (err) { setGarment({ file: null, preview: null, error: err }); return }
    const compressed = await compressImage(file, 1024, 0.88)
    setGarment({ file: compressed, preview: URL.createObjectURL(compressed), error: null })
  }

  // ── 試着送信 ───────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitError(null)
    if (!bodyImagePath) { setSubmitError('全身写真を登録してください'); return }
    if (!garment.file) { setSubmitError('服の画像を選択してください'); return }

    setSubmitStatus('uploading')
    const supabase = createClient()
    // 新規 tryon カード表示用に blob URL を保持しておく
    const garmentBlobUrl = garment.preview

    try {
      const ts = Date.now()
      const garmentPath = `${userId}/garments/${ts}.jpg`

      const { error: gErr } = await supabase.storage
        .from('ai-tryons')
        .upload(garmentPath, garment.file, { upsert: false, contentType: garment.file.type })
      if (gErr) throw new Error('服画像のアップロードに失敗しました')

      setSubmitStatus('processing')

      // API には path を送る（URL ではない）。API 側で signed URL を生成してプロバイダーへ渡す。
      const res = await fetch('/api/ai-fitting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personImagePath: bodyImagePath,
          garmentImagePath: garmentPath,
          sourceType: 'upload',
        }),
      })
      const data = await res.json() as { id?: string; status?: string; error?: string; displayUrl?: string }

      // 429: 上限エラー（レコード作成なし）
      if (res.status === 429) {
        setSubmitStatus('failed')
        setSubmitError(data.error ?? '本日のAI Fittingは使用済みです。明日また試してください。')
        return
      }

      if (!data.id) {
        setSubmitStatus('failed')
        setSubmitError(data.error ?? '試着リクエストに失敗しました')
        return
      }

      // 完成 → displayUrl があれば結果画像、なければ garment blob URL
      const displayUrl = data.displayUrl ?? garmentBlobUrl
      setTryons(prev => [{
        id: data.id!,
        status: data.status ?? 'failed',
        result_image_url: null,
        garment_image_url: garmentPath,
        created_at: new Date().toISOString(),
        display_url: displayUrl,
      }, ...prev])

      setSubmitStatus(data.status === 'completed' ? 'completed' : 'failed')
      if (data.status === 'failed') {
        setSubmitError(data.error ?? 'AI試着に失敗しました。再度お試しください。')
      }
      setGarment(EMPTY_GARMENT)
    } catch (e) {
      setSubmitStatus('failed')
      setSubmitError(e instanceof Error ? e.message : '予期しないエラーが発生しました')
    }
  }

  const displayBodyUrl = bodyLocalPreview ?? bodyDisplayUrl
  const canSubmit = !!bodyImagePath && !!garment.file && !isSavingBody
    && submitStatus !== 'uploading' && submitStatus !== 'processing'

  return (
    <div className="px-4 pt-2 pb-24 flex flex-col gap-6">

      {/* ── 全身写真セクション ──────────────────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            自分の全身写真
          </p>
          {bodyImagePath && !isSavingBody && (
            <button
              onClick={() => bodyInputRef.current?.click()}
              className="flex items-center gap-1 text-xs"
              style={{ color: 'var(--purple)' }}
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              全身写真を変更
            </button>
          )}
        </div>

        {displayBodyUrl ? (
          // 登録済み or アップロード中
          <div className="flex items-center gap-4">
            <div
              className="relative rounded-xl overflow-hidden flex-shrink-0"
              style={{
                width: 84,
                height: 112,
                border: '1px solid rgba(124,58,237,0.4)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={displayBodyUrl} alt="全身写真" className="w-full h-full object-cover" />
              {isSavingBody && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
                  <Spinner />
                </div>
              )}
            </div>
            {!isSavingBody && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#34D399' }} />
                  <p className="text-xs font-semibold" style={{ color: '#34D399' }}>登録済み</p>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(196,181,253,0.65)' }}>
                  この写真を使って<br />試着します
                </p>
              </div>
            )}
          </div>
        ) : (
          // 未登録
          <button
            onClick={() => bodyInputRef.current?.click()}
            disabled={isSavingBody}
            className="flex items-center gap-3 w-full rounded-2xl px-4 py-4 text-left transition-opacity active:opacity-70"
            style={{
              background: 'linear-gradient(145deg, rgba(124,58,237,0.10) 0%, rgba(168,85,247,0.05) 100%)',
              border: '1.5px dashed rgba(124,58,237,0.35)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(124,58,237,0.15)' }}
            >
              {isSavingBody ? <Spinner /> : <PersonIcon />}
            </div>
            <div>
              <p className="text-sm font-semibold mb-0.5" style={{ color: '#EDE9FE' }}>
                全身写真を登録する
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(196,181,253,0.6)' }}>
                一度登録すると次回から自動で使用します
              </p>
            </div>
          </button>
        )}

        {bodyError && (
          <p className="text-[11px]" style={{ color: '#F87171' }}>{bodyError}</p>
        )}

        <div
          className="rounded-xl px-3 py-2.5 flex flex-col gap-1"
          style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.15)' }}
        >
          <p className="text-[10px] font-semibold tracking-wide" style={{ color: 'rgba(196,181,253,0.75)' }}>
            きれいに仕上げるコツ
          </p>
          <div className="flex flex-col gap-0.5">
            {[
              '被写体が1人で写っている写真',
              '全身が見切れずに写っている写真',
              'なるべく正面を向いた写真',
              '背景がシンプルな写真',
            ].map(tip => (
              <p key={tip} className="text-[11px] leading-snug" style={{ color: 'rgba(196,181,253,0.55)' }}>・{tip}</p>
            ))}
          </div>
        </div>
      </section>

      {/* ── 服画像セクション ────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>服の画像</p>
        <div className="flex items-start gap-4">
          {/* サムネイル or アップロード枠 */}
          <div
            onClick={garment.preview ? undefined : () => garmentInputRef.current?.click()}
            className="relative rounded-xl overflow-hidden flex-shrink-0"
            style={{
              width: 84,
              height: 112,
              background: garment.preview
                ? 'transparent'
                : 'linear-gradient(145deg, rgba(124,58,237,0.10) 0%, rgba(168,85,247,0.05) 100%)',
              border: garment.error
                ? '1.5px solid #F87171'
                : garment.preview
                ? '1px solid rgba(124,58,237,0.4)'
                : '1.5px dashed rgba(124,58,237,0.35)',
              cursor: garment.preview ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {garment.preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={garment.preview} alt="服" className="w-full h-full object-cover" />
                <button
                  onClick={(e) => { e.stopPropagation(); setGarment(EMPTY_GARMENT) }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.55)' }}
                  aria-label="削除"
                >
                  <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            ) : (
              <GarmentIcon />
            )}
          </div>

          {/* ラベル */}
          <div className="flex-1 pt-1 flex flex-col gap-2">
            {garment.preview ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#A855F7' }} />
                  <p className="text-xs font-semibold" style={{ color: '#C4B5FD' }}>選択済み</p>
                </div>
                <button
                  onClick={() => garmentInputRef.current?.click()}
                  className="text-xs self-start"
                  style={{ color: 'var(--purple)' }}
                >
                  変更する
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold" style={{ color: '#EDE9FE' }}>
                  服の画像を選ぶ
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(196,181,253,0.6)' }}>
                  白背景の商品画像が推奨
                </p>
                <button
                  onClick={() => garmentInputRef.current?.click()}
                  className="text-xs self-start px-3 py-1.5 rounded-xl transition-opacity active:opacity-70"
                  style={{
                    background: 'rgba(124,58,237,0.2)',
                    border: '1px solid rgba(168,85,247,0.35)',
                    color: '#C4B5FD',
                  }}
                >
                  写真を選択
                </button>
              </>
            )}
            {garment.error && (
              <p className="text-[11px]" style={{ color: '#F87171' }}>{garment.error}</p>
            )}
          </div>
        </div>

        <div
          className="rounded-xl px-3 py-2.5 flex flex-col gap-1"
          style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.15)' }}
        >
          <p className="text-[10px] font-semibold tracking-wide" style={{ color: 'rgba(196,181,253,0.75)' }}>
            服画像のコツ
          </p>
          <div className="flex flex-col gap-0.5">
            {[
              '服が1着だけはっきり写っている画像',
              '正面から見た画像',
              '背景がシンプルな画像',
            ].map(tip => (
              <p key={tip} className="text-[11px] leading-snug" style={{ color: 'rgba(196,181,253,0.55)' }}>・{tip}</p>
            ))}
          </div>
        </div>
      </section>

      {/* hidden inputs */}
      <input ref={bodyInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onBodyFileChange} />
      <input ref={garmentInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onGarmentFileChange} />

      {/* エラー */}
      {submitError && (
        <p className="text-sm text-center" style={{ color: '#F87171' }}>{submitError}</p>
      )}

      {/* 試着するボタン */}
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
        {submitStatus === 'uploading' && (
          <span className="flex items-center justify-center gap-2"><Spinner /> アップロード中…</span>
        )}
        {submitStatus === 'processing' && (
          <span className="flex items-center justify-center gap-2"><Spinner /> AI処理中…</span>
        )}
        {submitStatus !== 'uploading' && submitStatus !== 'processing' && '試着する'}
      </button>

      {/* ── 試着履歴セクション ──────────────────────────────────────────────── */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          試着履歴
        </p>
        {tryons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#A855F7" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.86H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.86l.58-3.57a2 2 0 00-1.34-2.23z" />
              </svg>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
              まだ試着履歴はありません
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              気になる服を選んで、AI Fittingを試してみましょう
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {tryons.map(t => (
              <TryonCard
                key={t.id}
                tryon={t}
                onTap={t.status === 'completed' && t.display_url ? () => setViewedUrl(t.display_url!) : undefined}
              />
            ))}
          </div>
        )}
      </section>

      {viewedUrl && <TryonViewer url={viewedUrl} onClose={() => setViewedUrl(null)} />}
    </div>
  )
}

// ─── 試着結果ビューア（ピンチズーム・スワイプクローズ対応）────────────────────

const VIEWER_CLOSE_THRESHOLD = 120
const VIEWER_VELOCITY_THRESHOLD = 0.5
const VIEWER_MAX_SCALE = 5

function TryonViewer({ url, onClose }: { url: string; onClose: () => void }) {
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)
  const [swipeOut, setSwipeOut] = useState(false)
  const [drag, setDrag] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isPanning, setIsPanning] = useState(false)

  const [scale, setScaleState] = useState(1)
  const [panX, setPanXState] = useState(0)
  const [panY, setPanYState] = useState(0)
  const [isPinching, setIsPinching] = useState(false)
  const scaleRef = useRef(1)
  const panXRef = useRef(0)
  const panYRef = useRef(0)
  const isPinchingRef = useRef(false)

  const closingRef = useRef(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const startTime = useRef(0)
  const dragDir = useRef<'vert' | 'horiz' | null>(null)
  const prevPinchDist = useRef(0)
  const prevPinchMidX = useRef(0)
  const prevPinchMidY = useRef(0)
  const panStartX = useRef(0)
  const panStartY = useRef(0)
  const justPinchedRef = useRef(false)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => { setVisible(true) }, [])

  function setScale(v: number) { scaleRef.current = v; setScaleState(v) }
  function setPanX(v: number) { panXRef.current = v; setPanXState(v) }
  function setPanY(v: number) { panYRef.current = v; setPanYState(v) }

  function getPinchDist(touches: React.TouchList) {
    return Math.hypot(
      touches[1].clientX - touches[0].clientX,
      touches[1].clientY - touches[0].clientY,
    )
  }

  function closeTap() {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    setVisible(false)
    setTimeout(() => onCloseRef.current(), 170)
  }

  function closeSwipe() {
    if (closingRef.current) return
    closingRef.current = true
    setSwipeOut(true)
    setClosing(true)
    setIsDragging(false)
    setVisible(false)
    setTimeout(() => onCloseRef.current(), 260)
  }

  const dragRatio = Math.min(Math.max(drag.y, 0) / VIEWER_CLOSE_THRESHOLD, 1)
  const bgAlpha = visible
    ? (isDragging ? Math.max(0.15, 0.93 - dragRatio * 0.78) : 0.93)
    : 0

  const ty = swipeOut ? drag.y + 420 : drag.y
  const imgOpenScale = visible ? 1 : (closing && !swipeOut ? 0.96 : 0.92)

  const imgTransform = scale > 1
    ? `translate(${panX}px, ${panY}px) scale(${scale})`
    : `translate(${drag.x}px, ${ty}px) scale(${imgOpenScale})`

  const imgTransition = isDragging || isPinching || isPanning
    ? 'none'
    : swipeOut
      ? 'transform 220ms ease-in, opacity 200ms ease-in'
      : closing
        ? 'transform 140ms ease-in, opacity 130ms ease-in'
        : 'transform 120ms ease-out, opacity 100ms ease-out'

  const bgTransition = isDragging
    ? 'none'
    : closing
      ? 'background-color 200ms ease-in'
      : 'background-color 160ms ease-out'

  return createPortal(
    <div
      className="fixed inset-0"
      style={{
        zIndex: 9999,
        backgroundColor: `rgba(0,0,0,${bgAlpha})`,
        transition: bgTransition,
        touchAction: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={closeTap}
      onTouchStart={e => {
        e.stopPropagation()
        if (closingRef.current) return
        if (e.touches.length === 2) {
          isPinchingRef.current = true
          setIsPinching(true)
          setIsPanning(false)
          prevPinchDist.current = getPinchDist(e.touches)
          prevPinchMidX.current = (e.touches[0].clientX + e.touches[1].clientX) / 2 - window.innerWidth / 2
          prevPinchMidY.current = (e.touches[0].clientY + e.touches[1].clientY) / 2 - window.innerHeight / 2
          return
        }
        startX.current = e.touches[0].clientX
        startY.current = e.touches[0].clientY
        startTime.current = Date.now()
        dragDir.current = null
        panStartX.current = panXRef.current
        panStartY.current = panYRef.current
        if (scaleRef.current > 1) setIsPanning(true)
      }}
      onTouchMove={e => {
        e.stopPropagation()
        if (closingRef.current) return
        if (e.touches.length === 2) {
          if (!isPinchingRef.current) {
            isPinchingRef.current = true
            setIsPinching(true)
            setIsPanning(false)
            prevPinchDist.current = getPinchDist(e.touches)
            prevPinchMidX.current = (e.touches[0].clientX + e.touches[1].clientX) / 2 - window.innerWidth / 2
            prevPinchMidY.current = (e.touches[0].clientY + e.touches[1].clientY) / 2 - window.innerHeight / 2
          }
          const dist = getPinchDist(e.touches)
          const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - window.innerWidth / 2
          const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - window.innerHeight / 2
          const rawScale = scaleRef.current * (dist / prevPinchDist.current)
          const newScale = Math.max(1, Math.min(VIEWER_MAX_SCALE, rawScale))
          const actualRatio = newScale / scaleRef.current
          const newPanX = mx + actualRatio * (panXRef.current - prevPinchMidX.current)
          const newPanY = my + actualRatio * (panYRef.current - prevPinchMidY.current)
          setScale(newScale)
          if (newScale <= 1) { setPanX(0); setPanY(0) }
          else { setPanX(newPanX); setPanY(newPanY) }
          prevPinchDist.current = dist
          prevPinchMidX.current = mx
          prevPinchMidY.current = my
          return
        }
        if (e.touches.length === 1) {
          const dx = e.touches[0].clientX - startX.current
          const dy = e.touches[0].clientY - startY.current
          if (scaleRef.current > 1) {
            if (!isPanning) setIsPanning(true)
            setPanX(panStartX.current + dx)
            setPanY(panStartY.current + dy)
            return
          }
          if (dragDir.current === null) {
            if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
            dragDir.current = Math.abs(dy) >= Math.abs(dx) ? 'vert' : 'horiz'
          }
          if (dragDir.current === 'vert' && dy > 0) {
            setIsDragging(true)
            setDrag({ x: dx * 0.2, y: dy })
          }
        }
      }}
      onTouchEnd={e => {
        e.stopPropagation()
        if (closingRef.current) return
        if (isPinchingRef.current && e.touches.length === 1) {
          startX.current = e.touches[0].clientX
          startY.current = e.touches[0].clientY
          panStartX.current = panXRef.current
          panStartY.current = panYRef.current
          dragDir.current = null
          return
        }
        if (e.touches.length === 0) {
          setIsPanning(false)
          if (isPinchingRef.current) {
            isPinchingRef.current = false
            setIsPinching(false)
            justPinchedRef.current = true
            setTimeout(() => { justPinchedRef.current = false }, 200)
          }
          if (scaleRef.current > 1) {
            setIsDragging(false)
            setDrag({ x: 0, y: 0 })
            return
          }
          const dx = e.changedTouches[0].clientX - startX.current
          const dy = e.changedTouches[0].clientY - startY.current
          const elapsed = Math.max(1, Date.now() - startTime.current)
          const vy = dy / elapsed
          if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
            if (!justPinchedRef.current) {
              // 画像上のタップは閉じない、背景タップのみ閉じる
              const target = e.changedTouches[0].target as Element
              if (!imageContainerRef.current?.contains(target)) closeTap()
            }
            return
          }
          if (dragDir.current === 'vert') {
            if (dy > VIEWER_CLOSE_THRESHOLD || (dy > 50 && vy > VIEWER_VELOCITY_THRESHOLD)) {
              closeSwipe()
            } else {
              setIsDragging(false)
              setDrag({ x: 0, y: 0 })
            }
            return
          }
          setDrag({ x: 0, y: 0 })
        }
      }}
    >
      <button
        onClick={e => { e.stopPropagation(); closeTap() }}
        className="absolute right-4 flex items-center justify-center w-9 h-9 rounded-full"
        style={{
          top: 'calc(1rem + env(safe-area-inset-top, 0px))',
          background: 'rgba(255,255,255,0.15)',
          zIndex: 10,
          opacity: visible && !isDragging ? 1 : 0,
          transition: 'opacity 200ms ease',
          pointerEvents: isDragging ? 'none' : 'auto',
        }}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div
        ref={imageContainerRef}
        onClick={e => e.stopPropagation()}
        style={{
          opacity: visible ? 1 : 0,
          transform: imgTransform,
          transition: imgTransition,
          willChange: 'transform, opacity',
          maxWidth: '100%',
          maxHeight: '90svh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="試着結果"
          style={{ maxWidth: '100%', maxHeight: '90svh', objectFit: 'contain', display: 'block' }}
          draggable={false}
        />
      </div>
    </div>,
    document.body
  )
}

// ─── 試着履歴カード ───────────────────────────────────────────────────────────

function TryonCard({ tryon, onTap }: { tryon: TryonRow; onTap?: () => void }) {
  const isCompleted = tryon.status === 'completed' && (tryon.result_image_url || tryon.display_url)
  const isFailed = tryon.status === 'failed'
  const isPending = tryon.status === 'pending' || tryon.status === 'processing'

  // display_url: サーバー生成 signed URL または送信直後の blob URL
  const displayImage = tryon.display_url

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--border)' }}
    >
      <div
        className="relative"
        style={{
          aspectRatio: '3/4',
          background: 'var(--bg-elevated)',
          cursor: isCompleted && onTap ? 'pointer' : 'default',
        }}
        onClick={isCompleted && onTap ? onTap : undefined}
      >
        {displayImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayImage}
            alt="試着"
            className="w-full h-full object-cover"
            style={{ opacity: (isPending || isFailed) ? 0.45 : 1 }}
          />
        )}

        {isPending && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background: 'rgba(0,0,0,0.35)' }}>
            <Spinner />
            <p className="text-[10px] text-white/80">生成中</p>
          </div>
        )}

        {isFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1"
            style={{ background: 'rgba(0,0,0,0.45)' }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#F87171" strokeWidth={2} strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <circle cx="12" cy="16" r="0.5" fill="#F87171" />
            </svg>
            <p className="text-[10px]" style={{ color: '#F87171' }}>失敗</p>
          </div>
        )}

        {isCompleted && (
          <div className="absolute top-2 left-2">
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{
                background: 'rgba(52,211,153,0.2)',
                color: '#34D399',
                border: '1px solid rgba(52,211,153,0.3)',
              }}
            >
              完成
            </span>
          </div>
        )}
      </div>

      <div className="px-2.5 py-2" style={{ background: 'var(--bg-elevated)' }}>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {formatRelativeTime(tryon.created_at)}
        </p>
      </div>
    </div>
  )
}

// ─── Icons / Spinner ──────────────────────────────────────────────────────────

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
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" stroke="none" />
    </svg>
  )
}
