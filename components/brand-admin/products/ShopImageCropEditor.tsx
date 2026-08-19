'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from 'react'
import { pressableClass, pressableIconClass, Spinner } from '@/lib/brandAdminUi'

/**
 * Brand Admin 商品画像 crop editor (Migration 137 対応、非破壊)。
 *
 * ============================================================================
 * 座標系 (BrandImageCropEditor と 100% 一致、iOS `ShopView.productImageTile` /
 * `BrandShopView.BrandShopProductCard.imageTile` と 1:1 対応する non-destructive
 * 表示 formula)
 * ============================================================================
 *
 *   ・4:5 縦型 crop frame (HYPE 商品一覧と同 aspect)
 *   ・元画像 (Storage) は物理 crop / 上書きしない。canvas.toBlob 等は使わない。
 *   ・baseScale = max(W_c/W_img, H_c/H_img)  = 枠を aspectFill する最小 scale
 *   ・effectiveScale = baseScale * zoom      = zoom=1.0 が「枠を埋める最小倍率」
 *   ・visual dx = zoom * offsetX * W_c、visual dy = zoom * offsetY * H_c
 *   ・offset は image aspect と frame aspect から動的に clamp する:
 *       max |offsetX| = max(0, (drawnW - W_c)/2) / (zoom * W_c)
 *       max |offsetY| = max(0, (drawnH - H_c)/2) / (zoom * H_c)
 *     枠内に空白が絶対に出ない。単純な [-1, +1] 固定 clamp は使わない。
 *
 *   保存は Server Action (`updateImageCropAction`) を呼び、zoom / offset のみを
 *   `shop_product_images` の crop_zoom / crop_offset_x / crop_offset_y に UPDATE
 *   する (Migration 137)。画像 file 自体は再 upload しない = 非破壊。
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

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

export default function ShopImageCropEditor({
  imageUrl,
  imageId,
  initial,
  onCancel,
  onSaved,
  action,
}: Props) {
  const [zoom, setZoom] = useState(clamp(initial.zoom, ZOOM_MIN, ZOOM_MAX))
  const [offX, setOffX] = useState(clamp(initial.offsetX, -1, 1))
  const [offY, setOffY] = useState(clamp(initial.offsetY, -1, 1))
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const previewRef = useRef<HTMLDivElement | null>(null)
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)

  const dragStateRef = useRef<{
    startX: number; startY: number; baseOffX: number; baseOffY: number
  } | null>(null)

  // Esc でキャンセル
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  // container size を ResizeObserver で追う
  useLayoutEffect(() => {
    const el = previewRef.current
    if (!el) return
    const measure = () => setContainerSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const onImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    }
  }, [])

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

  // clamp 追従 (zoom を下げて max が縮んだ場合等)
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

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!previewRef.current) return
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseOffX: offX,
      baseOffY: offY,
    }
    previewRef.current.setPointerCapture(e.pointerId)
  }, [offX, offY])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragStateRef.current
    if (!s) return
    const cw = containerSize.w
    const ch = containerSize.h
    if (cw <= 0 || ch <= 0) return
    const dx = e.clientX - s.startX
    const dy = e.clientY - s.startY
    setOffX(clamp(s.baseOffX + dx / (cw * zoom), -maxOffX, maxOffX))
    setOffY(clamp(s.baseOffY + dy / (ch * zoom), -maxOffY, maxOffY))
  }, [containerSize.w, containerSize.h, zoom, maxOffX, maxOffY])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragStateRef.current = null
    if (previewRef.current?.hasPointerCapture(e.pointerId)) {
      previewRef.current.releasePointerCapture(e.pointerId)
    }
  }, [])

  const reset = () => { setZoom(1.0); setOffX(0.0); setOffY(0.0) }

  const submit = () => {
    setErrorMsg(null)
    const fd = new FormData()
    fd.set('image_id', imageId)
    fd.set('crop_zoom', String(zoom))
    // clamp 済み値を送信 (image edge 越え禁止)
    fd.set('crop_offset_x', String(clamp(offX, -maxOffX, maxOffX)))
    fd.set('crop_offset_y', String(clamp(offY, -maxOffY, maxOffY)))
    startTransition(async () => {
      try {
        await action(fd)
        onSaved({
          zoom,
          offsetX: clamp(offX, -maxOffX, maxOffX),
          offsetY: clamp(offY, -maxOffY, maxOffY),
        })
      } catch (e) {
        const digest = String((e as { digest?: string })?.digest ?? '')
        if (digest.startsWith('NEXT_REDIRECT')) {
          onSaved({
            zoom,
            offsetX: clamp(offX, -maxOffX, maxOffX),
            offsetY: clamp(offY, -maxOffY, maxOffY),
          })
          return
        }
        console.error('[ShopImageCropEditor] save failed', e)
        setErrorMsg('保存に失敗しました。DB 準備 (Migration 137) が未完了の可能性があります。')
      }
    })
  }

  const clampedOffX = clamp(offX, -maxOffX, maxOffX)
  const clampedOffY = clamp(offY, -maxOffY, maxOffY)
  const offXpx = zoom * clampedOffX * containerSize.w
  const offYpx = zoom * clampedOffY * containerSize.h

  // 画像は intrinsic 幅で絶対配置 (object-cover pre-crop 回避、outer overflow で clip)
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
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        userSelect: 'none',
        pointerEvents: 'none',
      }

  const effectiveScaleLabel = natural
    ? `${effectiveScale.toFixed(2)}× (base ${baseScale.toFixed(2)} × zoom ${zoom.toFixed(2)})`
    : `${zoom.toFixed(2)}×`

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
            className={'text-[11px] text-neutral-500 hover:text-neutral-800 w-6 h-6 flex items-center justify-center rounded ' + pressableIconClass}
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        <p className="text-[11px] text-neutral-500 leading-relaxed">
          HYPE では商品画像を 4:5 縦型で表示します。プレビュー上をドラッグして表示位置を
          調整、Zoom スライダーでズームできます。元画像は保存時も切り抜かれません。
        </p>

        {/* 4:5 preview (HYPE 一覧タイルと同 formula) */}
        <div
          ref={previewRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="relative w-full mx-auto max-w-[240px] overflow-hidden rounded-lg bg-neutral-100 cursor-grab active:cursor-grabbing select-none"
          style={{ aspectRatio: '4 / 5' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="プレビュー"
            draggable={false}
            onLoad={onImgLoad}
            style={imgStyle}
          />
          <div className="absolute inset-0 rounded-lg border-2 border-neutral-900/70 pointer-events-none" />
        </div>

        {/* Sliders + Reset */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-[11px] text-neutral-600 mb-1">
              <span>ズーム</span>
              <span className="font-mono">{effectiveScaleLabel}</span>
            </div>
            <input
              type="range"
              value={zoom}
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={0.05}
              onChange={(e) => setZoom(clamp(parseFloat(e.target.value), ZOOM_MIN, ZOOM_MAX))}
              className="w-full accent-neutral-900"
            />
          </div>
          <button
            type="button"
            onClick={reset}
            disabled={isPending}
            className={
              'px-3 py-1.5 rounded-md text-[12px] font-semibold border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 ' +
              pressableClass
            }
          >
            中央に戻す
          </button>
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
            className={
              'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold ' +
              'bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-50 ' +
              pressableClass
            }
          >
            {isPending && <Spinner />}
            {isPending ? '保存中…' : '保存する'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className={
              'px-3 py-2 rounded-md text-[12px] font-semibold border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 ' +
              pressableClass
            }
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}
