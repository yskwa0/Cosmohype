'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { pressableClass, Spinner } from '@/lib/brandAdminUi'

interface Props {
  groupId: string
  action: (formData: FormData) => Promise<void>
}

const CARRIERS = [
  { value: 'yamato',     label: 'ヤマト運輸' },
  { value: 'sagawa',     label: '佐川急便'   },
  { value: 'japan_post', label: '日本郵便'   },
  { value: 'other',      label: 'その他'     },
] as const

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-semibold bg-neutral-900 text-white disabled:opacity-40 ' +
        pressableClass
      }
    >
      {pending && <Spinner />}
      {pending ? '送信中…' : '発送済みにする'}
    </button>
  )
}

/**
 * 「発送済みにする」フォーム。
 * carrier 選択 + tracking_number 入力 + 確認 checkbox が揃うまで submit disabled。
 * 送信は Server Action (props.action) で行い、Web client から DB に直接触れない。
 */
export default function ShipForm({ groupId, action }: Props) {
  const [carrier, setCarrier] = useState('')
  const [tracking, setTracking] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const canSubmit =
    carrier !== '' && tracking.trim().length > 0 && tracking.length <= 60 && confirmed

  return (
    <form action={action} className="space-y-3 max-w-md">
      <input type="hidden" name="order_group_id" value={groupId} />
      <div>
        <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
          配送業者
        </label>
        <select
          name="carrier"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          className="w-full h-10 border border-neutral-300 rounded px-2 text-sm bg-white"
        >
          <option value="">選択してください</option>
          {CARRIERS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
          追跡番号 (必須)
        </label>
        <input
          type="text"
          name="tracking_number"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          maxLength={60}
          className="w-full h-10 border border-neutral-300 rounded px-2 text-sm bg-white"
        />
        <div className="mt-0.5 text-[10px] text-neutral-500">
          {tracking.length} / 60
        </div>
      </div>
      <label className="flex items-center gap-2 text-[12px] text-neutral-700">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <span>配送業者 / 追跡番号に誤りがないことを確認しました</span>
      </label>
      <SubmitButton disabled={!canSubmit} />
    </form>
  )
}
