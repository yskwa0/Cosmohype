'use client'

import { useState } from 'react'
import DeliveryReturnPolicyForm, {
  type DeliveryReturnPolicyInitial,
} from './DeliveryReturnPolicyForm'
import { pressableClass } from '@/lib/brandAdminUi'

/**
 * ブランドの配送・返品ポリシー セクション (Phase B)。
 *
 * 閲覧 / 編集モードのトグルを担う小さな Client wrapper。
 *   - 何も設定していない (全 5 列 null) → default 編集モード + 「設定してください」プロンプト
 *   - 何か 1 つでも設定済み → default 閲覧モード + 「変更する」ボタン
 *   - キャンセルで閲覧モードへ / 保存成功時は Server Action redirect で page 再描画 → state リセット
 */

interface Props {
  initial: DeliveryReturnPolicyInitial
  action: (formData: FormData) => Promise<void>
  canEdit: boolean
  disabledReason?: string
}

function isAnythingConfigured(i: DeliveryReturnPolicyInitial): boolean {
  return i.dispatchLeadDays !== null
    || i.returnAccepted     !== null
    || i.returnDays         !== null
    || i.exchangeAccepted   !== null
    || (i.returnPolicyNote !== null && i.returnPolicyNote.trim().length > 0)
}

function ViewCard({
  initial,
  canEdit,
  disabledReason,
  onEdit,
}: {
  initial: DeliveryReturnPolicyInitial
  canEdit: boolean
  disabledReason?: string
  onEdit: () => void
}) {
  const dispatchLabel: string = initial.dispatchLeadDays !== null
    ? `通常 ${initial.dispatchLeadDays} 日以内に発送`
    : '未設定'
  const returnLabel: string = (() => {
    if (initial.returnAccepted === true) {
      if (initial.returnDays !== null) return `受付する (商品到着から ${initial.returnDays} 日以内)`
      return '受付する (期間未設定)'
    }
    if (initial.returnAccepted === false) return '受付しない'
    return '未設定'
  })()
  const exchangeLabel: string =
    initial.exchangeAccepted === true  ? '受付する' :
    initial.exchangeAccepted === false ? '受付しない' :
    '未設定'

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[11px] font-semibold text-neutral-500 tracking-wider">発送目安</div>
        <div className="mt-1 text-sm text-neutral-800">{dispatchLabel}</div>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-neutral-500 tracking-wider">返品</div>
        <div className="mt-1 text-sm text-neutral-800">{returnLabel}</div>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-neutral-500 tracking-wider">交換</div>
        <div className="mt-1 text-sm text-neutral-800">{exchangeLabel}</div>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-neutral-500 tracking-wider">補足条件</div>
        <div className="mt-1 text-sm text-neutral-800 whitespace-pre-wrap break-words">
          {initial.returnPolicyNote && initial.returnPolicyNote.length > 0
            ? initial.returnPolicyNote
            : <span className="text-neutral-400">未設定</span>}
        </div>
      </div>

      <div className="pt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={onEdit}
          disabled={!canEdit}
          className={
            'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold ' +
            'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50 ' +
            'disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed ' +
            pressableClass
          }
        >
          変更する
        </button>
        {!canEdit && disabledReason && (
          <span className="text-[11px] text-neutral-500">{disabledReason}</span>
        )}
      </div>
    </div>
  )
}

export default function DeliveryReturnPolicySection({
  initial,
  action,
  canEdit,
  disabledReason,
}: Props) {
  const isUnset = !isAnythingConfigured(initial)
  const [editing, setEditing] = useState(isUnset)

  if (editing) {
    return (
      <div className="space-y-3">
        {isUnset && (
          <div className="text-[12px] text-neutral-700 bg-neutral-50 border border-neutral-200 rounded px-3 py-2">
            配送・返品ポリシーを設定してください。 未設定のままだと購入者側で「未設定」と表示されます。
          </div>
        )}
        <DeliveryReturnPolicyForm
          initial={initial}
          action={action}
          disabled={!canEdit}
          disabledReason={disabledReason}
          onCancel={isUnset ? undefined : () => setEditing(false)}
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
