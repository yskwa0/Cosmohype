'use client'

import { useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { pressableClass, Spinner } from '@/lib/brandAdminUi'

interface Props {
  label: string
  confirmMessage: string
  primary?: boolean
}

function InnerButton({ label, primary }: { label: string; primary?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-semibold ' +
        (primary
          ? 'bg-neutral-900 text-white disabled:opacity-40'
          : 'border border-neutral-300 text-neutral-800 disabled:opacity-40') +
        ' ' + pressableClass
      }
    >
      {pending && <Spinner />}
      {pending ? '処理中…' : label}
    </button>
  )
}

/**
 * 送信前に window.confirm() で確認を挟むボタン。
 * form の action (Server Action) は親側で指定する前提。
 * 二重送信は useFormStatus().pending + disabled で防止。
 */
export default function ConfirmSubmitButton({ label, confirmMessage, primary }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  return (
    <div ref={ref} className="flex flex-col gap-2">
      {!confirmed ? (
        <button
          type="button"
          onClick={() => {
            if (window.confirm(confirmMessage)) {
              setConfirmed(true)
              // submit を次 tick で実行
              requestAnimationFrame(() => {
                const form = ref.current?.closest('form') as HTMLFormElement | null
                form?.requestSubmit()
              })
            }
          }}
          className={
            'px-4 py-2 rounded text-sm font-semibold ' +
            (primary
              ? 'bg-neutral-900 text-white'
              : 'border border-neutral-300 text-neutral-800') +
            ' ' + pressableClass
          }
        >
          {label}
        </button>
      ) : (
        <InnerButton label={label} primary={primary} />
      )}
    </div>
  )
}
