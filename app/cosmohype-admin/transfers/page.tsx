import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCosmohypeAdminContext } from '@/lib/cosmohypeAdmin'

export const dynamic = 'force-dynamic'

/**
 * Cosmohype 運営者向け Transfer/Reversal 一覧 (Phase 4-C.6)。
 *
 * データ源: shop_admin_search_transfers(p_filter, p_query, p_limit, p_offset)
 * SECURITY DEFINER RPC。 内部で profiles.role='admin' を再検証。
 *
 * 個人情報 (email/住所/phone) は表示しない。 buyer は user_id (UUID) の先頭 8 桁のみ。
 * failed_persistent の見逃し防止のため needs_attention filter を default 候補として提示。
 */

interface TransferRow {
  order_group_id: string
  order_id: string
  brand_id: string
  brand_name: string
  buyer_user_id: string | null
  buyer_username: string | null
  snapshot_settlement_mode: string
  transfer_status: string
  transfer_attempt_count: number
  transfer_last_attempt_at: string | null
  transfer_next_retry_at: string | null
  transfer_last_error: string | null
  transfer_processing_started_at: string | null
  stripe_transfer_id: string | null
  transfer_amount: number | null
  destination_account_id: string | null
  reversal_status: string
  reversal_amount: number | null
  reversal_attempt_count: number
  reversal_last_attempt_at: string | null
  reversal_next_retry_at: string | null
  reversal_last_error: string | null
  reversal_processing_started_at: string | null
  stripe_reversal_id: string | null
  order_refund_status: string | null
  order_status: string
  created_at: string
  updated_at: string
}

const FILTER_OPTIONS = [
  { value: 'needs_attention',   label: '⚠ Needs attention' },
  { value: 'all',               label: 'All' },
  { value: 'transfer_pending',  label: 'Transfer pending' },
  { value: 'transfer_failed',   label: 'Transfer failed (persistent)' },
  { value: 'reversal_pending',  label: 'Reversal pending' },
  { value: 'reversal_failed',   label: 'Reversal failed (persistent)' },
  { value: 'completed',         label: 'Completed' },
  { value: 'manual_settlement', label: 'Manual settlement (platform_manual)' },
] as const

const PAGE_SIZE = 50

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
  return `${y}-${m}-${day} ${hh}:${mm}`
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

/** processing 状態で lease 開始から 10 分超過なら stale warning。 */
function isStaleProcessing(startedAt: string | null): boolean {
  if (!startedAt) return false
  const started = new Date(startedAt).getTime()
  if (Number.isNaN(started)) return false
  return Date.now() - started > 10 * 60 * 1000
}

export default async function CosmohypeAdminTransfersPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; f?: string; page?: string }>
}) {
  await getCosmohypeAdminContext()

  const sp = (await searchParams) ?? {}
  const q = (sp.q ?? '').trim()
  const f = (sp.f ?? 'needs_attention').trim()
  const validFilter = FILTER_OPTIONS.some((o) => o.value === f) ? f : 'needs_attention'
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()
  const { data, error } = await (
    supabase as unknown as {
      rpc: (
        fn: string,
        params: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>
    }
  ).rpc('shop_admin_search_transfers', {
    p_filter: validFilter,
    p_query:  q.length > 0 ? q : null,
    p_limit:  PAGE_SIZE,
    p_offset: offset,
  })

  const rows: TransferRow[] = (data as TransferRow[] | null) ?? []
  const fetchError = error?.message ?? null

  const hasNextPage = rows.length === PAGE_SIZE
  const hasPrevPage = page > 1

  function pageHref(p: number): string {
    const qs = new URLSearchParams()
    if (q.length > 0) qs.set('q', q)
    if (validFilter !== 'needs_attention') qs.set('f', validFilter)
    if (p > 1) qs.set('page', String(p))
    const s = qs.toString()
    return s.length > 0 ? `/cosmohype-admin/transfers?${s}` : '/cosmohype-admin/transfers'
  }

  const attentionCount = rows.filter(
    (r) =>
      r.transfer_status === 'failed_persistent' ||
      r.reversal_status === 'failed_persistent' ||
      isStaleProcessing(r.transfer_processing_started_at) ||
      isStaleProcessing(r.reversal_processing_started_at),
  ).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Transfer / Reversal 監視</h1>
        <p className="mt-1 text-[12px] text-neutral-600">
          Cosmohype 運営者専用 — Stripe Connect の Transfer 発行と、返金時の Reversal を監視します。
          failed_persistent の見逃し防止のため default filter は「Needs attention」です。
          個人情報 (email / 住所) は表示しません。
        </p>
      </div>

      <form action="/cosmohype-admin/transfers" method="get" className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="order_group_id / order_id / brand_id / user_id / stripe_transfer_id / ブランド名 / @username"
          className="flex-1 min-w-[280px] h-10 border border-neutral-300 rounded px-3 text-sm bg-white"
        />
        <select
          name="f"
          defaultValue={validFilter}
          className="h-10 border border-neutral-300 rounded px-2 text-sm bg-white"
        >
          {FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 px-4 rounded bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800"
        >
          検索
        </button>
      </form>

      {fetchError && (
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          データの読み込みに失敗しました。 時間をおいてもう一度お試しください。
        </div>
      )}

      {validFilter === 'needs_attention' && !fetchError && (
        <div className={`text-[12px] rounded px-3 py-2 border ${
          attentionCount > 0
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {attentionCount > 0
            ? `⚠ Attention 対象: ${attentionCount} 件。 failed_persistent または 10 分超過 processing lease を含みます。`
            : '✓ 現在 attention 対象はありません。'}
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-3 py-2 text-left">更新</th>
              <th className="px-3 py-2 text-left">Group / Order</th>
              <th className="px-3 py-2 text-left">Brand</th>
              <th className="px-3 py-2 text-left">Mode</th>
              <th className="px-3 py-2 text-left">Transfer</th>
              <th className="px-3 py-2 text-left">Reversal</th>
              <th className="px-3 py-2 text-left">Refund</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !fetchError && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-neutral-500 text-[12px]">
                  {q.length > 0 || validFilter !== 'all'
                    ? '該当する order_group はありません'
                    : 'まだ order_group はありません'}
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const staleT = isStaleProcessing(r.transfer_processing_started_at)
              const staleR = isStaleProcessing(r.reversal_processing_started_at)
              const modeShort = r.snapshot_settlement_mode === 'connect_separate_charges_transfers'
                ? 'connect' : r.snapshot_settlement_mode
              return (
                <tr key={r.order_group_id} className="border-t border-neutral-100 align-top hover:bg-neutral-50">
                  <td className="px-3 py-2 text-[11px] text-neutral-600 whitespace-nowrap font-mono">
                    {formatDT(r.updated_at)}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/cosmohype-admin/transfers/${r.order_group_id}`}
                      className="text-[11px] font-mono text-neutral-900 hover:underline"
                    >
                      {r.order_group_id.slice(0, 8)}…
                    </Link>
                    <div className="text-[10px] text-neutral-500 font-mono">
                      order: {r.order_id.slice(0, 8)}…
                    </div>
                    {r.buyer_username && (
                      <div className="text-[10px] text-neutral-700 font-mono">
                        @{r.buyer_username}
                      </div>
                    )}
                    {r.buyer_user_id && (
                      <div className="text-[10px] text-neutral-500 font-mono">
                        buyer: {r.buyer_user_id.slice(0, 8)}…
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[12px] text-neutral-800">{r.brand_name}</td>
                  <td className="px-3 py-2">
                    <span className={badge(modeShort, modeShort === 'connect' ? 'info' : 'neutral')}>
                      {modeShort}
                    </span>
                  </td>
                  <td className="px-3 py-2 space-y-1">
                    <div><span className={badge(r.transfer_status, transferTone(r.transfer_status))}>{r.transfer_status}</span></div>
                    {r.transfer_attempt_count > 0 && (
                      <div className="text-[10px] text-neutral-500">
                        attempts: {r.transfer_attempt_count}
                      </div>
                    )}
                    {staleT && (
                      <div><span className={badge('stale 10+ min', 'danger')}>stale 10+ min</span></div>
                    )}
                  </td>
                  <td className="px-3 py-2 space-y-1">
                    <div><span className={badge(r.reversal_status, reversalTone(r.reversal_status))}>{r.reversal_status}</span></div>
                    {r.reversal_attempt_count > 0 && (
                      <div className="text-[10px] text-neutral-500">
                        attempts: {r.reversal_attempt_count}
                      </div>
                    )}
                    {staleR && (
                      <div><span className={badge('stale 10+ min', 'danger')}>stale 10+ min</span></div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[11px]">
                    {r.order_refund_status ? (
                      <span className={badge(r.order_refund_status, r.order_refund_status === 'succeeded' ? 'ok' : r.order_refund_status === 'failed' ? 'danger' : 'warn')}>
                        {r.order_refund_status}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2 text-right text-[12px] font-mono">
                    {formatYen(r.transfer_amount)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {(hasPrevPage || hasNextPage) && (
        <div className="flex items-center justify-between text-[12px] text-neutral-600">
          <div>ページ {page}</div>
          <div className="flex items-center gap-2">
            {hasPrevPage ? (
              <Link href={pageHref(page - 1)} className="px-3 py-1.5 border border-neutral-300 rounded hover:bg-neutral-50">
                ← 前へ
              </Link>
            ) : (
              <span className="px-3 py-1.5 border border-neutral-200 rounded text-neutral-400">← 前へ</span>
            )}
            {hasNextPage ? (
              <Link href={pageHref(page + 1)} className="px-3 py-1.5 border border-neutral-300 rounded hover:bg-neutral-50">
                次へ →
              </Link>
            ) : (
              <span className="px-3 py-1.5 border border-neutral-200 rounded text-neutral-400">次へ →</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
