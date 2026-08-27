// =============================================================================
// components/brand-admin/MerchantAgreementModal.tsx  (Phase 4-B / Migration 168)
//
// Brand Admin レイアウトに常駐する Merchant Agreement 未同意通知 + 同意 UI。
//
// 【Phase 4-B 方針】既存購入者対応 (発送 / 返品 / トラブル / 返金) を絶対に妨げないため、
//   owner が current version に未同意でも Brand Admin の全機能は利用可能にする。
//   ・owner:      banner + 「ブランド出店規約を確認して同意」CTA。 CTA から
//                 dismiss 可能な modal を開く (checkbox + 「同意する」ボタン)。
//   ・admin/staff: banner のみ (CTA なし、owner に同意を促す文言)。
//   ・publish gate 側で新規商品公開だけがブロックされる (既存注文には無影響)。
// =============================================================================

'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import type { AgreementDocument } from '@/lib/merchantAgreement/content'
import MerchantAgreementBody from '@/components/legal/MerchantAgreementBody'
import { pressableClass, Spinner } from '@/lib/brandAdminUi'

type UiMode = 'owner' | 'non-owner'

interface Props {
  mode: UiMode
  doc: AgreementDocument
  version: string
  brandName: string
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

export default function MerchantAgreementModal({
  mode,
  doc,
  version,
  brandName,
  acceptAction,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [checked, setChecked] = useState(false)

  return (
    <>
      <div className="rounded-md border border-orange-300 bg-orange-50 text-orange-900 px-4 py-3 mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold">
              ブランド出店規約 (版 {version}) への同意が未記録です
            </div>
            <div className="mt-1 text-[11px] leading-relaxed">
              {mode === 'owner' ? (
                <>
                  ブランド {brandName} の owner として、現行のブランド出店規約への同意がまだ記録されていません。
                  新規商品の公開など「新規販売開始」操作は同意が完了するまでブロックされます。
                  既存の販売中商品や既存注文の発送・返品・トラブル対応・返金は引き続き利用いただけます。
                </>
              ) : (
                <>
                  このブランド ({brandName}) では、owner による現行のブランド出店規約への同意がまだ記録されていません。
                  owner が Brand Admin にログインして同意するまで、新規商品の公開など「新規販売開始」操作は制限されます。
                  既存の販売中商品や既存注文の発送・返品・トラブル対応・返金はブロックされません。
                  admin / staff の権限で同意を行うことはできません。
                </>
              )}
            </div>
          </div>
          {mode === 'owner' && (
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className={
                  'inline-flex items-center justify-center px-3 py-1.5 rounded-md text-[11px] font-semibold ' +
                  'bg-neutral-900 text-white hover:bg-neutral-800 ' +
                  pressableClass
                }
              >
                ブランド出店規約を確認して同意
              </button>
            </div>
          )}
        </div>
      </div>

      {mode === 'owner' && modalOpen && (
        <div className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center bg-black/60 backdrop-blur-[2px]">
          <div className="w-full md:max-w-3xl md:my-8 md:rounded-lg bg-white shadow-xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200 flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] tracking-widest text-neutral-500">HYPE / MERCHANT AGREEMENT</div>
                <div className="mt-1 text-sm font-semibold text-neutral-900">
                  ブランド出店規約 (版 {version}) への同意
                </div>
                <div className="mt-1 text-[11px] text-neutral-600">
                  ブランド {brandName} の owner として、以下の規約全文を確認し、同意する場合はチェックのうえ「同意する」を押してください。 閉じても既存注文対応など他の機能はご利用いただけます。
                </div>
              </div>
              <button
                type="button"
                aria-label="閉じる"
                onClick={() => setModalOpen(false)}
                className={
                  'shrink-0 text-neutral-500 hover:text-neutral-900 border border-neutral-300 rounded px-2 py-1 text-[11px] ' +
                  pressableClass
                }
              >
                閉じる
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6">
              <MerchantAgreementBody doc={doc} />
            </div>

            <form action={acceptAction} className="px-5 py-4 border-t border-neutral-200 bg-neutral-50">
              <label className="flex items-start gap-2 text-[12px] text-neutral-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  上記「ブランド出店規約 (版 {version})」の全文を確認し、内容に同意します。
                  ブランド {brandName} を代表する owner として、この同意を電子的に記録することに合意します。
                </span>
              </label>
              <div className="mt-3 flex items-center gap-3">
                <AcceptButton enabled={checked} />
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className={
                    'inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold ' +
                    'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50 ' +
                    pressableClass
                  }
                >
                  あとで
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
