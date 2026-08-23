import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCosmohypeAdminContext } from '@/lib/cosmohypeAdmin'

export const dynamic = 'force-dynamic'

/**
 * Cosmohype 運営者向け 注文横断一覧 (Phase D)。
 *
 * データ源: shop_admin_search_orders(p_query, p_payment_status, p_limit, p_offset)
 * SECURITY DEFINER RPC。 内部で profiles.role='admin' を再検証。
 *
 * 個人情報 (住所 / 電話) は一覧に出さない。 buyer 表示は username / display_name のみ。
 * 詳細画面 (/cosmohype-admin/orders/[orderId]) で必要情報を展開する。
 */

interface OrderRow {
  order_id: string
  created_at: string
  buyer_id: string | null
  buyer_username: string | null
  buyer_display_name: string | null
  brand_names: string[] | null
  brand_ids: string[] | null
  product_names: string[] | null
  total_amount: number
  currency: string
  status: string
  payment_status: string
  fulfillment_status: string
  item_count: number
}

const PAYMENT_STATUS_OPTIONS = [
  { value: '',                   label: '(全 payment status)' },
  { value: 'awaiting_payment',   label: 'awaiting_payment' },
  { value: 'processing',         label: 'processing' },
  { value: 'succeeded',          label: 'succeeded' },
  { value: 'failed',             label: 'failed' },
  { value: 'cancelled',          label: 'cancelled' },
  { value: 'refunded',           label: 'refunded' },
] as const

const PAGE_SIZE = 50

function formatYen(v: number, currency: string): string {
  if (currency === 'JPY') return `¥${new Intl.NumberFormat('ja-JP').format(v)}`
  return `${new Intl.NumberFormat('ja-JP').format(v)} ${currency}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

function badge(text: string, tone: 'ok' | 'warn' | 'danger' | 'neutral'): string {
  const base = 'inline-block text-[10px] font-semibold px-2 py-0.5 rounded border '
  switch (tone) {
    case 'ok':      return base + 'bg-emerald-50 text-emerald-800 border-emerald-200'
    case 'warn':    return base + 'bg-amber-50 text-amber-800 border-amber-200'
    case 'danger':  return base + 'bg-red-50 text-red-800 border-red-200'
    case 'neutral': return base + 'bg-neutral-100 text-neutral-700 border-neutral-300'
  }
}

function paymentTone(s: string): 'ok' | 'warn' | 'danger' | 'neutral' {
  switch (s) {
    case 'succeeded':        return 'ok'
    case 'awaiting_payment': return 'warn'
    case 'processing':       return 'warn'
    case 'failed':           return 'danger'
    case 'cancelled':        return 'neutral'
    case 'refunded':         return 'neutral'
    default:                 return 'neutral'
  }
}

function fulfillmentTone(s: string): 'ok' | 'warn' | 'danger' | 'neutral' {
  switch (s) {
    case 'fulfilled': return 'ok'
    case 'partial':   return 'warn'
    case 'cancelled': return 'danger'
    default:          return 'neutral'
  }
}

export default async function CosmohypeAdminOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; ps?: string; page?: string }>
}) {
  await getCosmohypeAdminContext()

  const sp = (await searchParams) ?? {}
  const q = (sp.q ?? '').trim()
  const ps = (sp.ps ?? '').trim()
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()
  // deno-lint-ignore no-explicit-any
  const loose = supabase as unknown as any

  const { data, error } = await loose.rpc('shop_admin_search_orders', {
    p_query:          q.length > 0 ? q : null,
    p_payment_status: ps.length > 0 ? ps : null,
    p_limit:          PAGE_SIZE,
    p_offset:         offset,
  })

  const rows: OrderRow[] = (data as OrderRow[] | null) ?? []
  const fetchError = error?.message ?? null

  // 次ページ判定: 返却が PAGE_SIZE 件なら次あり
  const hasNextPage = rows.length === PAGE_SIZE
  const hasPrevPage = page > 1

  function pageHref(p: number): string {
    const qs = new URLSearchParams()
    if (q.length > 0) qs.set('q', q)
    if (ps.length > 0) qs.set('ps', ps)
    if (p > 1) qs.set('page', String(p))
    const s = qs.toString()
    return s.length > 0 ? `/cosmohype-admin/orders?${s}` : '/cosmohype-admin/orders'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">注文管理</h1>
        <p className="mt-1 text-[12px] text-neutral-600">
          Cosmohype 運営者専用 — 全ブランドを横断して注文を検索・閲覧できます (read-only)。
          Phase D では強制 refund / status 変更 / 削除は未実装です。
        </p>
      </div>

      <form action="/cosmohype-admin/orders" method="get" className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="order id / order_group id / user id / brand id / product id / ユーザー名 / ブランド名 / 商品名 / email / Stripe PI id"
          className="flex-1 min-w-[280px] h-10 border border-neutral-300 rounded px-3 text-sm bg-white"
        />
        <select
          name="ps"
          defaultValue={ps}
          className="h-10 border border-neutral-300 rounded px-2 text-sm bg-white"
        >
          {PAYMENT_STATUS_OPTIONS.map((o) => (
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
          注文の読み込みに失敗しました。 時間をおいてもう一度お試しください。
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-3 py-2 text-left">日時</th>
              <th className="px-3 py-2 text-left">注文 ID</th>
              <th className="px-3 py-2 text-left">購入者</th>
              <th className="px-3 py-2 text-left">ブランド</th>
              <th className="px-3 py-2 text-left">商品</th>
              <th className="px-3 py-2 text-right">金額</th>
              <th className="px-3 py-2 text-left">payment</th>
              <th className="px-3 py-2 text-left">status / fulfillment</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !fetchError && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-neutral-500 text-[12px]">
                  {q.length > 0 || ps.length > 0 ? '該当する注文はありません' : 'まだ注文はありません'}
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const brandLabel = (r.brand_names ?? []).length === 0
                ? '-'
                : (r.brand_names ?? []).length === 1
                ? r.brand_names![0]
                : `${r.brand_names![0]} 他 ${(r.brand_names?.length ?? 1) - 1} 社`
              const productLabel = (r.product_names ?? []).length === 0
                ? '-'
                : (r.product_names ?? []).length === 1
                ? r.product_names![0]
                : `${r.product_names![0]} 他 ${(r.product_names?.length ?? 1) - 1} 点`
              return (
                <tr key={r.order_id} className="border-t border-neutral-100 align-top hover:bg-neutral-50">
                  <td className="px-3 py-2 text-[12px] text-neutral-600 whitespace-nowrap font-mono">
                    {formatDate(r.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/cosmohype-admin/orders/${r.order_id}`}
                      className="text-[11px] font-mono text-neutral-900 hover:underline"
                    >
                      {r.order_id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-[12px] text-neutral-800">
                    {r.buyer_display_name && r.buyer_display_name.length > 0
                      ? r.buyer_display_name
                      : (r.buyer_username ?? '-')}
                    {r.buyer_username && (
                      <div className="text-[10px] text-neutral-500 font-mono">@{r.buyer_username}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[12px] text-neutral-800">{brandLabel}</td>
                  <td className="px-3 py-2 text-[12px] text-neutral-800 max-w-[240px] truncate">
                    {productLabel}
                    <div className="text-[10px] text-neutral-500">{r.item_count} 点</div>
                  </td>
                  <td className="px-3 py-2 text-right text-[12px] font-mono">
                    {formatYen(r.total_amount, r.currency)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={badge(r.payment_status, paymentTone(r.payment_status))}>
                      {r.payment_status}
                    </span>
                  </td>
                  <td className="px-3 py-2 space-y-1">
                    <div><span className={badge(r.status, 'neutral')}>{r.status}</span></div>
                    <div><span className={badge(r.fulfillment_status, fulfillmentTone(r.fulfillment_status))}>{r.fulfillment_status}</span></div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ページング — 前後リンクだけの単純な offset ページャ */}
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
