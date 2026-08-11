'use client'

import { useState } from 'react'
import ReturnAddressForm, {
  type ReturnAddressInitial,
} from './ReturnAddressForm'

/**
 * 返送先住所セクション (Brand Admin ブランド設定)。
 *
 * 閲覧モード ↔ 編集モード のトグルを担う小さな Client wrapper。
 *   - 設定済み (最低限 postalCode + prefecture + city + line1 + recipientName + phone) は default 閲覧モード
 *   - 未設定は default 編集モード + 「返送先住所を設定してください」プロンプト
 *   - 「返送先住所を変更」で編集モードへ / キャンセルで閲覧モードへ
 *   - 保存 (Server Action) 成功時は redirect で page 再描画 →
 *     state リセットされて閲覧モードへ自動復帰
 */

interface Props {
  initial: ReturnAddressInitial
  action: (formData: FormData) => Promise<void>
  canEdit: boolean
  disabledReason?: string
}

function hasReturnAddressConfigured(i: ReturnAddressInitial): boolean {
  return (
    i.recipientName.trim().length > 0 &&
    i.postalCode.trim().length > 0 &&
    i.prefecture.trim().length > 0 &&
    i.city.trim().length > 0 &&
    i.addressLine1.trim().length > 0 &&
    i.phone.trim().length > 0
  )
}

function formatPostal(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '')
  if (digits.length === 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return raw
}

function ViewCard({
  initial,
  canEdit,
  disabledReason,
  onEdit,
}: {
  initial: ReturnAddressInitial
  canEdit: boolean
  disabledReason?: string
  onEdit: () => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <div className="text-[11px] font-semibold text-neutral-500 tracking-wider">住所</div>
        <div className="mt-1 text-sm text-neutral-800 leading-relaxed">
          <div className="font-mono">〒{formatPostal(initial.postalCode)}</div>
          <div>{initial.prefecture}{initial.city}{initial.addressLine1}</div>
          {initial.addressLine2.trim().length > 0 && (
            <div>{initial.addressLine2}</div>
          )}
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-neutral-500 tracking-wider">宛名</div>
        <div className="mt-1 text-sm text-neutral-800">{initial.recipientName}</div>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-neutral-500 tracking-wider">電話番号</div>
        <div className="mt-1 text-sm text-neutral-800 font-mono">{initial.phone}</div>
      </div>

      <div className="pt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={onEdit}
          disabled={!canEdit}
          className={
            'px-4 py-2 rounded-md text-sm font-semibold border ' +
            (canEdit
              ? 'border-neutral-300 text-neutral-800 hover:bg-neutral-50'
              : 'border-neutral-200 text-neutral-400 cursor-not-allowed')
          }
        >
          返送先住所を変更
        </button>
        {!canEdit && disabledReason && (
          <span className="text-[11px] text-neutral-500">{disabledReason}</span>
        )}
      </div>
    </div>
  )
}

export default function ReturnAddressSection({
  initial,
  action,
  canEdit,
  disabledReason,
}: Props) {
  const isConfigured = hasReturnAddressConfigured(initial)
  const [editing, setEditing] = useState(!isConfigured)

  if (editing) {
    return (
      <div className="space-y-3">
        {!isConfigured && (
          <div className="text-[12px] text-neutral-700 bg-neutral-50 border border-neutral-200 rounded px-3 py-2">
            返送先住所を設定してください。
          </div>
        )}
        <ReturnAddressForm
          initial={initial}
          action={action}
          disabled={!canEdit}
          disabledReason={disabledReason}
          onCancel={isConfigured ? () => setEditing(false) : undefined}
        />
      </div>
    )
  }

  return (
    <ViewCard
      initial={initial}
      canEdit={canEdit}
      disabledReason={disabledReason}
      onEdit={() => setEditing(true)}
    />
  )
}
