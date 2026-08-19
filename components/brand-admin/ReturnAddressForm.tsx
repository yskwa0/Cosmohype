'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { pressableClass, Spinner } from '@/lib/brandAdminUi'

export interface ReturnAddressInitial {
  recipientName: string
  postalCode: string
  prefecture: string
  city: string
  addressLine1: string
  addressLine2: string
  phone: string
}

interface Props {
  initial: ReturnAddressInitial
  action: (formData: FormData) => Promise<void>
  disabled?: boolean       // staff 等で編集不可の時は true
  disabledReason?: string  // disabled 理由 (表示用)
  /** 「キャンセル」ボタン表示 (親が閲覧モードへ戻す時に指定) */
  onCancel?: () => void
}

function SaveButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={!enabled || pending}
      className={
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold ' +
        'bg-neutral-900 text-white hover:bg-neutral-800 ' +
        'disabled:bg-neutral-400 disabled:text-neutral-100 disabled:cursor-not-allowed ' +
        pressableClass
      }
    >
      {pending && <Spinner />}
      {pending ? '保存中…' : '保存する'}
    </button>
  )
}

/**
 * 返品先住所編集フォーム (Brand Admin ブランド設定)。
 * server action で shop_brand_update_return_address RPC を呼ぶ。
 * client 側でも必須 + 郵便番号 7 桁 (ハイフン許可) を軽く validate。
 */
export default function ReturnAddressForm({ initial, action, disabled, disabledReason, onCancel }: Props) {
  const [f, setF] = useState<ReturnAddressInitial>(initial)

  const postalStripped = f.postalCode.replace(/[-ー－\s]/g, '')
  const postalValid = /^\d{7}$/.test(postalStripped)
  const requiredFilled =
    f.recipientName.trim().length > 0 &&
    f.postalCode.trim().length > 0 &&
    f.prefecture.trim().length > 0 &&
    f.city.trim().length > 0 &&
    f.addressLine1.trim().length > 0 &&
    f.phone.trim().length > 0
  const canSubmit = !disabled && requiredFilled && postalValid

  return (
    <form action={action} className="space-y-4 max-w-2xl">
      <Row label="宛名" required>
        <input
          type="text"
          name="return_recipient_name"
          value={f.recipientName}
          onChange={(e) => setF({ ...f, recipientName: e.target.value })}
          disabled={disabled}
          maxLength={100}
          className={fieldClass}
          placeholder="例: URBAN NOTE 返品受付窓口"
        />
      </Row>

      <Row label="郵便番号" required>
        <input
          type="text"
          name="return_postal_code"
          value={f.postalCode}
          onChange={(e) => setF({ ...f, postalCode: e.target.value })}
          disabled={disabled}
          inputMode="numeric"
          maxLength={20}
          className={fieldClass + ' font-mono max-w-[240px]'}
          placeholder="例: 150-0002 または 1500002"
        />
        {!postalValid && f.postalCode.length > 0 && (
          <div className="mt-1 text-[11px] text-red-600">
            数字 7 桁 (ハイフン任意) で入力してください。
          </div>
        )}
      </Row>

      <Row label="都道府県" required>
        <input
          type="text"
          name="return_prefecture"
          value={f.prefecture}
          onChange={(e) => setF({ ...f, prefecture: e.target.value })}
          disabled={disabled}
          maxLength={20}
          className={fieldClass + ' max-w-[240px]'}
          placeholder="例: 東京都"
        />
      </Row>

      <Row label="市区町村" required>
        <input
          type="text"
          name="return_city"
          value={f.city}
          onChange={(e) => setF({ ...f, city: e.target.value })}
          disabled={disabled}
          maxLength={60}
          className={fieldClass}
          placeholder="例: 渋谷区渋谷"
        />
      </Row>

      <Row label="番地" required>
        <input
          type="text"
          name="return_address_line1"
          value={f.addressLine1}
          onChange={(e) => setF({ ...f, addressLine1: e.target.value })}
          disabled={disabled}
          maxLength={120}
          className={fieldClass}
          placeholder="例: 1-2-3"
        />
      </Row>

      <Row label="建物名・部屋番号" required={false}>
        <input
          type="text"
          name="return_address_line2"
          value={f.addressLine2}
          onChange={(e) => setF({ ...f, addressLine2: e.target.value })}
          disabled={disabled}
          maxLength={120}
          className={fieldClass}
          placeholder="任意 (例: HYPE ビル 4F)"
        />
      </Row>

      <Row label="電話番号" required>
        <input
          type="tel"
          name="return_phone"
          value={f.phone}
          onChange={(e) => setF({ ...f, phone: e.target.value })}
          disabled={disabled}
          maxLength={30}
          className={fieldClass + ' font-mono max-w-[280px]'}
          placeholder="例: 03-1234-5678"
        />
      </Row>

      <div className="pt-2 flex items-center gap-3">
        <SaveButton enabled={canSubmit} />
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={
              'px-4 py-2 rounded-md text-sm font-semibold border border-neutral-300 text-neutral-700 hover:bg-neutral-50 ' +
              pressableClass
            }
          >
            キャンセル
          </button>
        )}
        {disabled && disabledReason && (
          <span className="text-[11px] text-neutral-500">{disabledReason}</span>
        )}
      </div>
    </form>
  )
}

const fieldClass =
  'w-full h-10 border border-neutral-300 rounded px-3 text-sm bg-white ' +
  'disabled:bg-neutral-100 disabled:text-neutral-500'

function Row({
  label,
  required,
  children,
}: {
  label: string
  required: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
        {label}
        {required ? (
          <span className="ml-1 text-red-600">*</span>
        ) : (
          <span className="ml-1 text-neutral-400 font-normal">(任意)</span>
        )}
      </label>
      {children}
    </div>
  )
}
