'use client'

import { useFormStatus } from 'react-dom'

interface Props {
  productId: string
  action: (formData: FormData) => Promise<void>
  disabled?: boolean
  disabledReason?: string
  /** ボタン label (デフォルト 「商品を公開する」)。再公開時は 「商品を再公開する」 等に差替 */
  buttonLabel?: string
  /** pending 中の label (デフォルト 「公開処理中…」) */
  pendingLabel?: string
  /** 確認 modal 本文 (デフォルトは通常公開用) */
  confirmMessage?: string
}

function PublishButton({ enabled, label, pendingLabel }: { enabled: boolean; label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={!enabled || pending}
      className={
        'w-full sm:w-auto px-6 py-3 rounded-md text-sm font-semibold ' +
        'bg-neutral-900 text-white hover:bg-neutral-800 ' +
        'disabled:bg-neutral-400 disabled:text-neutral-100 disabled:cursor-not-allowed'
      }
    >
      {pending ? pendingLabel : label}
    </button>
  )
}

export default function PublishProductForm({
  productId,
  action,
  disabled,
  disabledReason,
  buttonLabel = '商品を公開する',
  pendingLabel = '公開処理中…',
  confirmMessage = 'この内容で商品を公開しますか？\n\n公開後は iOS の HYPE 一覧に表示され、購入可能になります。',
}: Props) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault()
      }}
    >
      <input type="hidden" name="product_id" value={productId} />
      <PublishButton enabled={!disabled} label={buttonLabel} pendingLabel={pendingLabel} />
      {disabled && disabledReason && (
        <div className="mt-2 text-[12px] text-neutral-600">{disabledReason}</div>
      )}
    </form>
  )
}
