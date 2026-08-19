'use client'

import { useFormStatus } from 'react-dom'
import { pressableClass, Spinner } from '@/lib/brandAdminUi'

interface Props {
  /** server action (`'use server'` 定義済のもの) を渡す。event handler ではない */
  action: (fd: FormData) => Promise<void>
  hiddenFields?: Record<string, string>
  confirmMessage: string
  buttonLabel: string
  pendingLabel?: string
  buttonClassName: string
  containerClassName?: string
}

/**
 * server component から event handler prop を渡せない制約を回避するための
 * 汎用「確認ダイアログ付き submit form」client component。
 *   - action は serializable な server-action reference なので Server → Client OK
 *   - onSubmit の window.confirm はこの client component 内部で完結
 *   - pending 中は button disabled + ラベル差替 (useFormStatus)
 */
export default function ConfirmSubmitButton({
  action,
  hiddenFields,
  confirmMessage,
  buttonLabel,
  pendingLabel = '処理中…',
  buttonClassName,
  containerClassName,
}: Props) {
  return (
    <form
      action={action}
      className={containerClassName}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault()
      }}
    >
      {hiddenFields &&
        Object.entries(hiddenFields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
      <Submit label={buttonLabel} pendingLabel={pendingLabel} className={buttonClassName} />
    </form>
  )
}

function Submit({ label, pendingLabel, className }: { label: string; pendingLabel: string; className: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        className + ' ' + pressableClass +
        ' inline-flex items-center justify-center gap-2'
      }
    >
      {pending && <Spinner />}
      {pending ? pendingLabel : label}
    </button>
  )
}
