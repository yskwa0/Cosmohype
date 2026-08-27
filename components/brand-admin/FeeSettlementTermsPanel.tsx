// =============================================================================
// components/brand-admin/FeeSettlementTermsPanel.tsx  (Phase 4-C.7 / Migration 175)
//
// Brand Admin settings ページ内の Fee Settlement Terms (料金・精算条件書) パネル。
// Merchant Agreement は layout 常駐 banner + modal だが、Fee Terms は settings 内の
// 独立 section として表示する (「Settings または最も自然な場所」の直訳)。
//
// 【★ Phase 4-C.7 最終方針: DB registry が唯一の SoT】
//   TypeScript 側 (lib/feeSettlementTerms/) は candidate 文書。
//   DB registry (shop_fee_settlement_terms_versions.is_current=true) が
//   Production で正式に有効な Fee Terms の SoT。 両者が一致しない限り、
//   TS 本文を「現在の Fee Terms」として Brand に提示しない。
//
// 【5 state 分岐】
//   ・deployment_mismatch:
//     DB registry.is_current 行が存在しない (Phase 4-C.7 初期状態) or
//     registry と TS candidate が不一致 (deployment 順序の不整合)。
//     → 「運営が利用条件を更新中です」だけ表示。
//     → 本文の accordion / fee summary / Accept CTA / needs_acceptance /
//       accepted 表示は一切禁止 (TS 本文を正式 current として誤認させない)。
//   ・not_provisioned: registry と TS 一致、brand 向け fee_term row 未提示
//     → 「運営から本ブランド向けの条件書はまだ提示されていません」表示。
//   ・stale_hash: registry と TS 一致、brand row 存在するが row の hash が不一致
//     → 「運営が新版を用意中」表示 (accept 不可、CTA 非表示)。
//   ・needs_acceptance: 3 source 一致、accepted_at=NULL
//     → owner: 本文全文表示 + checkbox + 「同意する」CTA。
//     → non-owner: 本文全文表示 + owner に依頼する文言 (accept 不可)。
//   ・accepted: 3 source 一致、accepted_at 設定済 → gate 開放条件を満たす
//     → 受諾日時 / 受諾 owner 8 桁 / 本文は accordion (collapsed) で表示。
//
// 「新規商品公開など既存注文対応を妨げるものではない」旨は本文の第 9 条 (同意方式) に
// 記載されており、Panel でも同趣旨の注記を各 state 内で追加。
// =============================================================================

'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import type { FeeTermsDocument } from '@/lib/feeSettlementTerms/content'
import type { FeeSettlementTermsStatus } from '@/lib/brandAdmin'
import FeeSettlementTermsBody from '@/components/legal/FeeSettlementTermsBody'
import { pressableClass, Spinner } from '@/lib/brandAdminUi'

type BrandRole = 'owner' | 'admin' | 'staff' | null

interface Props {
  status:       FeeSettlementTermsStatus
  role:         BrandRole
  brandName:    string
  doc:          FeeTermsDocument
  acceptAction: (formData: FormData) => Promise<void>
}

function AcceptButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={!enabled || pending}
      className={
        'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold ' +
        'bg-neutral-900 text-white hover:bg-neutral-800 ' +
        'disabled:bg-neutral-400 disabled:text-neutral-100 disabled:cursor-not-allowed ' +
        pressableClass
      }
    >
      {pending && <Spinner />}
      {pending ? '同意処理中…' : '同意する'}
    </button>
  )
}

/** "v1" → "第1版" のように表示する。 未知形式は文字列そのまま返却。 */
function versionLabel(v: string): string {
  const m = v.match(/^v(\d+)$/i)
  return m ? `第${m[1]}版` : v
}

function StateBadge({ state }: { state: FeeSettlementTermsStatus['state'] }) {
  const map: Record<FeeSettlementTermsStatus['state'], { label: string; classes: string }> = {
    deployment_mismatch: { label: '利用条件更新中',       classes: 'bg-neutral-100 text-neutral-700 border-neutral-300' },
    not_provisioned:     { label: '運営からの提示待ち',   classes: 'bg-neutral-100 text-neutral-700 border-neutral-300' },
    stale_hash:          { label: '新しい内容を準備中',   classes: 'bg-amber-50 text-amber-800 border-amber-200' },
    needs_acceptance:    { label: '同意が必要',           classes: 'bg-orange-50 text-orange-800 border-orange-200' },
    accepted:            { label: '同意済',               classes: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  }
  const { label, classes } = map[state]
  return (
    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${classes}`}>
      {label}
    </span>
  )
}

function FeeTermsSummary({ status }: { status: FeeSettlementTermsStatus }) {
  return (
    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
      <div>
        <dt className="text-[10px] uppercase tracking-wider text-neutral-500">プラットフォーム手数料</dt>
        <dd className="text-neutral-900">
          {(status.currentRateBps / 100).toFixed(0)}%
        </dd>
      </div>
      <div>
        <dt className="text-[10px] uppercase tracking-wider text-neutral-500">手数料の対象</dt>
        <dd className="text-neutral-900">商品小計のみ</dd>
      </div>
      <div>
        <dt className="text-[10px] uppercase tracking-wider text-neutral-500">送料</dt>
        <dd className="text-neutral-900">手数料の対象外</dd>
      </div>
      <div>
        <dt className="text-[10px] uppercase tracking-wider text-neutral-500">決済手数料</dt>
        <dd className="text-neutral-900">Cosmohypeが負担</dd>
      </div>
      <div className="md:col-span-2">
        <dt className="text-[10px] uppercase tracking-wider text-neutral-500">ブランドへのお支払い額</dt>
        <dd className="text-neutral-900">
          商品小計 ＋ 送料 − 割引 − プラットフォーム手数料
        </dd>
      </div>
      <div className="md:col-span-2">
        <dt className="text-[10px] uppercase tracking-wider text-neutral-500">注文の全額返金があったとき</dt>
        <dd className="text-neutral-900">
          すでにブランドへ送金済みの場合は、送金額を全額返金処理します。 プラットフォーム手数料相当額は Cosmohype が負担し、ブランドから追加で回収しません。
        </dd>
      </div>
    </dl>
  )
}

export default function FeeSettlementTermsPanel({
  status,
  role,
  brandName,
  doc,
  acceptAction,
}: Props) {
  const [expandedBody, setExpandedBody] = useState<boolean>(
    status.state === 'needs_acceptance',
  )
  const [checked, setChecked] = useState(false)

  const isOwner = role === 'owner'

  // ★ Phase 4-C.7: deployment_mismatch は TS 本文を「現在」として提示しない。
  //   header に版数を出さず、summary / accordion / accept CTA すべて非表示。
  //   registry と TS が一致するまでは Brand には「利用条件更新中」だけ見せる。
  if (status.state === 'deployment_mismatch') {
    return (
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold tracking-widest text-neutral-500">
              料金・精算条件書
            </div>
            <h2 className="mt-1 text-base font-semibold text-neutral-900">
              料金・精算条件書
            </h2>
          </div>
          <StateBadge state={status.state} />
        </div>
        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3 text-[12px] text-neutral-700 leading-relaxed">
          運営が正式な料金・精算条件書を準備中です。
          本ブランドで正式な条件書が確定するまで、Stripe Connect による自動精算は開始されません。
          既存注文の発送・返金・返品・トラブル対応その他の履行対応は本状態に影響されず、引き続きご利用いただけます。
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold tracking-widest text-neutral-500">
            FEE SETTLEMENT TERMS
          </div>
          <h2 className="mt-1 text-base font-semibold text-neutral-900">
            料金・精算条件書 {versionLabel(status.currentVersion)}
          </h2>
        </div>
        <StateBadge state={status.state} />
      </div>

      <FeeTermsSummary status={status} />

      {status.state === 'accepted' && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900">
          対象ブランド「{brandName}」のブランドオーナーが、本条件書 {versionLabel(status.termVersion ?? '')} に{' '}
          {status.acceptedAt ? new Date(status.acceptedAt).toLocaleString('ja-JP') : '不明'} に同意済みです。
        </div>
      )}

      {status.state === 'not_provisioned' && (
        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] text-neutral-700">
          現在、運営から本ブランド向けの正式な料金・精算条件書はまだ提示されていません。
          Stripe Connectを利用した自動精算を有効化するためには、運営が本ブランド向けに提示した条件書にブランドオーナーが同意する必要があります。
          提示され次第、この画面から同意ボタンが表示されます。
          既存注文の発送・返金・返品・トラブル対応その他の履行対応は、本条件書が未提示でも継続して利用できます。
        </div>
      )}

      {status.state === 'stale_hash' && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          運営が本条件書の新しい内容を準備中です。 現在ブランドに提示されている条件書と最新の内容が一致していません。
          運営が新しい内容の準備を完了するまで、Stripe Connectを利用した自動精算は開始されません。
          既存注文の履行対応は本状態に影響を受けません。
        </div>
      )}

      {status.state === 'needs_acceptance' && (
        <div className={`rounded-md border px-3 py-2 text-[11px] ${
          isOwner
            ? 'border-orange-200 bg-orange-50 text-orange-900'
            : 'border-neutral-200 bg-neutral-50 text-neutral-700'
        }`}>
          {isOwner ? (
            <>
              対象ブランド「{brandName}」のブランドオーナーとして、本料金・精算条件書 {versionLabel(status.currentVersion)} への同意がまだ記録されていません。
              以下の全文を確認のうえ、チェックボックスに印を付けて「同意する」を押してください。
              既存注文の発送・返金・返品・トラブル対応は、この条件書への未同意によって影響を受けません。
            </>
          ) : (
            <>
              対象ブランド「{brandName}」では、ブランドオーナーによる本料金・精算条件書 {versionLabel(status.currentVersion)} への同意がまだ記録されていません。
              ブランドオーナーが管理画面から同意するまで、Stripe Connectを利用した自動精算は開始されません。
              管理者・スタッフの権限では同意操作は行えません。
            </>
          )}
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => setExpandedBody((v) => !v)}
          className={
            'text-[11px] font-semibold text-neutral-700 underline underline-offset-2 hover:text-neutral-900 ' +
            pressableClass
          }
        >
          {expandedBody ? '本文を閉じる' : '本文全文を表示'}
        </button>

        {expandedBody && (
          <div className="mt-3 rounded-md border border-neutral-200 bg-white px-4 py-4 max-h-[420px] overflow-y-auto">
            <FeeSettlementTermsBody doc={doc} />
          </div>
        )}
      </div>

      {status.state === 'needs_acceptance' && isOwner && status.termId && (
        <form action={acceptAction} className="border-t border-neutral-200 pt-4">
          <input type="hidden" name="term_id" value={status.termId} />
          <label className="flex items-start gap-2 text-[12px] text-neutral-800 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              上記「料金・精算条件書 {versionLabel(status.currentVersion)}」の全文を確認し、内容に同意します。
              対象ブランド「{brandName}」を代表するブランドオーナーとして、この同意を電子的に記録することに合意します。
            </span>
          </label>
          <div className="mt-3">
            <AcceptButton enabled={checked} />
          </div>
        </form>
      )}
    </section>
  )
}
