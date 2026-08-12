'use client'

import Image from 'next/image'
import { useEffect, useState, useTransition } from 'react'

/**
 * Brand Admin 商品画像 crop editor (Migration 137 対応)。
 *
 * 4:5 の縦型枠に対して: zoom (1.0-3.0) / offset_x (-1〜+1) / offset_y (-1〜+1) を slider で調整。
 * プレビューでは常に aspectFill + transform: scale(zoom) translate(offset*100%) を適用し、
 * iOS 側の描画と 1:1 で対応する見え方に統一。
 *
 * 保存は Server Action (updateImageCropAction 相当) を呼び、失敗時はエラー表示。
 * 成功時は onSaved で親に crop 値を返し、親が optimistic update。
 * Migration 137 未適用環境ではサーバ側 RPC が存在せずエラー → editor 内で inline 表示。
 */

export interface ShopImageCrop {
  zoom: number
  offsetX: number
  offsetY: number
}

interface Props {
  imageUrl: string
  imageId: string
  initial: ShopImageCrop
  onCancel: () => void
  onSaved: (crop: ShopImageCrop) => void
  action: (formData: FormData) => Promise<void>
}

const ZOOM_MIN = 1.0
const ZOOM_MAX = 3.0
const OFFSET_MIN = -1.0
const OFFSET_MAX = 1.0

export default function ShopImageCropEditor({
  imageUrl,
  imageId,
  initial,
  onCancel,
  onSaved,
  action,
}: Props) {
  const [zoom, setZoom] = useState(initial.zoom)
  const [offX, setOffX] = useState(initial.offsetX)
  const [offY, setOffY] = useState(initial.offsetY)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Esc でキャンセル
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  const reset = () => { setZoom(1.0); setOffX(0.0); setOffY(0.0) }

  const submit = () => {
    setErrorMsg(null)
    const fd = new FormData()
    fd.set('image_id', imageId)
    fd.set('crop_zoom', String(zoom))
    fd.set('crop_offset_x', String(offX))
    fd.set('crop_offset_y', String(offY))
    startTransition(async () => {
      try {
        await action(fd)
        // Server Action は redirect または void 完了。成功 = onSaved を親へ通知。
        onSaved({ zoom, offsetX: offX, offsetY: offY })
      } catch (e) {
        const digest = String((e as { digest?: string })?.digest ?? '')
        if (digest.startsWith('NEXT_REDIRECT')) {
          onSaved({ zoom, offsetX: offX, offsetY: offY })
          return
        }
        console.error('[ShopImageCropEditor] save failed', e)
        setErrorMsg('保存に失敗しました。DB 準備 (Migration 137) が未完了の可能性があります。')
      }
    })
  }

  // transform: scale(z) translate(tx*100%, ty*100%) を適用 (translate は要素自身の size に対する %)
  const transform = `scale(${zoom}) translate(${offX * 100}%, ${offY * 100}%)`

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white rounded-xl max-w-sm w-full p-5 space-y-4 shadow-xl">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-semibold">表示位置を調整</h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-[11px] text-neutral-500 hover:text-neutral-800"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        <p className="text-[11px] text-neutral-500 leading-relaxed">
          HYPE では商品画像を 4:5 縦型で表示します。ズームと位置を調整して、
          最も見せたい部分が枠内に入るようにしてください。
        </p>

        {/* 4:5 preview */}
        <div className="relative w-full mx-auto max-w-[240px]" style={{ aspectRatio: '4 / 5' }}>
          <div className="absolute inset-0 rounded-lg overflow-hidden bg-neutral-100">
            <div
              className="absolute inset-0"
              style={{
                transform,
                transformOrigin: 'center',
              }}
            >
              <Image
                src={imageUrl}
                alt="プレビュー"
                fill
                sizes="240px"
                className="object-cover"
                unoptimized
              />
            </div>
          </div>
          <div className="absolute inset-0 rounded-lg border-2 border-neutral-900/70 pointer-events-none" />
        </div>

        {/* Sliders */}
        <div className="space-y-3">
          <SliderRow
            label="ズーム"
            value={zoom}
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={0.05}
            display={zoom.toFixed(2) + '×'}
            onChange={setZoom}
          />
          <SliderRow
            label="左右"
            value={offX}
            min={OFFSET_MIN}
            max={OFFSET_MAX}
            step={0.02}
            display={(offX * 100).toFixed(0) + '%'}
            onChange={setOffX}
          />
          <SliderRow
            label="上下"
            value={offY}
            min={OFFSET_MIN}
            max={OFFSET_MAX}
            step={0.02}
            display={(offY * 100).toFixed(0) + '%'}
            onChange={setOffY}
          />
        </div>

        {errorMsg && (
          <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="flex-1 px-4 py-2 rounded-md text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {isPending ? '保存中…' : '保存する'}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={isPending}
            className="px-3 py-2 rounded-md text-[12px] font-semibold border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            リセット
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-3 py-2 rounded-md text-[12px] font-semibold border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}

function SliderRow({
  label, value, min, max, step, display, onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-neutral-600 mb-1">
        <span>{label}</span>
        <span className="font-mono">{display}</span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-neutral-900"
      />
    </div>
  )
}
