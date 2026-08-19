'use client'

import { useState } from 'react'
import ShippingRulesForm, {
  type ShippingRulesInitial,
} from './ShippingRulesForm'
import { pressableClass } from '@/lib/brandAdminUi'

/**
 * 配送・送料設定セクション (Brand Admin ブランド設定)。
 *
 * 閲覧モード ↔ 編集モード のトグルを担う小さな Client wrapper。
 *   - 設定済み (initial.flatRate !== null) は default 閲覧モード
 *   - 未設定は default 編集モード + 「送料を設定してください」プロンプト
 *   - 「送料を変更」で編集モードへ / キャンセルで閲覧モードへ
 *   - 保存 (Server Action) 成功時は redirect で page 再描画 →
 *     state リセットされて閲覧モードへ自動復帰
 */

interface Props {
  initial: ShippingRulesInitial
  action: (formData: FormData) => Promise<void>
  canEdit: boolean
  disabledReason?: string
}

const FMT_YEN = new Intl.NumberFormat('ja-JP')
function yen(n: number): string { return `¥${FMT_YEN.format(n)}` }

type RegionKey =
  | 'rateHokkaido' | 'rateTohoku' | 'rateKanto' | 'rateChubu' | 'rateKinki'
  | 'rateChugoku'  | 'rateShikoku' | 'rateKyushu' | 'rateOkinawa'

const REGION_LABELS: Array<{ key: RegionKey; label: string }> = [
  { key: 'rateHokkaido', label: '北海道' },
  { key: 'rateTohoku',   label: '東北'   },
  { key: 'rateKanto',    label: '関東'   },
  { key: 'rateChubu',    label: '中部'   },
  { key: 'rateKinki',    label: '近畿'   },
  { key: 'rateChugoku',  label: '中国'   },
  { key: 'rateShikoku',  label: '四国'   },
  { key: 'rateKyushu',   label: '九州'   },
  { key: 'rateOkinawa',  label: '沖縄'   },
]

function isCompletelyFree(i: ShippingRulesInitial): boolean {
  return i.flatRate === 0
    && i.freeShippingThreshold === null
    && REGION_LABELS.every(({ key }) => i[key] === null)
}

function ViewCard({
  initial,
  canEdit,
  disabledReason,
  onEdit,
}: {
  initial: ShippingRulesInitial
  canEdit: boolean
  disabledReason?: string
  onEdit: () => void
}) {
  const completelyFree = isCompletelyFree(initial)
  const configuredRegions = REGION_LABELS.filter(({ key }) => initial[key] !== null)
  const hasRegionalOverride = configuredRegions.length > 0

  return (
    <div className="space-y-5">
      {completelyFree ? (
        <div>
          <div className="text-[11px] font-semibold text-neutral-500 tracking-wider">送料</div>
          <div className="mt-1 text-base font-semibold text-emerald-700">全国送料無料</div>
        </div>
      ) : (
        <>
          <div>
            <div className="text-[11px] font-semibold text-neutral-500 tracking-wider">全国一律送料</div>
            <div className="mt-1 text-base font-semibold font-mono">
              {initial.flatRate !== null ? yen(initial.flatRate) : '—'}
            </div>
          </div>

          {hasRegionalOverride && (
            <div>
              <div className="text-[11px] font-semibold text-neutral-500 tracking-wider">地域別送料</div>
              <ul className="mt-1 space-y-0.5 text-sm">
                {configuredRegions.map(({ key, label }) => (
                  <li key={key} className="flex justify-between max-w-[16rem]">
                    <span className="text-neutral-700">{label}</span>
                    <span className="font-semibold font-mono">{yen(initial[key] as number)}</span>
                  </li>
                ))}
                {initial.flatRate !== null && (
                  <li className="flex justify-between max-w-[16rem] pt-1">
                    <span className="text-neutral-500">その他の地域</span>
                    <span className="text-neutral-600 font-mono">
                      全国一律 {yen(initial.flatRate)}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {initial.freeShippingThreshold !== null && (
            <div>
              <div className="text-[11px] font-semibold text-neutral-500 tracking-wider">送料無料条件</div>
              <div className="mt-1 text-sm font-semibold text-emerald-700">
                {yen(initial.freeShippingThreshold)}以上で送料無料
              </div>
            </div>
          )}
        </>
      )}

      <div className="pt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={onEdit}
          disabled={!canEdit}
          className={
            'px-4 py-2 rounded-md text-sm font-semibold border ' +
            (canEdit
              ? 'border-neutral-300 text-neutral-800 hover:bg-neutral-50'
              : 'border-neutral-200 text-neutral-400 cursor-not-allowed') + ' ' +
            pressableClass
          }
        >
          送料を変更
        </button>
        {!canEdit && disabledReason && (
          <span className="text-[11px] text-neutral-500">{disabledReason}</span>
        )}
      </div>
    </div>
  )
}

export default function ShippingRulesSection({
  initial,
  action,
  canEdit,
  disabledReason,
}: Props) {
  // 未設定 (flat_rate なし → active rule 未登録) は default 編集モード
  const isUnset = initial.flatRate === null
  const [editing, setEditing] = useState(isUnset)

  if (editing) {
    return (
      <div className="space-y-3">
        {isUnset && (
          <div className="text-[12px] text-neutral-700 bg-neutral-50 border border-neutral-200 rounded px-3 py-2">
            送料を設定してください。
          </div>
        )}
        <ShippingRulesForm
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
