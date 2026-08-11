'use client'

import { useState } from 'react'
import VariantEditor from './VariantEditor'

interface Props {
  productId: string
  categorySlug: string
  upsertAction: (fd: FormData) => Promise<void>
}

/**
 * 「新規バリエーションを追加」導線 (client component)。
 * - 通常は button 表示のみ
 * - クリックで VariantEditor (isNew) を展開
 * - VariantEditor 内の × (onCancel) で入力破棄 + 折りたたみ
 * - `seq` を key に渡して再展開時にフォーム内容がリセットされるようにする
 */
export default function AddVariantSection({ productId, categorySlug, upsertAction }: Props) {
  const [open, setOpen] = useState(false)
  const [seq, setSeq] = useState(0)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setSeq((s) => s + 1)
          setOpen(true)
        }}
        className={
          'w-full text-left text-[12px] font-semibold text-neutral-700 ' +
          'border border-dashed border-neutral-300 rounded-lg px-4 py-3 hover:bg-neutral-50'
        }
      >
        ＋ バリエーションを追加
      </button>
    )
  }

  return (
    <div className="border border-dashed border-neutral-300 rounded-lg p-4">
      <VariantEditor
        key={seq}
        productId={productId}
        categorySlug={categorySlug}
        upsertAction={upsertAction}
        onCancel={() => setOpen(false)}
      />
    </div>
  )
}
