// =============================================================================
// components/brand-admin/StripeConnectSection.tsx  (Phase 4-C.3)
//
// Brand Admin Settings の「Stripe Connect (販売代金の受取設定)」セクション。
//
// 【表示ルール】
//   ・owner:    state に応じて「接続する / 登録を続ける / 追加情報が必要 / 情報を更新」等
//               の操作ボタンを表示。
//   ・admin:    状態は閲覧可能、操作ボタン (接続開始 / 再オンボーディング) は非表示。
//               sync (状態更新) のみ実行可能。
//   ・staff:    同上 (admin と同じ、書込操作なし)。
//
//   Stripe 内部用語 (capability / requirements 等) はユーザーへは露出させず、
//   「接続済み」「登録中」「追加情報が必要」「利用停止中」のブランド向け日本語で表示。
//
// 【本 Phase の重要制約】
//   Connect active になっても、まだ本番 settlement mode 切替は行わない。
//   UI では「接続済み」まで進んで良いが、決済 flow は platform_manual を維持する旨を
//   明示する (料金・精算条件 / Merchant Agreement v1 正式版 / rollout flag 未確定)。
// =============================================================================

'use client'

import { useFormStatus } from 'react-dom'
import { pressableClass, Spinner } from '@/lib/brandAdminUi'

type ConnectState = 'none' | 'pending' | 'active' | 'restricted' | 'disabled'

export interface StripeConnectStatus {
  state: ConnectState
  accountId: string | null
  livemode: boolean | null
  onboardedAt: string | null
  lastSyncedAt: string | null
}

interface Props {
  status: StripeConnectStatus
  role: 'owner' | 'admin' | 'staff'
  onboardingAction: (formData: FormData) => Promise<void>
  syncAction:       (formData: FormData) => Promise<void>
}

function stateLabel(state: ConnectState): { title: string; tone: 'neutral' | 'info' | 'ok' | 'warn' | 'error' } {
  switch (state) {
    case 'none':       return { title: '未設定',                   tone: 'neutral' }
    case 'pending':    return { title: '確認中',                   tone: 'info'    }
    case 'active':     return { title: '設定完了',                 tone: 'ok'      }
    case 'restricted': return { title: '追加情報が必要です',       tone: 'warn'    }
    case 'disabled':   return { title: '現在ご利用いただけません', tone: 'error'   }
  }
}

function toneClass(tone: 'neutral' | 'info' | 'ok' | 'warn' | 'error'): string {
  switch (tone) {
    case 'neutral': return 'text-neutral-700 bg-neutral-50 border-neutral-200'
    case 'info':    return 'text-blue-800 bg-blue-50 border-blue-200'
    case 'ok':      return 'text-emerald-800 bg-emerald-50 border-emerald-200'
    case 'warn':    return 'text-orange-800 bg-orange-50 border-orange-200'
    case 'error':   return 'text-red-800 bg-red-50 border-red-200'
  }
}

function PrimaryButton({ label, enabled }: { label: string; enabled: boolean }) {
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
      {pending ? '処理中…' : label}
    </button>
  )
}

function SecondaryButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold ' +
        'bg-white text-neutral-800 border border-neutral-300 hover:bg-neutral-50 ' +
        'disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed ' +
        pressableClass
      }
    >
      {pending && <Spinner />}
      {pending ? '更新中…' : label}
    </button>
  )
}

export default function StripeConnectSection({ status, role, onboardingAction, syncAction }: Props) {
  const label = stateLabel(status.state)
  const isOwner = role === 'owner'
  const ownerActionLabel = (() => {
    switch (status.state) {
      case 'none':       return '売上の受け取り設定を始める'
      case 'pending':    return '登録の続きを入力する'
      case 'active':     return null                        // 設定完了時は更新ボタンのみ
      case 'restricted': return '追加情報を入力する'
      case 'disabled':   return null                        // 利用不可時は開始操作を出さない
    }
  })()

  return (
    <div className="space-y-4">
      <div className={`rounded-md border px-3 py-2 text-[12px] ${toneClass(label.tone)}`}>
        <div className="font-semibold">状態: {label.title}</div>
        {status.state === 'none' && (
          <div className="mt-1 leading-relaxed">
            商品が売れたときの売上金を受け取るために、振込先口座と本人確認情報を登録してください。
          </div>
        )}
        {status.state === 'pending' && (
          <div className="mt-1 leading-relaxed">
            登録内容を確認しています。 確認が完了するまでしばらくお待ちください。
            追加の入力が必要な場合は、下のボタンから続きを入力できます。
          </div>
        )}
        {status.state === 'active' && (
          <div className="mt-1 leading-relaxed">
            売上の受け取りに必要な設定は完了しています。
            受け取り方法の切り替え時期は、Cosmohype からご案内します。
            それまでは現在の受け取り方法が継続します。
          </div>
        )}
        {status.state === 'restricted' && (
          <div className="mt-1 leading-relaxed">
            設定を完了するために追加の情報が必要です。
            「追加情報を入力する」から続きを入力してください。
            このまま完了しないと、売上金の受け取りが制限される場合があります。
          </div>
        )}
        {status.state === 'disabled' && (
          <div className="mt-1 leading-relaxed">
            現在この受け取り設定はご利用いただけません。
            詳細は Cosmohype 運営までお問い合わせください。
          </div>
        )}
      </div>

      <dl className="text-[11px] text-neutral-600 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
        <div><dt className="inline font-semibold">設定完了日時:</dt> <dd className="inline">{status.onboardedAt ?? '(未完了)'}</dd></div>
        <div><dt className="inline font-semibold">最終更新日時:</dt> <dd className="inline">{status.lastSyncedAt ?? '(未更新)'}</dd></div>
      </dl>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {isOwner && ownerActionLabel && (
          <form action={onboardingAction}>
            <PrimaryButton label={ownerActionLabel} enabled={true} />
          </form>
        )}
        <form action={syncAction}>
          <SecondaryButton label="設定状況を更新する" />
        </form>
        {!isOwner && (
          <div className="text-[11px] text-neutral-500">
            受け取り設定の開始・再入力はブランドオーナーのみ行えます。 管理者・スタッフは状態の確認と更新のみ行えます。
          </div>
        )}
      </div>

      <div className="pt-1 text-[10px] text-neutral-400 leading-relaxed">
        決済・本人確認には Stripe のシステムを利用しています。
      </div>
    </div>
  )
}
