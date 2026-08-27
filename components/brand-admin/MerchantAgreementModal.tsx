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

/** "v1" → "第1版" のように表示する。 */
function versionLabel(v: string): string {
  const m = v.match(/^v(\d+)$/i)
  return m ? `第${m[1]}版` : v
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
              ブランド出店規約 {versionLabel(version)}への同意が記録されていません
            </div>
            <div className="mt-1 text-[11px] leading-relaxed">
              {mode === 'owner' ? (
                <>
                  対象ブランド「{brandName}」のブランドオーナーとして、現行のブランド出店規約への同意がまだ記録されていません。
                  新規商品の公開など「新しく販売を開始する」操作は、同意が完了するまで行えません。
                  既に販売中の商品や、既存の注文に対する発送・返品・トラブル対応・返金は引き続きご利用いただけます。
                </>
              ) : (
                <>
                  対象ブランド「{brandName}」では、ブランドオーナーによる現行のブランド出店規約への同意がまだ記録されていません。
                  ブランドオーナーが管理画面にログインして同意するまで、新規商品の公開など「新しく販売を開始する」操作は制限されます。
                  既に販売中の商品や、既存の注文に対する発送・返品・トラブル対応・返金は制限されません。
                  管理者・スタッフの権限では同意操作を行うことはできません。
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
                ブランド出店規約を確認して同意する
              </button>
            </div>
          )}
        </div>
      </div>

      {mode === 'owner' && modalOpen && (
        // Overlay: viewport 全体 fixed、自身の overflow は hidden で外にはみ出さない
        <div className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center bg-black/60 backdrop-blur-[2px] overflow-hidden">
          {/*
            Modal container:
            ・mobile (items-stretch): overlay 高さいっぱいまで stretch (100dvh)
            ・desktop (items-center + md:my-8): my-8 分の余白を残した max-height (calc)
            ・flex flex-col + min-h-0 で内部 flex child の scroll 境界を確定
            ・overflow-hidden で自身は overflow を絶対に許さない = child だけ scroll
          */}
          <div className="w-full md:max-w-3xl md:my-8 md:rounded-lg bg-white shadow-xl flex flex-col min-h-0 max-h-[100dvh] md:max-h-[calc(100dvh-4rem)] overflow-hidden">
            {/* Header: 固定高さ、shrink 禁止 */}
            <div className="shrink-0 px-5 py-4 border-b border-neutral-200 flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] tracking-widest text-neutral-500">HYPE ブランド出店規約</div>
                <div className="mt-1 text-sm font-semibold text-neutral-900">
                  ブランド出店規約 {versionLabel(version)}への同意
                </div>
                <div className="mt-1 text-[11px] text-neutral-600">
                  対象ブランド「{brandName}」のブランドオーナーとして、以下の規約全文を確認し、同意する場合はチェックのうえ「同意する」を押してください。 閉じても、既存注文への対応など他の機能は引き続きご利用いただけます。
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

            {/*
              Body scroll area:
              ・flex-1 で残り高さを占有 + min-h-0 で flex child の default (min-content) を無効化
                = これがないと desktop で content 高が勝って scroll しない
              ・overflow-y-auto で本文だけ縦 scroll
              ・overscroll-contain で背景に scroll chain しない
              ・-webkit-overflow-scrolling:touch (Safari nested overflow 対策)
            */}
            <div
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-6"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <MerchantAgreementBody doc={doc} />
            </div>

            {/* Footer form: shrink 禁止で checkbox + CTA を常に画面下部に確保 */}
            <form action={acceptAction} className="shrink-0 px-5 py-4 border-t border-neutral-200 bg-neutral-50">
              <label className="flex items-start gap-2 text-[12px] text-neutral-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  上記「ブランド出店規約 {versionLabel(version)}」の全文を確認し、内容に同意します。
                  対象ブランド「{brandName}」を代表するブランドオーナーとして、この同意を電子的に記録することに合意します。
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
