'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { pressableClass, Spinner } from '@/lib/brandAdminUi'

/**
 * ブランドの配送・返品ポリシー編集フォーム (Phase B)。
 *
 * server action で shop_brand_update_delivery_return_policy RPC を呼ぶ。
 * client 側の validation は「保存押下時のみエラー表示」ではなく、
 * 「required 満たすまで submit ボタン disable」方式で既存 ReturnAddressForm と揃える。
 *
 * 全項目が任意 (未設定を許容)。 何も入れずに保存すると全 5 列 null にリセットできる。
 * ただし return_accepted = true のときは return_days が 1..365 の整数であることを要求。
 */

export interface DeliveryReturnPolicyInitial {
  /** 1..90 or null */
  dispatchLeadDays: number | null
  /** true = 受付、false = 明示不可、null = 未設定 */
  returnAccepted: boolean | null
  /** 1..365 or null */
  returnDays: number | null
  /** true = 受付、false = 不可、null = 未設定 */
  exchangeAccepted: boolean | null
  /** 1..1000 chars, plain text, or null */
  returnPolicyNote: string | null
  /** Phase 4-A / Migration 167: 購入者都合返品の送料負担者。 'buyer' | 'seller' | null。
   *  不良品 / 誤配送等 販売者責任範囲は本フィールドと無関係 (法令上販売者負担で固定)。 */
  returnShippingCostBearer: 'buyer' | 'seller' | null
}

interface Props {
  initial: DeliveryReturnPolicyInitial
  action: (formData: FormData) => Promise<void>
  disabled?: boolean
  disabledReason?: string
  /** 「キャンセル」ボタン (親が閲覧モードへ戻す) */
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

// tri-state 選択肢: 未設定 / 受付 / 不可
type TriState = 'unset' | 'yes' | 'no'
function toTri(v: boolean | null): TriState {
  if (v === true)  return 'yes'
  if (v === false) return 'no'
  return 'unset'
}
function fromTri(t: TriState): boolean | null {
  if (t === 'yes') return true
  if (t === 'no')  return false
  return null
}

export default function DeliveryReturnPolicyForm({ initial, action, disabled, disabledReason, onCancel }: Props) {
  const [dispatchStr, setDispatchStr] = useState<string>(
    initial.dispatchLeadDays === null ? '' : String(initial.dispatchLeadDays)
  )
  const [returnTri, setReturnTri] = useState<TriState>(toTri(initial.returnAccepted))
  const [returnDaysStr, setReturnDaysStr] = useState<string>(
    initial.returnDays === null ? '' : String(initial.returnDays)
  )
  const [exchangeTri, setExchangeTri] = useState<TriState>(toTri(initial.exchangeAccepted))
  const [note, setNote] = useState<string>(initial.returnPolicyNote ?? '')
  // Phase 4-A: 購入者都合返品の送料負担者 ('' = 未選択、returnTri=yes 時のみ意味を持つ)
  const [bearer, setBearer] = useState<'' | 'buyer' | 'seller'>(initial.returnShippingCostBearer ?? '')

  const dispatchNum = dispatchStr === '' ? null : Number(dispatchStr)
  const returnDaysNum = returnDaysStr === '' ? null : Number(returnDaysStr)

  const dispatchValid = dispatchNum === null
    || (Number.isInteger(dispatchNum) && dispatchNum >= 1 && dispatchNum <= 90)
  const returnDaysValid = returnDaysNum === null
    || (Number.isInteger(returnDaysNum) && returnDaysNum >= 1 && returnDaysNum <= 365)
  // 返品受付 = 受付 なら return_days は必須 (1..365)
  const returnDaysRequiredOK = returnTri !== 'yes' || (returnDaysNum !== null && returnDaysValid)
  // Phase 4-A: 返品受付 = 受付 なら bearer は必須 ('buyer' | 'seller')
  const bearerRequiredOK = returnTri !== 'yes' || bearer === 'buyer' || bearer === 'seller'
  const noteValid = note.length <= 1000

  const canSubmit = !disabled && dispatchValid && returnDaysValid && returnDaysRequiredOK
                 && bearerRequiredOK && noteValid

  return (
    <form action={action} className="space-y-4 max-w-2xl">
      {/* 発送目安 */}
      <Row label="発送目安 (日数)" required={false}>
        <input
          type="number"
          name="dispatch_lead_days"
          value={dispatchStr}
          onChange={(e) => setDispatchStr(e.target.value)}
          disabled={disabled}
          min={1}
          max={90}
          step={1}
          className={fieldClass + ' max-w-[200px]'}
          placeholder="例: 3"
        />
        <div className="mt-1 text-[11px] text-neutral-500">
          注文確定から発送までの目安日数 (1〜90)。 iOS 側で「通常{dispatchStr || 'N'}日以内に発送」と表示。 空欄 = 未設定。
        </div>
        {dispatchStr !== '' && !dispatchValid && (
          <div className="mt-1 text-[11px] text-red-600">発送目安は 1〜90 日の整数で入力してください。</div>
        )}
      </Row>

      {/* 返品受付 */}
      <Row label="返品受付" required={false}>
        <select
          name="return_accepted"
          value={returnTri}
          onChange={(e) => setReturnTri(e.target.value as TriState)}
          disabled={disabled}
          className={fieldClass + ' max-w-[240px]'}
        >
          <option value="unset">未設定 (購入者側で「未設定」表示)</option>
          <option value="yes">受付する</option>
          <option value="no">受付しない</option>
        </select>
      </Row>

      {/* 返品受付期間 (受付するときのみ意味を持つ) */}
      <Row label="返品受付期間 (日数)" required={returnTri === 'yes'}>
        <input
          type="number"
          name="return_days"
          value={returnDaysStr}
          onChange={(e) => setReturnDaysStr(e.target.value)}
          disabled={disabled || returnTri === 'no'}
          min={1}
          max={365}
          step={1}
          className={fieldClass + ' max-w-[200px]'}
          placeholder="例: 7"
        />
        <div className="mt-1 text-[11px] text-neutral-500">
          購入者が商品を受領してから返品を受け付ける日数 (1〜365)。 「受付する」を選んだ場合は必須。
        </div>
        {returnDaysStr !== '' && !returnDaysValid && (
          <div className="mt-1 text-[11px] text-red-600">返品受付期間は 1〜365 日の整数で入力してください。</div>
        )}
        {returnTri === 'yes' && !returnDaysRequiredOK && (
          <div className="mt-1 text-[11px] text-red-600">「受付する」を選択した場合は日数を入力してください。</div>
        )}
      </Row>

      {/* Phase 4-A: 返品送料の負担者 (返品受付する場合のみ意味を持つ) */}
      <Row label="返品送料の負担 (購入者都合返品)" required={returnTri === 'yes'}>
        <select
          name="return_shipping_cost_bearer"
          value={bearer}
          onChange={(e) => setBearer(e.target.value as '' | 'buyer' | 'seller')}
          disabled={disabled || returnTri !== 'yes'}
          className={fieldClass + ' max-w-[300px]'}
        >
          <option value="">未選択</option>
          <option value="buyer">購入者負担</option>
          <option value="seller">販売事業者負担</option>
        </select>
        <div className="mt-1 text-[11px] text-neutral-500">
          サイズ違い・色違い等、購入者都合の返品時の送料負担者を選択します。
          不良品・誤配送・契約違反等、販売者責任範囲の返品送料は法令上販売事業者負担となるため、本項目とは無関係です (別途 SCT 画面に固定表示)。
        </div>
        {returnTri === 'yes' && !bearerRequiredOK && (
          <div className="mt-1 text-[11px] text-red-600">返品受付する場合、送料負担者を選択してください。</div>
        )}
      </Row>

      {/* 交換受付 */}
      <Row label="交換受付" required={false}>
        <select
          name="exchange_accepted"
          value={exchangeTri}
          onChange={(e) => setExchangeTri(e.target.value as TriState)}
          disabled={disabled}
          className={fieldClass + ' max-w-[240px]'}
        >
          <option value="unset">未設定 (購入者側で「未設定」表示)</option>
          <option value="yes">受付する</option>
          <option value="no">受付しない</option>
        </select>
      </Row>

      {/* 返品・交換条件 (補足) */}
      <Row label="返品・交換の補足条件" required={false}>
        <textarea
          name="return_policy_note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={disabled}
          maxLength={1000}
          rows={5}
          className={textareaClass}
          placeholder="例: 未使用・タグ付き商品のみ返品可能です。"
        />
        <div className="mt-0.5 text-[10px] text-neutral-500 text-right">
          {note.length} / 1000
        </div>
      </Row>

      {/* Hidden fields for TriState-to-server encoding.
          server action は 'unset'/'yes'/'no' 文字列を受けて null/true/false に変換する。 */}

      <div className="flex items-center gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={
              'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold ' +
              'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50 ' +
              pressableClass
            }
          >
            キャンセル
          </button>
        )}
        <SaveButton enabled={canSubmit} />
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

const textareaClass =
  'w-full min-h-[120px] border border-neutral-300 rounded px-3 py-2 text-sm bg-white leading-relaxed resize-y ' +
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
