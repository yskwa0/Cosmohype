'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Brand ロゴ / カバー共通 crop editor (Migration 147)。
 *
 * 商品画像 crop (Migration 137) と **同一 formula**:
 *   image.aspectFill → transform: scale(zoom) translate(offsetX*100%, offsetY*100%)
 *   iOS 側: image.scaledToFill().frame(W,H).scaleEffect(zoom).offset(x: zoom*offX*W, y: zoom*offY*H)
 *
 * 値域:
 *   zoom    : 1.0 〜 3.0  (default 1.0 = 中央 aspectFill)
 *   offsetX : -1.0 〜 +1.0 (default 0.0)
 *   offsetY : -1.0 〜 +1.0 (default 0.0)
 *
 * 表示形状は `shape` props で切替:
 *   'circle'      : ロゴ用 (1:1 円形 crop、直径 = width)
 *   'rectangle'   : カバー用 (aspectRatio に従う矩形 crop)
 *
 * 操作:
 *   ・preview 上をドラッグ で offset 更新 (px → -1〜+1 に正規化)
 *   ・zoom slider (range input)
 *   ・「中央に戻す」button で reset
 *
 * 値は本 component 外の <form> に hidden input で埋め込むため、`namePrefix` で
 * 3 field 名を生成する (例: namePrefix='logo' → logo_crop_zoom / logo_crop_offset_x / logo_crop_offset_y)。
 */

export interface BrandCropValue {
  zoom: number
  offsetX: number
  offsetY: number
}

interface Props {
  imageURL: string | null   // 表示対象の画像 URL (blob preview or public URL)
  aspectRatio: number       // width / height (1.0 = 正方形、16/9 = カバー)
  shape: 'circle' | 'rectangle'
  namePrefix: string        // hidden input 名の prefix (例: 'logo' / 'cover')
  initial: BrandCropValue
  disabled?: boolean
}

const ZOOM_MIN = 1.0
const ZOOM_MAX = 3.0
const OFFSET_MIN = -1.0
const OFFSET_MAX = 1.0

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

export default function BrandImageCropEditor({
  imageURL, aspectRatio, shape, namePrefix, initial, disabled,
}: Props) {
  const [zoom, setZoom] = useState<number>(initial.zoom)
  const [offX, setOffX] = useState<number>(initial.offsetX)
  const [offY, setOffY] = useState<number>(initial.offsetY)

  const previewRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<{
    startX: number; startY: number; baseOffX: number; baseOffY: number; w: number; h: number
  } | null>(null)

  // 画像が差替わったら crop を initial に reset (親から新 initial が渡された場合の追従)
  useEffect(() => {
    setZoom(initial.zoom)
    setOffX(initial.offsetX)
    setOffY(initial.offsetY)
  }, [imageURL, initial.zoom, initial.offsetX, initial.offsetY])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    if (!previewRef.current || !imageURL) return
    const rect = previewRef.current.getBoundingClientRect()
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseOffX: offX,
      baseOffY: offY,
      w: rect.width,
      h: rect.height,
    }
    previewRef.current.setPointerCapture(e.pointerId)
  }, [disabled, imageURL, offX, offY])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragStateRef.current
    if (!s) return
    // 画面上のドラッグ px を「preview の width/height 比例」で offset 変化量に写像。
    // iOS 側 offset は zoom*offX*W なので、Web preview 上でも同じ体感になるよう
    // Δoffset = (Δpx / (W or H)) / zoom で正規化 (zoom が大きいほど 1px の動きが小さく感じる)。
    const dx = e.clientX - s.startX
    const dy = e.clientY - s.startY
    const nextOffX = clamp(s.baseOffX + dx / (s.w * zoom), OFFSET_MIN, OFFSET_MAX)
    const nextOffY = clamp(s.baseOffY + dy / (s.h * zoom), OFFSET_MIN, OFFSET_MAX)
    setOffX(nextOffX)
    setOffY(nextOffY)
  }, [zoom])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragStateRef.current = null
    if (previewRef.current?.hasPointerCapture(e.pointerId)) {
      previewRef.current.releasePointerCapture(e.pointerId)
    }
  }, [])

  const reset = () => { setZoom(1.0); setOffX(0.0); setOffY(0.0) }

  // 半径 = 円形の直径 = width、矩形なら aspectRatio に従う height
  const isCircle = shape === 'circle'

  // Preview: width は container が決める (100%)、height は aspectRatio から計算
  const previewStyle: React.CSSProperties = {
    aspectRatio: `${aspectRatio}`,
    borderRadius: isCircle ? '9999px' : '12px',
    // 円形の場合、preview そのものを円形にする
    // 矩形はカバー用の 16:9 ボックス
  }

  const imageTransformStyle: React.CSSProperties = {
    transform: `scale(${zoom}) translate(${offX * 100}%, ${offY * 100}%)`,
    transformOrigin: 'center center',
  }

  return (
    <div className="space-y-2">
      {/* Hidden inputs = 親 form の submit 時に crop 値を送信 */}
      <input type="hidden" name={`${namePrefix}_crop_zoom`}     value={zoom} />
      <input type="hidden" name={`${namePrefix}_crop_offset_x`} value={offX} />
      <input type="hidden" name={`${namePrefix}_crop_offset_y`} value={offY} />

      {/* Preview (画像がある時のみ crop 表示、無い時は placeholder) */}
      <div
        ref={previewRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={previewStyle}
        className={
          'relative w-full overflow-hidden bg-neutral-100 border border-neutral-200 ' +
          (imageURL && !disabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-default') +
          ' select-none'
        }
      >
        {imageURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageURL}
            alt="crop preview"
            draggable={false}
            style={imageTransformStyle}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-400">
            未設定
          </div>
        )}
      </div>

      {/* Zoom slider + reset (画像が無ければ非表示) */}
      {imageURL && !disabled && (
        <div className="flex items-center gap-3 text-[11px] text-neutral-700">
          <label className="flex items-center gap-2 flex-1">
            <span className="w-10">Zoom</span>
            <input
              type="range"
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(clamp(parseFloat(e.target.value), ZOOM_MIN, ZOOM_MAX))}
              className="flex-1"
            />
            <span className="w-10 text-right font-mono">{zoom.toFixed(2)}x</span>
          </label>
          <button
            type="button"
            onClick={reset}
            className="px-2 py-1 rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
          >
            中央に戻す
          </button>
        </div>
      )}
      {imageURL && (
        <div className="text-[10px] text-neutral-500">
          プレビュー上をドラッグで表示位置を調整、スライダーで拡大縮小できます。
        </div>
      )}
    </div>
  )
}
