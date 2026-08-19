'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { pressableClass, Spinner } from '@/lib/brandAdminUi'

interface Props {
  issueId: string
  action: (formData: FormData) => Promise<void>
  disabled?: boolean
}

function SubmitButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={!enabled || pending}
      className={
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-semibold bg-red-600 text-white disabled:opacity-40 ' +
        pressableClass
      }
    >
      {pending && <Spinner />}
      {pending ? '処理中…' : '受領して返金へ進む'}
    </button>
  )
}

/**
 * 「返品商品を受け取りました」+ 「返金へ進む」を 1 form / 1 action で扱う。
 * checkbox 「返品商品を実際に受領しました」必須。
 * 送信は Server Action initiateIssueRefundAction。二重送信は useFormStatus + disabled で防止。
 */
export default function ReceiveAndRefundForm({ issueId, action, disabled }: Props) {
  const [checked, setChecked] = useState(false)
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="issue_id" value={issueId} />
      <input type="hidden" name="confirmed" value={checked ? 'true' : 'false'} />
      <div className="text-sm font-semibold text-neutral-900">返品商品を受け取りましたか？</div>
      <div className="text-[12px] text-neutral-600">
        商品を実際に受け取ったことを確認してください。<br />
        この後、Stripe への全額返金処理に進みます。
      </div>
      <label className="flex items-center gap-2 text-[12px] text-neutral-700">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <span>返品商品を実際に受領しました</span>
      </label>
      <SubmitButton enabled={checked && !disabled} />
    </form>
  )
}
