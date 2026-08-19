'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useOptimistic, useRef, useState, useTransition } from 'react'
import ShopImageCropEditor, { type ShopImageCrop } from './ShopImageCropEditor'
import { pressableClass, Spinner } from '@/lib/brandAdminUi'

/**
 * Brand Admin 商品画像グリッド (STEP 2)。
 *
 * ・削除は Optimistic UI (useOptimistic + useTransition)。
 * ・アップロード直後の画像は URL param (`just_uploaded=<image_id>`) を検知して
 *   ShopImageCropEditor を自動オープン。 (Brand Admin STEP2 の「商品画像を選択 →
 *   すぐ位置調整」フローを 1 step で完結させるため)
 * ・タイル表示は preview / iOS BrandShopView と同じ非破壊 crop formula を使用:
 *     baseScale = max(cw/nw, ch/nh)
 *     effectiveScale = baseScale * zoom
 *     visual dx = zoom * offsetX * cw, dy = zoom * offsetY * ch
 *   `object-cover` は使わない (pre-crop してしまい scale が新たなソース pixel を
 *   露出できなくなるため)。
 */

export interface ProductImageItem {
  id: string
  storage_path: string
  sort_order: number
  is_primary: boolean
  crop_zoom?: number | null
  crop_offset_x?: number | null
  crop_offset_y?: number | null
}

interface Props {
  productId: string
  images: ProductImageItem[]
  publicBase: string
  canEdit: boolean
  deleteAction: (formData: FormData) => Promise<void>
  setPrimaryAction: (formData: FormData) => Promise<void>
  /** Migration 137 適用後のみ渡す。undefined なら crop 編集 UI は非表示 */
  updateCropAction?: (formData: FormData) => Promise<void>
  /** upload 直後の image_id (URL param 経由)。 該当 tile があれば crop editor を auto-open */
  justUploadedImageId?: string | null
}

export default function ProductImageGrid({
  productId,
  images,
  publicBase,
  canEdit,
  deleteAction,
  setPrimaryAction,
  updateCropAction,
  justUploadedImageId,
}: Props) {
  const [optimisticImages, hideOptimistically] = useOptimistic<ProductImageItem[], string>(
    images,
    (current, hideId) => current.filter((i) => i.id !== hideId),
  )
  // crop 編集: optimistic に crop 値を上書き (server round-trip 中も preview 反映)
  const [cropOverrides, setCropOverrides] = useState<Record<string, ShopImageCrop>>({})
  const [editingImageId, setEditingImageId] = useState<string | null>(null)

  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  // upload 直後の image に対して crop editor を auto-open
  //   ・justUploadedImageId が images に存在する場合のみ open (削除済み・別 product 混入対策)
  //   ・updateCropAction が未定義 (Migration 137 未適用) の場合は open しない
  //   ・ユーザーが Cancel してもすぐ再オープンしないように処理済みフラグをローカル保持
  const autoOpenedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!justUploadedImageId) return
    if (!updateCropAction) return
    if (autoOpenedRef.current === justUploadedImageId) return
    if (!images.some((i) => i.id === justUploadedImageId)) return
    autoOpenedRef.current = justUploadedImageId
    setEditingImageId(justUploadedImageId)
  }, [justUploadedImageId, images, updateCropAction])

  const handleDelete = (imageId: string) => {
    if (pendingIds.has(imageId)) return
    setPendingIds((prev) => {
      const next = new Set(prev)
      next.add(imageId)
      return next
    })
    startTransition(async () => {
      hideOptimistically(imageId)
      const fd = new FormData()
      fd.set('product_id', productId)
      fd.set('image_id', imageId)
      try {
        await deleteAction(fd)
      } catch {
        // Server Action の redirect() は NEXT_REDIRECT を throw する。 catch は共通で握りつぶし、
        // 実データ整合は親の再描画 + useOptimistic の自動 revert に委ねる。
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev)
          next.delete(imageId)
          return next
        })
      }
    })
  }

  if (optimisticImages.length === 0) {
    return (
      <div className="text-[13px] text-orange-700 bg-orange-50 border border-orange-200 rounded px-3 py-3 mb-4">
        商品画像を追加してください（公開には 1 枚以上必要です）。
      </div>
    )
  }

  const cropFor = (img: ProductImageItem): ShopImageCrop => {
    const o = cropOverrides[img.id]
    if (o) return o
    return {
      zoom:    typeof img.crop_zoom     === 'number' ? img.crop_zoom     : 1.0,
      offsetX: typeof img.crop_offset_x === 'number' ? img.crop_offset_x : 0.0,
      offsetY: typeof img.crop_offset_y === 'number' ? img.crop_offset_y : 0.0,
    }
  }

  const editingImg = editingImageId
    ? optimisticImages.find((i) => i.id === editingImageId) ?? null
    : null

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {optimisticImages.map((img) => {
          const isPending = pendingIds.has(img.id)
          const crop = cropFor(img)
          return (
            <div
              key={img.id}
              className={
                'border border-neutral-200 rounded-lg overflow-hidden bg-neutral-50' +
                (isPending ? ' opacity-60' : '')
              }
            >
              {/* iOS と同じ 4:5 縦型プレビュー + 非破壊 crop 表示 */}
              <div className="relative w-full overflow-hidden bg-neutral-100" style={{ aspectRatio: '4 / 5' }}>
                {publicBase && (
                  <ShopImageCropTile
                    src={`${publicBase}${img.storage_path}`}
                    crop={crop}
                  />
                )}
                {img.is_primary && (
                  <span className="absolute top-1 left-1 text-[9px] font-semibold bg-neutral-900 text-white px-1.5 py-0.5 rounded z-10">
                    メイン画像
                  </span>
                )}
              </div>
              {canEdit && (
                <div className="p-2 space-y-1.5">
                  {!img.is_primary && (
                    <form action={setPrimaryAction}>
                      <input type="hidden" name="product_id" value={productId} />
                      <input type="hidden" name="image_id" value={img.id} />
                      <button
                        type="submit"
                        disabled={isPending}
                        className={
                          'w-full text-[11px] py-1 rounded border border-neutral-900 text-neutral-900 hover:bg-neutral-50 ' +
                          'disabled:opacity-40 disabled:cursor-not-allowed ' + pressableClass
                        }
                      >
                        メイン画像に設定
                      </button>
                    </form>
                  )}
                  {updateCropAction && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setEditingImageId(img.id)}
                      className={
                        'w-full text-[11px] py-1 rounded border border-neutral-300 text-neutral-800 hover:bg-neutral-50 ' +
                        'disabled:opacity-40 disabled:cursor-not-allowed ' + pressableClass
                      }
                    >
                      表示位置を調整
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(img.id)}
                    className={
                      'w-full inline-flex items-center justify-center gap-1.5 text-[11px] py-1 rounded ' +
                      'border border-red-300 text-red-700 hover:bg-red-50 ' +
                      'disabled:opacity-40 disabled:cursor-not-allowed ' + pressableClass
                    }
                  >
                    {isPending && <Spinner />}
                    {isPending ? '削除中…' : '削除'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {editingImg && updateCropAction && publicBase && (
        <ShopImageCropEditor
          imageId={editingImg.id}
          imageUrl={`${publicBase}${editingImg.storage_path}`}
          initial={cropFor(editingImg)}
          action={updateCropAction}
          onCancel={() => setEditingImageId(null)}
          onSaved={(newCrop) => {
            setCropOverrides((prev) => ({ ...prev, [editingImg.id]: newCrop }))
            setEditingImageId(null)
          }}
        />
      )}
    </>
  )
}

/**
 * 非破壊 crop tile 表示 (grid セル用)。
 * ShopImageCropEditor / iOS BrandShopView と 100% 同じ formula:
 *   baseScale = max(cw/nw, ch/nh), effectiveScale = baseScale * zoom
 *   dx = zoom * offsetX * cw, dy = zoom * offsetY * ch
 * `object-cover` は使わず、img を intrinsic 幅で絶対配置 + outer overflow で clip。
 */
function ShopImageCropTile({ src, crop }: { src: string; crop: ShopImageCrop }) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const [box, setBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const onLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    }
  }, [])

  const { drawnW, drawnH, offXpx, offYpx } = useMemo(() => {
    const cw = box.w, ch = box.h
    if (cw <= 0 || ch <= 0 || !natural) {
      return { drawnW: cw, drawnH: ch, offXpx: 0, offYpx: 0 }
    }
    const baseScale = Math.max(cw / natural.w, ch / natural.h)
    const effectiveScale = baseScale * crop.zoom
    const dw = natural.w * effectiveScale
    const dh = natural.h * effectiveScale
    return {
      drawnW: dw,
      drawnH: dh,
      offXpx: crop.zoom * crop.offsetX * cw,
      offYpx: crop.zoom * crop.offsetY * ch,
    }
  }, [box.w, box.h, natural, crop.zoom, crop.offsetX, crop.offsetY])

  const imgStyle: React.CSSProperties = natural
    ? {
        position: 'absolute',
        top: `${(box.h - drawnH) / 2 + offYpx}px`,
        left: `${(box.w - drawnW) / 2 + offXpx}px`,
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

  return (
    <div ref={boxRef} className="absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" onLoad={onLoad} style={imgStyle} draggable={false} />
    </div>
  )
}
