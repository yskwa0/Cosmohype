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
    case 'none':       return { title: '未接続',         tone: 'neutral' }
    case 'pending':    return { title: '登録中',         tone: 'info'    }
    case 'active':     return { title: '接続済み',       tone: 'ok'      }
    case 'restricted': return { title: '追加情報が必要', tone: 'warn'    }
    case 'disabled':   return { title: '利用停止中',     tone: 'error'   }
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
      {pending ? '同期中…' : label}
    </button>
  )
}

export default function StripeConnectSection({ status, role, onboardingAction, syncAction }: Props) {
  const label = stateLabel(status.state)
  const isOwner = role === 'owner'
  const ownerActionLabel = (() => {
    switch (status.state) {
      case 'none':       return 'Stripe Connect に接続する'
      case 'pending':    return '登録を続ける'
      case 'active':     return null                        // 接続済み時は sync ボタンのみ
      case 'restricted': return '追加情報を入力する'
      case 'disabled':   return null                        // 停止時は接続操作を出さない
    }
  })()

  return (
    <div className="space-y-4">
      <div className={`rounded-md border px-3 py-2 text-[12px] ${toneClass(label.tone)}`}>
        <div className="font-semibold">状態: {label.title}</div>
        {status.state === 'none' && (
          <div className="mt-1 leading-relaxed">
            販売代金を受け取るには、Stripe Connect にブランドを接続する必要があります。
            接続時に事業者情報 (法人 / 個人)、代表者、住所、銀行口座等の確認情報を Stripe が収集します (Stripe が運営する登録画面に移動します)。
          </div>
        )}
        {status.state === 'pending' && (
          <div className="mt-1 leading-relaxed">
            Stripe 側での登録手続きが完了していません。 登録画面に戻って必要な情報を入力してください。
          </div>
        )}
        {status.state === 'active' && (
          <div className="mt-1 leading-relaxed">
            Stripe Connect への接続が完了しています。 販売代金の受取準備は整っています。
            なお、実際の販売代金の Stripe Connect 経由での送金開始は、料金・精算条件の正式提示 と Cosmohype 全体の切替 タイミング以降となります (現時点では従来の一括受領方式が継続します)。
          </div>
        )}
        {status.state === 'restricted' && (
          <div className="mt-1 leading-relaxed">
            Stripe から追加情報の提供を求められています。 このまま放置すると販売代金の受取が制限される場合があります。 登録画面に戻り、指示に従って情報を入力してください。
          </div>
        )}
        {status.state === 'disabled' && (
          <div className="mt-1 leading-relaxed">
            Stripe 側の判断により本接続は現在利用停止中です。 詳細は Stripe から通知されたメール、または Cosmohype 運営までお問い合わせください。
          </div>
        )}
      </div>

      <dl className="text-[11px] text-neutral-600 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
        <div><dt className="inline font-semibold">接続 ID:</dt> <dd className="inline font-mono break-all">{status.accountId ?? '(未接続)'}</dd></div>
        <div><dt className="inline font-semibold">環境:</dt> <dd className="inline">{status.livemode === true ? 'Live' : status.livemode === false ? 'Test' : '(不明)'}</dd></div>
        <div><dt className="inline font-semibold">初回接続日時:</dt> <dd className="inline">{status.onboardedAt ?? '(未接続)'}</dd></div>
        <div><dt className="inline font-semibold">最終同期:</dt> <dd className="inline">{status.lastSyncedAt ?? '(未同期)'}</dd></div>
      </dl>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {isOwner && ownerActionLabel && (
          <form action={onboardingAction}>
            <PrimaryButton label={ownerActionLabel} enabled={true} />
          </form>
        )}
        <form action={syncAction}>
          <SecondaryButton label="Stripe から最新情報を取得" />
        </form>
        {!isOwner && (
          <div className="text-[11px] text-neutral-500">
            接続・再登録操作は owner のみが実行できます。 admin / staff は状態確認と同期のみ可能です。
          </div>
        )}
      </div>
    </div>
  )
}
