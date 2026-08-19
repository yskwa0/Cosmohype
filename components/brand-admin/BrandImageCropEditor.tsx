'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { pressableClass } from '@/lib/brandAdminUi'

/**
 * Brand ロゴ / カバー共通 crop editor (Migration 147)。
 *
 * ============================================================================
 * 非破壊 crop の座標系 (Web / iOS 共通)
 * ============================================================================
 *
 *   1. 元画像 (natural W_img × H_img) を Storage にそのまま保存する。canvas.toBlob
 *      による焼き込み / storage 上書き / 別 file 生成は一切行わない。
 *   2. 表示枠 (container W_c × H_c) は circle=正方形 / rectangle=aspectRatio 固定。
 *   3. baseScale = max(W_c / W_img, H_c / H_img)
 *      = 「枠を aspectFill で完全に埋めるために必要な最小 scale」。
 *   4. effectiveScale = baseScale * zoom
 *      よって zoom=1.0 が「枠を埋める最小倍率」で、それ以上ズームすると元画像の
 *      追加ソース pixel が露出する (単純な原寸 1× ではない)。
 *   5. 描画される image 実寸 = W_img * effectiveScale × H_img * effectiveScale。
 *   6. Visual pixel offset:
 *        dx = zoom * offsetX * W_c   (offsetX ∈ [-1, +1])
 *        dy = zoom * offsetY * H_c   (offsetY ∈ [-1, +1])
 *      iOS 側は `image.scaleEffect(zoom).offset(x: zoom*offX*W_c, y: zoom*offY*H_c)`
 *      と 1:1 対応する (`BrandShopView` の logo/cover 描画で同 formula を使用)。
 *   7. Offset clamp は image aspect と frame aspect から動的に計算する:
 *        max |dx| = max(0, (drawnW - W_c) / 2)
 *        max |dy| = max(0, (drawnH - H_c) / 2)
 *        max |offsetX| = max |dx| / (zoom * W_c)
 *        max |offsetY| = max |dy| / (zoom * H_c)
 *      これで image edge が container 内に入る前で必ず止まるため、枠内に空白
 *      (transparent / bg) が絶対に出ない。単純な [-1, +1] 固定 clamp は使わない。
 *
 *   Storage / DB に保存するのは zoom / offsetX / offsetY のみ。画像 file の pixel
 *   自体は本 component から書き換えない。
 *
 * ============================================================================
 * 実装ノート
 * ============================================================================
 *
 *   ・container size / image natural size を ResizeObserver + <img>.onLoad で
 *     測定し、baseScale と clamp 範囲を再計算する。
 *   ・img を intrinsic 幅で絶対配置し、外側 div の overflow:hidden で outer frame
 *     を clip する。 `object-cover` を使うと 100%×100% 描画 box 内で pre-crop され、
 *     transform:scale がそれ以上ソース pixel を露出できないため使用しない。
 *   ・drag: pointerdown/move/up でピクセル差分から offset delta を算出。
 *     delta_offset = delta_px / (zoom * containerSize) で iOS と同 visual 速度。
 *   ・zoom slider を動かすと maxOffsetX/Y が縮み、既存 offset が範囲外になる場合
 *     は自動で clamp し戻す (image edge 露出防止)。
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

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

export default function BrandImageCropEditor({
  imageURL, aspectRatio, shape, namePrefix, initial, disabled,
}: Props) {
  const [zoom, setZoom] = useState<number>(clamp(initial.zoom, ZOOM_MIN, ZOOM_MAX))
  const [offX, setOffX] = useState<number>(clamp(initial.offsetX, -1, 1))
  const [offY, setOffY] = useState<number>(clamp(initial.offsetY, -1, 1))

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)

  const dragStateRef = useRef<{
    startX: number; startY: number; baseOffX: number; baseOffY: number
  } | null>(null)

  // container の実寸を ResizeObserver で追う (max offset の計算に使用)
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      setContainerSize({ w: el.clientWidth, h: el.clientHeight })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 画像 URL が変わったら natural size を破棄 (onLoad で再取得)、crop も初期値に戻す
  useEffect(() => {
    setNatural(null)
    setZoom(clamp(initial.zoom, ZOOM_MIN, ZOOM_MAX))
    setOffX(clamp(initial.offsetX, -1, 1))
    setOffY(clamp(initial.offsetY, -1, 1))
    // dependencies に initial の 3 field を入れると parent 側 setState の度に reset が
    // かかってしまうため、imageURL のみを trigger にする (initial の変化は同じ imageURL
    // 前提でしか意味を持たない)。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageURL])

  const onImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    }
  }, [])

  // baseScale / effectiveScale / drawn size を導出
  const { baseScale, effectiveScale, drawnW, drawnH, maxOffX, maxOffY } = useMemo(() => {
    const cw = containerSize.w
    const ch = containerSize.h
    if (cw <= 0 || ch <= 0 || !natural) {
      return { baseScale: 1, effectiveScale: zoom, drawnW: cw, drawnH: ch, maxOffX: 0, maxOffY: 0 }
    }
    const bs = Math.max(cw / natural.w, ch / natural.h)
    const es = bs * zoom
    const dw = natural.w * es
    const dh = natural.h * es
    const mxPx = Math.max(0, (dw - cw) / 2)
    const myPx = Math.max(0, (dh - ch) / 2)
    const mx = zoom > 0 ? mxPx / (zoom * cw) : 0
    const my = zoom > 0 ? myPx / (zoom * ch) : 0
    return { baseScale: bs, effectiveScale: es, drawnW: dw, drawnH: dh, maxOffX: mx, maxOffY: my }
  }, [containerSize.w, containerSize.h, natural, zoom])

  // maxOffX/Y が縮んで現在値が範囲外になった場合は clamp 戻し (無限ループ防止のため
  // useEffect 内で条件付き setState)
  useEffect(() => {
    setOffX((prev) => {
      const c = clamp(prev, -maxOffX, maxOffX)
      return c === prev ? prev : c
    })
    setOffY((prev) => {
      const c = clamp(prev, -maxOffY, maxOffY)
      return c === prev ? prev : c
    })
  }, [maxOffX, maxOffY])

  // === Drag ===
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    if (!containerRef.current || !imageURL) return
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseOffX: offX,
      baseOffY: offY,
    }
    containerRef.current.setPointerCapture(e.pointerId)
  }, [disabled, imageURL, offX, offY])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragStateRef.current
    if (!s) return
    const cw = containerSize.w
    const ch = containerSize.h
    if (cw <= 0 || ch <= 0) return
    // visual px delta → offset delta (zoom * offsetX * W = visual px なので逆算)
    const dx = e.clientX - s.startX
    const dy = e.clientY - s.startY
    setOffX(clamp(s.baseOffX + dx / (cw * zoom), -maxOffX, maxOffX))
    setOffY(clamp(s.baseOffY + dy / (ch * zoom), -maxOffY, maxOffY))
  }, [containerSize.w, containerSize.h, zoom, maxOffX, maxOffY])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragStateRef.current = null
    if (containerRef.current?.hasPointerCapture(e.pointerId)) {
      containerRef.current.releasePointerCapture(e.pointerId)
    }
  }, [])

  const reset = () => {
    setZoom(1.0)
    setOffX(0.0)
    setOffY(0.0)
  }

  // 半径 = 円形の直径 = width、矩形なら aspectRatio に従う height
  const isCircle = shape === 'circle'

  // Preview: width は container が決める (100%)、height は aspectRatio から計算
  const previewStyle: React.CSSProperties = {
    aspectRatio: `${aspectRatio}`,
    borderRadius: isCircle ? '9999px' : '12px',
  }

  // Rendered offset (px) = zoom * clamped offset * container 幅
  const clampedOffX = clamp(offX, -maxOffX, maxOffX)
  const clampedOffY = clamp(offY, -maxOffY, maxOffY)
  const offXpx = zoom * clampedOffX * containerSize.w
  const offYpx = zoom * clampedOffY * containerSize.h

  // 画像 file を intrinsic 幅で絶対配置 (object-cover を使わない = pre-crop 回避、
  // outer overflow:hidden で最終 clip する)。
  const imgStyle: React.CSSProperties = natural
    ? {
        position: 'absolute',
        top: `${(containerSize.h - drawnH) / 2 + offYpx}px`,
        left: `${(containerSize.w - drawnW) / 2 + offXpx}px`,
        width: `${drawnW}px`,
        height: `${drawnH}px`,
        maxWidth: 'none',
        maxHeight: 'none',
        userSelect: 'none',
        pointerEvents: 'none',
      }
    : {
        // natural 未取得の間 (load 直後の 1 frame): 中央に fallback 表示
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        userSelect: 'none',
        pointerEvents: 'none',
      }

  // effectiveScale 表示用 (デバッグ寄り情報だが、baseScale と zoom の関係を hint 表示)
  const effectiveScaleLabel = natural
    ? `${effectiveScale.toFixed(2)}× (base ${baseScale.toFixed(2)} × zoom ${zoom.toFixed(2)})`
    : `${zoom.toFixed(2)}×`

  return (
    <div className="space-y-2">
      {/* Hidden inputs = 親 form の submit 時に crop 値を送信 (clamp 済み値) */}
      <input type="hidden" name={`${namePrefix}_crop_zoom`}     value={zoom} />
      <input type="hidden" name={`${namePrefix}_crop_offset_x`} value={clampedOffX} />
      <input type="hidden" name={`${namePrefix}_crop_offset_y`} value={clampedOffY} />

      {/* Preview (画像がある時のみ crop 表示、無い時は placeholder) */}
      <div
        ref={containerRef}
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
            onLoad={onImgLoad}
            style={imgStyle}
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
            <span className="w-28 text-right font-mono">{effectiveScaleLabel}</span>
          </label>
          <button
            type="button"
            onClick={reset}
            className={'px-2 py-1 rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-50 ' + pressableClass}
          >
            中央に戻す
          </button>
        </div>
      )}
      {imageURL && (
        <div className="text-[10px] text-neutral-500">
          プレビュー上をドラッグで表示位置を調整、スライダーで拡大縮小できます。
          元画像は保存時も切り抜かれません (表示位置のみ調整)。
        </div>
      )}
    </div>
  )
}
