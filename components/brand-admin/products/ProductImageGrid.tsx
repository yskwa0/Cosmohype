'use client'

import Image from 'next/image'
import { useOptimistic, useState, useTransition } from 'react'
import ShopImageCropEditor, { type ShopImageCrop } from './ShopImageCropEditor'

/**
 * Brand Admin 商品画像グリッド (STEP 2)。
 *
 * 「削除」を Optimistic UI 化するため既存 Server Component 内 grid を
 * この Client Component に切り出す。
 *
 * 削除 flow:
 *   1. 押下直後に対象画像を useOptimistic で即時非表示
 *   2. useTransition 内で既存 deleteAction (Server Action) を実行
 *      (Server Action 側は redirect(...) で NEXT_REDIRECT を throw するが正常経路)
 *   3. 成功時: revalidatePath により親が新 images (削除後) で再描画
 *              → useOptimistic の base state 自体が更新され、hidden のまま
 *   4. 失敗時: 親は同じ images (未削除) で再描画
 *              → transition 終了で useOptimistic の overlay が消え、画像が復活
 *   5. Pending 中は該当 image のみ opacity 落とし + 削除・primary ボタンを disable
 *      (二重削除 + primary 誤操作を防止)。他画像の操作は止めない。
 *
 * primary image / storage_path / sort_order / Server Action の仕様は一切変更しない。
 * setPrimaryImageAction は既存の plain <form action={...}> をそのまま使用
 * (submit → page navigation → 全体再描画で反映される既存挙動を維持)。
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
}

export default function ProductImageGrid({
  productId,
  images,
  publicBase,
  canEdit,
  deleteAction,
  setPrimaryAction,
  updateCropAction,
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
        // Server Action の redirect() は NEXT_REDIRECT を throw する。
        // 成功/失敗どちらも redirect で戻ってくるため catch は共通で握りつぶし、
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

  // 現在の crop 値を解決 (optimistic override → DB 値 → default)
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
          const tileTransform = `scale(${crop.zoom}) translate(${crop.offsetX * 100}%, ${crop.offsetY * 100}%)`
          return (
            <div
              key={img.id}
              className={
                'border border-neutral-200 rounded-lg overflow-hidden bg-neutral-50' +
                (isPending ? ' opacity-60' : '')
              }
            >
              {/* iOS と同じ 4:5 縦型プレビュー (aspect-square から aspect-[4/5] に変更) */}
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: '4 / 5' }}>
                {publicBase && (
                  <div
                    className="absolute inset-0"
                    style={{ transform: tileTransform, transformOrigin: 'center' }}
                  >
                    <Image
                      src={`${publicBase}${img.storage_path}`}
                      alt=""
                      fill
                      sizes="200px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
                {img.is_primary && (
                  <span className="absolute top-1 left-1 text-[9px] font-semibold bg-neutral-900 text-white px-1.5 py-0.5 rounded">
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
                        className="w-full text-[11px] py-1 rounded border border-neutral-900 text-neutral-900 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
                      className="w-full text-[11px] py-1 rounded border border-neutral-300 text-neutral-800 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      表示位置を調整
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDelete(img.id)}
                    className="w-full text-[11px] py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
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
