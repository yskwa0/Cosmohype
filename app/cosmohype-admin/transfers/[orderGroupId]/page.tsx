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
    ? 'connect (Separate Charges & Transfers)' : g.snapshot_settlement_mode

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/cosmohype-admin/transfers" className="text-[12px] text-neutral-500 hover:underline">
          ← 一覧へ戻る
        </Link>
        <div className="text-[12px] text-neutral-400 font-mono">
          order_group: {g.order_group_id}
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
        <span className={badge(g.transfer_status, transferTone(g.transfer_status))}>
          Transfer: {g.transfer_status}
        </span>
        <span className={badge(g.reversal_status, reversalTone(g.reversal_status))}>
          Reversal: {g.reversal_status}
        </span>
        {o.refund_status && (
          <span className={badge(`refund: ${o.refund_status}`, refundTone(o.refund_status))}>
            refund: {o.refund_status}
          </span>
        )}
        <span className={badge(modeLabel, g.snapshot_settlement_mode === 'connect_separate_charges_transfers' ? 'info' : 'neutral')}>
          mode: {modeLabel}
        </span>
      </div>

      {/* Group / Order 基本情報 */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900">Group / Order</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
          <Kv label="brand" value={`${g.brand_name} (${g.brand_id.slice(0, 8)}…)`} />
          <Kv
            label="buyer"
            value={o.buyer_username ? `@${o.buyer_username}` : '(no username)'}
          />
          <Kv label="buyer user_id" value={o.user_id} mono />
          <Kv label="order status" value={o.status} />
          <Kv label="payment status" value={o.payment_status} />
          <Kv label="fulfillment status" value={o.fulfillment_status} />
          <Kv label="order total" value={formatYen(o.total_amount, o.currency)} />
          <Kv label="subtotal" value={formatYen(g.subtotal_amount)} />
          <Kv label="shipping" value={formatYen(g.shipping_amount)} />
          <Kv label="discount" value={formatYen(g.discount_amount)} />
          <Kv label="platform fee" value={formatYen(g.platform_fee_amount)} />
          <Kv
            label="fee rate (bps)"
            value={g.snapshot_platform_fee_rate_bps == null ? '-' : String(g.snapshot_platform_fee_rate_bps)}
          />
          <Kv label="fee term id" value={g.snapshot_fee_settlement_term_id ?? '-'} mono />
          <Kv label="group created" value={formatDT(g.created_at)} />
          <Kv label="group updated" value={formatDT(g.updated_at)} />
        </div>
      </section>

      {/* Stripe id (Dashboard 照合用) */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900">Stripe ID (Dashboard 照合用)</h2>
        <div className="grid grid-cols-1 gap-2 text-[12px]">
          <Kv label="payment_intent" value={o.stripe_payment_intent_id ?? '-'} mono selectAll />
          <Kv label="charge" value={o.stripe_charge_id ?? '-'} mono selectAll />
          <Kv label="transfer_group" value={o.stripe_transfer_group ?? '-'} mono selectAll />
          <Kv label="transfer" value={g.stripe_transfer_id ?? '-'} mono selectAll />
          <Kv label="destination account" value={g.snapshot_stripe_connect_account_id ?? '-'} mono selectAll />
          <Kv label="refund" value={o.stripe_refund_id ?? '-'} mono selectAll />
        </div>
      </section>

      {/* Transfer state */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900">Transfer state</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
          <Kv label="status" value={g.transfer_status} />
          <Kv label="attempt count" value={String(g.transfer_attempt_count)} />
          <Kv label="last attempt" value={formatDT(g.transfer_last_attempt_at)} />
          <Kv label="next retry" value={formatDT(g.transfer_next_retry_at)} />
          <Kv label="processing since" value={formatDT(g.transfer_processing_started_at)} />
          <Kv label="transfer amount" value={formatYen(g.transfer_amount)} />
        </div>
        {g.transfer_last_error && (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-[11px] font-mono text-amber-900 whitespace-pre-wrap break-all">
            {g.transfer_last_error}
          </div>
        )}
      </section>

      {/* Reversal state + reconciliation form */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900">Reversal state</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
          <Kv label="status" value={g.reversal_status} />
          <Kv label="amount" value={formatYen(g.reversal_amount)} />
          <Kv label="attempt count" value={String(g.reversal_attempt_count)} />
          <Kv label="last attempt" value={formatDT(g.reversal_last_attempt_at)} />
          <Kv label="next retry" value={formatDT(g.reversal_next_retry_at)} />
          <Kv label="processing since" value={formatDT(g.reversal_processing_started_at)} />
        </div>
        {g.reversal_last_error && (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-[11px] font-mono text-amber-900 whitespace-pre-wrap break-all">
            {g.reversal_last_error}
          </div>
        )}

        {canRetryOrAbandon ? (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 space-y-4 mt-4">
            <div className="text-[12px] font-semibold text-red-900">
              ⚠ Manual reconciliation (reversal_status = failed_persistent)
            </div>
            <div className="text-[11px] text-red-800 leading-relaxed">
              5 回の attempt すべてに失敗しました。 Cosmohype 運営として以下いずれかを選択してください。
              いずれも <span className="font-mono">shop_admin_resolve_transfer_reversal_failed</span> RPC を呼び出します。
              理由 (reason) は監査目的で <span className="font-mono">reversal_last_error</span> に prefix 付きで保存されます (200 文字以内)。
            </div>

            <form action={retryReversalAction} className="space-y-2">
              <input type="hidden" name="order_group_id" value={g.order_group_id} />
              <label className="block text-[11px] font-semibold text-neutral-800">
                Retry 理由 (必須、200 文字以内)
              </label>
              <textarea
                name="reason"
                required
                maxLength={200}
                rows={2}
                placeholder="例: Stripe 側で connect account の restrictions が解除されたことを確認"
                className="w-full text-[12px] rounded border border-neutral-300 bg-white px-3 py-2"
              />
              <div className="flex items-center gap-2">
                <ConfirmRetryReversalButton />
                <span className="text-[11px] text-neutral-600">
                  Retry: attempt_count=0 で pending に戻し、worker が次 tick で発行を再試行します。
                </span>
              </div>
            </form>

            <form action={abandonReversalAction} className="space-y-2 border-t border-red-200 pt-4">
              <input type="hidden" name="order_group_id" value={g.order_group_id} />
              <label className="block text-[11px] font-semibold text-neutral-800">
                Abandon 理由 (必須、200 文字以内)
              </label>
              <textarea
                name="reason"
                required
                maxLength={200}
                rows={2}
                placeholder="例: brand と個別合意により手動精算で対応"
                className="w-full text-[12px] rounded border border-neutral-300 bg-white px-3 py-2"
              />
              <div className="flex items-center gap-2">
                <ConfirmAbandonReversalButton />
                <span className="text-[11px] text-red-800 font-semibold">
                  Abandon: Stripe API を呼びません。 Cosmohype 側の損失として確定させる操作です。
                </span>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-[11px] text-neutral-500">
            Manual reconciliation は reversal_status = failed_persistent の group でのみ可能です。
          </div>
        )}
      </section>

      {/* Stripe transfer 履歴 */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900">
          Stripe Transfer 履歴 ({transfers.length})
        </h2>
        {transfers.length === 0 ? (
          <div className="text-[12px] text-neutral-500">Transfer 発行なし</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-3 py-2 text-left">created</th>
                  <th className="px-3 py-2 text-left">stripe_transfer_id</th>
                  <th className="px-3 py-2 text-left">destination</th>
                  <th className="px-3 py-2 text-right">amount</th>
                  <th className="px-3 py-2 text-left">source_transaction</th>
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
          Stripe Reversal 履歴 ({reversals.length})
        </h2>
        {reversals.length === 0 ? (
          <div className="text-[12px] text-neutral-500">Reversal 発行なし</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-3 py-2 text-left">created</th>
                  <th className="px-3 py-2 text-left">stripe_reversal_id</th>
                  <th className="px-3 py-2 text-right">amount</th>
                  <th className="px-3 py-2 text-left">reason</th>
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
