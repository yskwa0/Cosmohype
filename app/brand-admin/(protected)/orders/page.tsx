import Link from 'next/link'
import { getBrandAdminContext, isBrandAdminDevBypassEnabled } from '@/lib/brandAdmin'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface GroupRowBase {
  id: string
  order_id: string
  brand_id: string
  brand_name: string
  subtotal_amount: number
  shipping_amount: number
  fulfillment_status: string
  tracking_number: string | null
  tracking_carrier: string | null
  shipped_at: string | null
  delivered_at: string | null
  created_at: string
}
interface GroupRow extends GroupRowBase {
  shop_orders: {
    id: string
    status: string
    payment_status: string
    currency: string
    shipping_name: string
    receipt_status: string | null
    created_at: string
  } | null
  shop_order_items:
    | Array<{
        product_name: string
        quantity: number
      }>
    | null
}

function ErrorBanner({ title, detail }: { title: string; detail: string }) {
  return (
    <div>
      <h1 className="text-lg font-semibold mb-2">{title}</h1>
      <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 whitespace-pre-wrap break-words">
        {detail}
      </div>
    </div>
  )
}

export default async function BrandAdminOrdersListPage() {
  const ctx = await getBrandAdminContext()
  const bypass = isBrandAdminDevBypassEnabled()

  // Dev Bypass では service_role が必須。無いと admin client は 401 になる。
  if (bypass && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <ErrorBanner
        title="Dev Bypass 設定不足"
        detail="Dev Bypass 経路では .env.local に SUPABASE_SERVICE_ROLE_KEY を Test project の service_role key で設定する必要があります。"
      />
    )
  }

  const supabase = bypass ? createAdminClient() : await createClient()

  // 2 段階 fetch: groups → shop_orders + shop_order_items を別 query で結合。
  // 埋め込み JOIN が admin client / anon で挙動差を出しにくく、原因切り分けも容易。
  type LooseFrom = {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          order: (c: string, o: { ascending: boolean }) => {
            limit: (n: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }>
          }
        }
        in: (c: string, v: string[]) => Promise<{ data: unknown[] | null; error: { message: string } | null }>
      }
    }
  }
  const loose = supabase as unknown as LooseFrom

  const groupsRes = await loose
    .from('shop_order_groups')
    .select(
      'id, order_id, brand_id, brand_name, subtotal_amount, shipping_amount, fulfillment_status, tracking_number, tracking_carrier, shipped_at, delivered_at, created_at'
    )
    .eq('brand_id', ctx.currentBrand.brandId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (groupsRes.error) {
    console.error('[brand-admin/orders] shop_order_groups fetch failed', groupsRes.error)
    return (
      <ErrorBanner
        title="注文一覧の取得に失敗しました"
        detail={groupsRes.error.message}
      />
    )
  }
  const groups = (groupsRes.data ?? []) as GroupRowBase[]
  const orderIds = Array.from(new Set(groups.map((g) => g.order_id)))
  const groupIds = groups.map((g) => g.id)

  const [ordersRes, itemsRes] = await Promise.all([
    orderIds.length > 0
      ? loose
          .from('shop_orders')
          .select('id, status, payment_status, currency, shipping_name, receipt_status, created_at')
          .in('id', orderIds)
      : Promise.resolve({ data: [], error: null }),
    groupIds.length > 0
      ? loose
          .from('shop_order_items')
          .select('id, order_group_id, product_name, quantity')
          .in('order_group_id', groupIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (ordersRes.error) {
    console.error('[brand-admin/orders] shop_orders fetch failed', ordersRes.error)
  }
  if (itemsRes.error) {
    console.error('[brand-admin/orders] shop_order_items fetch failed', itemsRes.error)
  }
  const ordersById = new Map<string, GroupRow['shop_orders']>()
  for (const o of (ordersRes.data ?? []) as NonNullable<GroupRow['shop_orders']>[]) {
    ordersById.set(o.id, o)
  }
  const itemsByGroup = new Map<string, NonNullable<GroupRow['shop_order_items']>>()
  for (const it of (itemsRes.data ?? []) as Array<{ order_group_id: string; product_name: string; quantity: number }>) {
    const arr = itemsByGroup.get(it.order_group_id) ?? []
    arr.push({ product_name: it.product_name, quantity: it.quantity })
    itemsByGroup.set(it.order_group_id, arr)
  }
  const data: GroupRow[] = groups.map((g) => ({
    ...g,
    shop_orders: ordersById.get(g.order_id) ?? null,
    shop_order_items: itemsByGroup.get(g.id) ?? null,
  }))
  const error = null

  return (
    <div>
      <div className="mb-6">
        <div className="text-[10px] tracking-[0.3em] text-neutral-500">
          {ctx.currentBrand.brandName}
        </div>
        <h1 className="mt-1 text-2xl font-semibold">注文管理</h1>
        <div className="mt-2 text-[11px] text-neutral-500">
          ブランドが含まれる注文 (最大 100 件、新しい順)
        </div>
      </div>

      {error ? (
        <div className="text-sm text-red-600">注文一覧の取得に失敗しました。</div>
      ) : !data || data.length === 0 ? (
        <div className="text-sm text-neutral-500">まだ注文はありません。</div>
      ) : (
        <div className="border border-neutral-200 rounded-xl bg-white overflow-hidden">
          {data.map((g, i) => (
            <Link
              key={g.id}
              href={`/brand-admin/orders/${g.id}`}
              className={
                'flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 ' +
                (i > 0 ? 'border-t border-neutral-200' : '')
              }
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusPill status={g.fulfillment_status} />
                  {g.fulfillment_status === 'shipped' && (g.shop_orders?.receipt_status === 'received' || g.shop_orders?.receipt_status === 'auto_completed') && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {g.shop_orders.receipt_status === 'received' ? '受取完了' : '取引完了 (自動)'}
                    </span>
                  )}
                  {g.fulfillment_status === 'shipped' && g.shop_orders?.receipt_status === 'issue_reported' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      問題報告あり
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-neutral-500">
                    {g.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className="mt-1 text-sm font-semibold text-neutral-900 truncate">
                  {productSummary(g.shop_order_items)}
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500">
                  {formatDate(g.created_at)} · {g.shop_orders?.shipping_name ?? '—'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold font-mono">
                  ¥{(g.subtotal_amount + g.shipping_amount).toLocaleString('ja-JP')}
                </div>
                <div className="text-[10px] text-neutral-500 mt-1">›</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function productSummary(items: GroupRow['shop_order_items']): string {
  const arr = items ?? []
  if (arr.length === 0) return '(商品情報なし)'
  const first = arr[0]
  if (arr.length === 1) return `${first.product_name} × ${first.quantity}`
  return `${first.product_name} 他 ${arr.length - 1} 点`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}/${m}/${day} ${hh}:${mm}`
}

export function StatusPill({ status }: { status: string }) {
  const label = statusLabel(status)
  const [bg, text] = statusColor(status)
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${bg} ${text}`}>
      {label}
    </span>
  )
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'unfulfilled':
      return '発送前'
    case 'preparing':
      return '発送準備中'
    case 'shipped':
      return '発送済み'
    case 'delivered':
      return '配達完了'
    case 'cancelled':
      return 'キャンセル'
    default:
      return status
  }
}

function statusColor(status: string): [string, string] {
  switch (status) {
    case 'unfulfilled':
      return ['bg-neutral-100', 'text-neutral-700']
    case 'preparing':
      return ['bg-amber-100', 'text-amber-800']
    case 'shipped':
      return ['bg-blue-100', 'text-blue-800']
    case 'delivered':
      return ['bg-emerald-100', 'text-emerald-800']
    case 'cancelled':
      return ['bg-neutral-100', 'text-neutral-500']
    default:
      return ['bg-neutral-100', 'text-neutral-700']
  }
}
