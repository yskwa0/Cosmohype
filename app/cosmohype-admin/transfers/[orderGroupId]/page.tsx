import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCosmohypeAdminContext } from '@/lib/cosmohypeAdmin'
import { retryReversalAction, abandonReversalAction } from '../actions'
import { ConfirmRetryReversalButton, ConfirmAbandonReversalButton } from '../_ConfirmButtons'

export const dynamic = 'force-dynamic'

/**
 * Cosmohype 運営者向け Transfer/Reversal 詳細 (Phase 4-C.6)。
 *
 * データ源: shop_admin_get_transfer_detail(p_order_group_id)
 * SECURITY DEFINER RPC。 内部で profiles.role='admin' を再検証。
 *
 * reversal_status='failed_persistent' の場合のみ Retry / Abandon フォームを表示。
 * 個人情報 (email/住所/phone) は表示しない = user_id (UUID) のみ。
 * Stripe id は Dashboard 照合用にそのまま表示 (mono、コピー可)。
 */

interface GroupDetail {
  order_group_id: string
  order_id: string
  brand_id: string
  brand_name: string
  subtotal_amount: number
  shipping_amount: number
  discount_amount: number
  platform_fee_amount: number | null
  snapshot_settlement_mode: string
  snapshot_platform_fee_rate_bps: number | null
  snapshot_fee_settlement_term_id: string | null
  snapshot_stripe_connect_account_id: string | null
  transfer_status: string
  transfer_attempt_count: number
  transfer_last_attempt_at: string | null
  transfer_next_retry_at: string | null
  transfer_last_error: string | null
  transfer_processing_started_at: string | null
  stripe_transfer_id: string | null
  transfer_amount: number | null
  reversal_status: string
  reversal_amount: number | null
  reversal_attempt_count: number
  reversal_last_attempt_at: string | null
  reversal_next_retry_at: string | null
  reversal_last_error: string | null
  reversal_processing_started_at: string | null
  created_at: string
  updated_at: string
}

interface OrderDetail {
  order_id: string
  user_id: string
  buyer_username: string | null
  status: string
  payment_status: string
  fulfillment_status: string
  refund_status: string | null
  total_amount: number
  currency: string
  stripe_payment_intent_id: string | null
  stripe_charge_id: string | null
  stripe_transfer_group: string | null
  stripe_refund_id: string | null
  refund_amount: number | null
  refunded_at: string | null
  created_at: string
  updated_at: string
}

interface TransferRow {
  id: string
  stripe_transfer_id: string
  destination_account_id: string
  amount: number
  currency: string
  transfer_group: string | null
  source_transaction: string | null
  created_at: string
}

interface ReversalRow {
  id: string
  transfer_record_id: string
  stripe_reversal_id: string
  amount: number
  reason: string | null
  created_at: string
}

interface DetailResponse {
  group: GroupDetail
  order: OrderDetail
  transfers: TransferRow[]
  reversals: ReversalRow[]
}

function formatYen(v: number | null, currency: string = 'JPY'): string {
  if (v == null) return '-'
  if (currency === 'JPY') return `¥${new Intl.NumberFormat('ja-JP').format(v)}`
  return `${new Intl.NumberFormat('ja-JP').format(v)} ${currency}`
}

function formatDT(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`
}

function badge(text: string, tone: 'ok' | 'warn' | 'danger' | 'neutral' | 'info'): string {
  const base = 'inline-block text-[10px] font-semibold px-2 py-0.5 rounded border '
  switch (tone) {
    case 'ok':      return base + 'bg-emerald-50 text-emerald-800 border-emerald-200'
    case 'warn':    return base + 'bg-amber-50 text-amber-800 border-amber-200'
    case 'danger':  return base + 'bg-red-50 text-red-800 border-red-200'
    case 'neutral': return base + 'bg-neutral-100 text-neutral-700 border-neutral-300'
    case 'info':    return base + 'bg-sky-50 text-sky-800 border-sky-200'
  }
}

function transferTone(s: string): 'ok' | 'warn' | 'danger' | 'neutral' | 'info' {
  switch (s) {
    case 'created':           return 'ok'
    case 'pending':           return 'warn'
    case 'processing':        return 'info'
    case 'failed_persistent': return 'danger'
    case 'cancelled':         return 'neutral'
    case 'not_applicable':    return 'neutral'
    default:                  return 'neutral'
  }
}

function transferLabel(s: string): string {
  switch (s) {
    case 'created':           return '送金済み'
    case 'pending':           return '処理待ち'
    case 'processing':        return '処理中'
    case 'failed_persistent': return '要確認'
    case 'cancelled':         return '取り消し'
    case 'not_applicable':    return '対象外'
    default:                  return s
  }
}

function reversalTone(s: string): 'ok' | 'warn' | 'danger' | 'neutral' | 'info' {
  switch (s) {
    case 'completed':         return 'ok'
    case 'pending':           return 'warn'
    case 'processing':        return 'info'
    case 'failed_persistent': return 'danger'
    case 'abandoned':         return 'neutral'
    case 'not_applicable':    return 'neutral'
    default:                  return 'neutral'
  }
}

function reversalLabel(s: string): string {
  switch (s) {
    case 'completed':         return '取消完了'
    case 'pending':           return '処理待ち'
    case 'processing':        return '処理中'
    case 'failed_persistent': return '要確認'
    case 'abandoned':         return '対応終了'
    case 'not_applicable':    return '対象外'
    default:                  return s
  }
}

function refundTone(s: string | null): 'ok' | 'warn' | 'danger' | 'neutral' {
  switch (s) {
    case 'succeeded': return 'ok'
    case 'pending':   return 'warn'
    case 'failed':    return 'danger'
    case 'canceled':  return 'neutral'
    case 'none':      return 'neutral'
    default:          return 'neutral'
  }
}

function refundLabel(s: string | null): string {
  switch (s) {
    case 'succeeded': return '完了'
    case 'pending':   return '処理待ち'
    case 'failed':    return '失敗'
    case 'canceled':  return '取り消し'
    case 'none':      return 'なし'
    default:          return s ?? ''
  }
}

function orderStatusLabel(s: string): string {
  switch (s) {
    case 'draft':            return '下書き'
    case 'placed':           return '確定'
    case 'paid':             return '入金済み'
    case 'cancelled':        return 'キャンセル済み'
    case 'refunded':         return '返金済み'
    case 'failed':           return '失敗'
    case 'refund_required':  return '返金対応中'
    case 'cancel_requested': return 'キャンセル依頼中'
    default:                 return s
  }
}

function paymentStatusLabel(s: string): string {
  switch (s) {
    case 'awaiting_payment': return '入金待ち'
    case 'processing':       return '処理中'
    case 'succeeded':        return '入金済み'
    case 'failed':           return '失敗'
    case 'cancelled':        return 'キャンセル済み'
    case 'refunded':         return '返金済み'
    default:                 return s
  }
}

function fulfillmentStatusLabel(s: string): string {
  switch (s) {
    case 'unfulfilled': return '未発送'
    case 'partial':     return '一部発送済み'
    case 'fulfilled':   return '発送済み'
    case 'cancelled':   return 'キャンセル済み'
    default:            return s
  }
}

function errorLabel(code: string): string {
  switch (code) {
    case 'not_authenticated':      return '認証が切れました。再度ログインしてください。'
    case 'forbidden':              return '運営者権限がありません。'
    case 'order_group_not_found':  return '対象の order_group が見つかりません。'
    case 'not_connect_mode':       return 'この group は Connect settlement mode ではありません。'
    case 'not_failed_persistent':  return '現在の reversal_status では操作できません (failed_persistent のみ許可)。'
    case 'invalid_action':         return '不正な操作です。'
    case 'reason_required':        return '理由 (reason) の入力は必須です。'
    case 'reason_too_long':        return '理由は 200 文字以内で入力してください。'
    default:                       return '操作に失敗しました。時間をおいてもう一度お試しください。'
  }
}

function savedLabel(code: string): string {
  switch (code) {
    case 'retry':   return 'Retry を実行しました。次回 Reversal worker tick で発行されます。'
    case 'abandon': return 'Abandon を実行しました。 Stripe API は呼び出されず、Cosmohype 側の損失として確定されました。'
    default:        return '操作を完了しました。'
  }
}

function isValidUUID(s: string): boolean {
  return /^[0-9a-fA-F-]{36}$/.test(s)
}

export default async function CosmohypeAdminTransferDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderGroupId: string }>
  searchParams?: Promise<{ err?: string; saved?: string }>
}) {
  await getCosmohypeAdminContext()

  const { orderGroupId } = await params
  const sp = (await searchParams) ?? {}
  const err = (sp.err ?? '').trim()
  const saved = (sp.saved ?? '').trim()

  if (!isValidUUID(orderGroupId)) {
    return (
      <div className="space-y-6">
        <Link href="/cosmohype-admin/transfers" className="text-[12px] text-neutral-500 hover:underline">
          ← 一覧へ戻る
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-800">
          不正な order_group_id です。
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data, error } = await (
    supabase as unknown as {
      rpc: (
        fn: string,
        params: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>
    }
  ).rpc('shop_admin_get_transfer_detail', {
    p_order_group_id: orderGroupId,
  })

  if (error) {
    const msg = (error.message ?? '').toLowerCase()
    const notFound = msg.includes('order_group_not_found')
    return (
      <div className="space-y-6">
        <Link href="/cosmohype-admin/transfers" className="text-[12px] text-neutral-500 hover:underline">
          ← 一覧へ戻る
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-800">
          {notFound ? '対象の order_group が見つかりません。' : 'データの読み込みに失敗しました。'}
        </div>
      </div>
    )
  }

  const detail = data as DetailResponse
  const g = detail.group
  const o = detail.order
  const transfers = detail.transfers ?? []
  const reversals = detail.reversals ?? []

  const canRetryOrAbandon =
    g.snapshot_settlement_mode === 'connect_separate_charges_transfers' &&
    g.reversal_status === 'failed_persistent'

  const modeLabel = g.snapshot_settlement_mode === 'connect_separate_charges_transfers'
    ? '自動精算 (Stripe Connect)' : g.snapshot_settlement_mode === 'platform_manual' ? '手動精算' : g.snapshot_settlement_mode

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/cosmohype-admin/transfers" className="text-[12px] text-neutral-500 hover:underline">
          ← 一覧へ戻る
        </Link>
        <div className="text-[12px] text-neutral-400 font-mono">
          案件 ID: {g.order_group_id}
        </div>
      </div>

      {saved.length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[12px] text-emerald-800">
          {savedLabel(saved)}
        </div>
      )}
      {err.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] text-red-800">
          {errorLabel(err)}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className={badge('t', transferTone(g.transfer_status))}>
          送金: {transferLabel(g.transfer_status)}
        </span>
        <span className={badge('r', reversalTone(g.reversal_status))}>
          送金取消: {reversalLabel(g.reversal_status)}
        </span>
        {o.refund_status && (
          <span className={badge('refund', refundTone(o.refund_status))}>
            返金: {refundLabel(o.refund_status)}
          </span>
        )}
        <span className={badge('mode', g.snapshot_settlement_mode === 'connect_separate_charges_transfers' ? 'info' : 'neutral')}>
          精算方法: {modeLabel}
        </span>
      </div>

      {/* Group / Order 基本情報 */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900">ブランド別注文と注文の情報</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
          <Kv label="ブランド" value={`${g.brand_name} (${g.brand_id.slice(0, 8)}…)`} />
          <Kv
            label="購入者"
            value={o.buyer_username ? `@${o.buyer_username}` : '(ユーザー名未設定)'}
          />
          <Kv label="購入者 ID" value={o.user_id} mono />
          <Kv label="注文の状態" value={orderStatusLabel(o.status)} />
          <Kv label="入金の状態" value={paymentStatusLabel(o.payment_status)} />
          <Kv label="発送の状態" value={fulfillmentStatusLabel(o.fulfillment_status)} />
          <Kv label="注文合計" value={formatYen(o.total_amount, o.currency)} />
          <Kv label="商品小計" value={formatYen(g.subtotal_amount)} />
          <Kv label="送料" value={formatYen(g.shipping_amount)} />
          <Kv label="割引" value={formatYen(g.discount_amount)} />
          <Kv label="プラットフォーム手数料" value={formatYen(g.platform_fee_amount)} />
          <Kv
            label="手数料率"
            value={g.snapshot_platform_fee_rate_bps == null ? '-' : `${(g.snapshot_platform_fee_rate_bps / 100).toFixed(0)}%`}
          />
          <Kv label="料金・精算条件書 ID" value={g.snapshot_fee_settlement_term_id ?? '-'} mono />
          <Kv label="ブランド別注文の作成日時" value={formatDT(g.created_at)} />
          <Kv label="ブランド別注文の更新日時" value={formatDT(g.updated_at)} />
        </div>
      </section>

      {/* Stripe id (Dashboard 照合用) */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900">Stripe 上の照合用 ID</h2>
        <div className="grid grid-cols-1 gap-2 text-[12px]">
          <Kv label="Stripe 決済 ID (PaymentIntent)" value={o.stripe_payment_intent_id ?? '-'} mono selectAll />
          <Kv label="Stripe 課金 ID (Charge)" value={o.stripe_charge_id ?? '-'} mono selectAll />
          <Kv label="Stripe 送金グループ ID" value={o.stripe_transfer_group ?? '-'} mono selectAll />
          <Kv label="Stripe 送金 ID (Transfer)" value={g.stripe_transfer_id ?? '-'} mono selectAll />
          <Kv label="Stripe 受取アカウント ID (送金先)" value={g.snapshot_stripe_connect_account_id ?? '-'} mono selectAll />
          <Kv label="Stripe 返金 ID (Refund)" value={o.stripe_refund_id ?? '-'} mono selectAll />
        </div>
      </section>

      {/* 送金 (Transfer) の状態 */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900">ブランドへの送金の状態</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
          <Kv label="状態" value={transferLabel(g.transfer_status)} />
          <Kv label="試行回数" value={String(g.transfer_attempt_count)} />
          <Kv label="最終試行日時" value={formatDT(g.transfer_last_attempt_at)} />
          <Kv label="次回再試行予定" value={formatDT(g.transfer_next_retry_at)} />
          <Kv label="処理開始日時" value={formatDT(g.transfer_processing_started_at)} />
          <Kv label="送金予定額" value={formatYen(g.transfer_amount)} />
        </div>
        {g.transfer_last_error && (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-[11px] font-mono text-amber-900 whitespace-pre-wrap break-all">
            {g.transfer_last_error}
          </div>
        )}
      </section>

      {/* 送金取消 (Reversal) の状態 + 運営対応 */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900">返金にともなう送金取消の状態</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
          <Kv label="状態" value={reversalLabel(g.reversal_status)} />
          <Kv label="取消予定額" value={formatYen(g.reversal_amount)} />
          <Kv label="試行回数" value={String(g.reversal_attempt_count)} />
          <Kv label="最終試行日時" value={formatDT(g.reversal_last_attempt_at)} />
          <Kv label="次回再試行予定" value={formatDT(g.reversal_next_retry_at)} />
          <Kv label="処理開始日時" value={formatDT(g.reversal_processing_started_at)} />
        </div>
        {g.reversal_last_error && (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-[11px] font-mono text-amber-900 whitespace-pre-wrap break-all">
            {g.reversal_last_error}
          </div>
        )}

        {canRetryOrAbandon ? (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 space-y-4 mt-4">
            <div className="text-[12px] font-semibold text-red-900">
              ⚠ 運営による対応が必要 (送金取消が 5 回連続で失敗しています)
            </div>
            <div className="text-[11px] text-red-800 leading-relaxed">
              5 回の再試行がすべて失敗しました。 Cosmohype 運営として以下のいずれかを選択してください。
              入力した理由は監査目的で最新エラー欄に保存されます (200 文字以内)。
            </div>

            <form action={retryReversalAction} className="space-y-2">
              <input type="hidden" name="order_group_id" value={g.order_group_id} />
              <label className="block text-[11px] font-semibold text-neutral-800">
                再試行の理由 (必須、200 文字以内)
              </label>
              <textarea
                name="reason"
                required
                maxLength={200}
                rows={2}
                placeholder="例: Stripe 側でブランドの受取アカウントの制限が解除されたことを確認"
                className="w-full text-[12px] rounded border border-neutral-300 bg-white px-3 py-2"
              />
              <div className="flex items-center gap-2">
                <ConfirmRetryReversalButton />
                <span className="text-[11px] text-neutral-600">
                  再試行: 試行回数を 0 に戻し、次回の自動処理時に送金取消の発行を再試行します。
                </span>
              </div>
            </form>

            <form action={abandonReversalAction} className="space-y-2 border-t border-red-200 pt-4">
              <input type="hidden" name="order_group_id" value={g.order_group_id} />
              <label className="block text-[11px] font-semibold text-neutral-800">
                対応終了の理由 (必須、200 文字以内)
              </label>
              <textarea
                name="reason"
                required
                maxLength={200}
                rows={2}
                placeholder="例: ブランドとの個別合意により、手動精算で対応する"
                className="w-full text-[12px] rounded border border-neutral-300 bg-white px-3 py-2"
              />
              <div className="flex items-center gap-2">
                <ConfirmAbandonReversalButton />
                <span className="text-[11px] text-red-800 font-semibold">
                  対応終了: Stripe への送金取消は発行せず、Cosmohype 側の損失として確定させる操作です。
                </span>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-[11px] text-neutral-500">
            運営による対応 (再試行・対応終了) は、送金取消が 5 回連続で失敗した案件でのみ行えます。
          </div>
        )}
      </section>

      {/* Stripe 送金履歴 */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900">
          Stripe への送金履歴 ({transfers.length} 件)
        </h2>
        {transfers.length === 0 ? (
          <div className="text-[12px] text-neutral-500">送金の発行はまだありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-3 py-2 text-left">作成日時</th>
                  <th className="px-3 py-2 text-left">Stripe 送金 ID</th>
                  <th className="px-3 py-2 text-left">送金先アカウント</th>
                  <th className="px-3 py-2 text-right">金額</th>
                  <th className="px-3 py-2 text-left">元となる Stripe 課金 ID</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id} className="border-t border-neutral-100 align-top">
                    <td className="px-3 py-2 font-mono">{formatDT(t.created_at)}</td>
                    <td className="px-3 py-2 font-mono break-all">{t.stripe_transfer_id}</td>
                    <td className="px-3 py-2 font-mono break-all">{t.destination_account_id}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatYen(t.amount, t.currency.toUpperCase())}
                    </td>
                    <td className="px-3 py-2 font-mono break-all">{t.source_transaction ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Stripe reversal 履歴 */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900">
          Stripe への送金取消履歴 ({reversals.length} 件)
        </h2>
        {reversals.length === 0 ? (
          <div className="text-[12px] text-neutral-500">送金取消の発行はまだありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-3 py-2 text-left">作成日時</th>
                  <th className="px-3 py-2 text-left">Stripe 送金取消 ID</th>
                  <th className="px-3 py-2 text-right">金額</th>
                  <th className="px-3 py-2 text-left">理由</th>
                </tr>
              </thead>
              <tbody>
                {reversals.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-100 align-top">
                    <td className="px-3 py-2 font-mono">{formatDT(r.created_at)}</td>
                    <td className="px-3 py-2 font-mono break-all">{r.stripe_reversal_id}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatYen(r.amount)}</td>
                    <td className="px-3 py-2">{r.reason ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function Kv({
  label,
  value,
  mono,
  selectAll,
}: {
  label: string
  value: string
  mono?: boolean
  selectAll?: boolean
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div
        className={`mt-0.5 text-[12px] text-neutral-900 break-all ${mono ? 'font-mono' : ''} ${
          selectAll ? 'select-all' : ''
        }`}
      >
        {value}
      </div>
    </div>
  )
}
