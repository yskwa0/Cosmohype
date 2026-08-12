import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBrandAdminContext, isBrandAdminDevBypassEnabled } from '@/lib/brandAdmin'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  StatusPill,
  statusLabel,
} from '../page'
import {
  startFulfillmentAction,
  markShippedAction,
} from '../actions'
import ShipForm from '@/components/brand-admin/ShipForm'
import ConfirmSubmitButton from '@/components/brand-admin/ConfirmSubmitButton'
import { formatJSTDateTime } from '@/lib/brandAdminDate'

export const dynamic = 'force-dynamic'

interface GroupDetail {
  id: string
  order_id: string
  brand_id: string
  subtotal_amount: number
  shipping_amount: number
  fulfillment_status: string
  tracking_number: string | null
  tracking_carrier: string | null
  shipped_at: string | null
  delivered_at: string | null
  created_at: string
  shop_orders: {
    id: string
    status: string
    payment_status: string
    currency: string
    shipping_name: string
    shipping_postal_code: string
    shipping_prefecture: string
    shipping_city: string
    shipping_address_line1: string
    shipping_address_line2: string | null
    shipping_phone: string
    created_at: string
    receipt_status: string | null
    received_at: string | null
    auto_completed_at: string | null
    delivered_at: string | null
  } | null
  shop_order_items:
    | Array<{
        id: string
        product_name: string
        quantity: number
        unit_price: number
        line_total: number
        size: string | null
        color_name: string | null
      }>
    | null
}

export default async function BrandAdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>
  searchParams: Promise<{ err?: string }>
}) {
  const { groupId } = await params
  const { err } = await searchParams
  if (!/^[0-9a-fA-F-]{36}$/.test(groupId)) notFound()

  const ctx = await getBrandAdminContext()
  const bypass = isBrandAdminDevBypassEnabled()

  if (bypass && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
        Dev Bypass 経路では .env.local に SUPABASE_SERVICE_ROLE_KEY を Test project の service_role key で設定する必要があります。
      </div>
    )
  }
  const supabase = bypass ? createAdminClient() : await createClient()

  // 2 段階 fetch (list 側と同理由: admin/anon で挙動差を排除、原因切り分け容易化)
  type LooseFrom = {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          eq: (c: string, v: string) => {
            maybeSingle: () => Promise<{
              data: Omit<GroupDetail, 'shop_orders' | 'shop_order_items'> | null
              error: { message: string } | null
            }>
          }
          maybeSingle: () => Promise<{
            data: NonNullable<GroupDetail['shop_orders']> | null
            error: { message: string } | null
          }>
        }
        in?: never
      }
    }
  }
  const loose = supabase as unknown as LooseFrom

  const gRes = await loose
    .from('shop_order_groups')
    .select(
      'id, order_id, brand_id, subtotal_amount, shipping_amount, fulfillment_status, tracking_number, tracking_carrier, shipped_at, delivered_at, created_at'
    )
    .eq('id', groupId)
    .eq('brand_id', ctx.currentBrand.brandId)
    .maybeSingle()
  if (gRes.error) {
    console.error('[brand-admin/orders/[groupId]] group fetch failed', gRes.error)
    return (
      <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 whitespace-pre-wrap">
        注文詳細の取得に失敗しました: {gRes.error.message}
      </div>
    )
  }
  if (!gRes.data) notFound()

  // 親注文が「実際に購入確定した」もの (status='placed' かつ payment_status='succeeded')
  // でない場合、URL 直アクセスも含めて Brand Admin では表示しない (notFound)。
  // draft / processing / requires_payment_method / cancelled 等の途中/失敗注文は
  // 監査目的で DB には残るが、通常の注文管理 UI からは操作/閲覧不可とする。
  type OrderGuardRow = { id: string; status: string; payment_status: string }
  const orderGuardRes = await (supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          maybeSingle: () => Promise<{
            data: OrderGuardRow | null
            error: { message: string } | null
          }>
        }
      }
    }
  })
    .from('shop_orders')
    .select('id, status, payment_status')
    .eq('id', gRes.data.order_id)
    .maybeSingle()
  if (orderGuardRes.error) {
    console.error(
      '[brand-admin/orders/[groupId]] order guard fetch failed',
      orderGuardRes.error
    )
    notFound()
  }
  const guard = orderGuardRes.data
  if (!guard || guard.status !== 'placed' || guard.payment_status !== 'succeeded') {
    notFound()
  }

  // group 情報 (fulfillment_status / brand guard / 金額サマリ / 追跡情報) は上で await 済 →
  //   header / breadcrumbs / 金額 / 発送情報カードはこの時点で即描画可能。
  //   order (shipping 情報 / receipt_status / operations 判定) と items (商品カード) の 2 発は
  //   互いに独立で group から派生 key を持つため <Suspense> 内で Promise.all 並列 fetch。
  const g = gRes.data as Omit<GroupDetail, 'shop_orders' | 'shop_order_items'>

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/brand-admin/orders"
          className="text-[11px] text-neutral-500 hover:text-neutral-800"
        >
          ← 注文一覧
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <StatusPill status={g.fulfillment_status} />
          <span className="text-[11px] font-mono text-neutral-500">
            {g.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
        <h1 className="mt-2 text-xl font-semibold">注文詳細</h1>
        <div className="mt-1 text-[11px] text-neutral-500">
          注文日時: {formatJSTDateTime(g.created_at)}
        </div>
      </div>

      {err && (
        <div className="mb-6 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {errorMessage(err)}
        </div>
      )}

      {/* 金額 / 発送情報カード (group のみで完結、即描画) */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card title="ブランド分 金額">
          <div className="text-[11px] text-neutral-500 space-y-0.5">
            <div className="flex justify-between">
              <span>小計</span>
              <span className="font-mono text-neutral-700">
                ¥{g.subtotal_amount.toLocaleString('ja-JP')}
              </span>
            </div>
            <div className="flex justify-between">
              <span>送料</span>
              <span className="font-mono text-neutral-700">
                ¥{g.shipping_amount.toLocaleString('ja-JP')}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-neutral-100 mt-1">
              <span className="font-semibold text-neutral-900">合計</span>
              <span className="font-mono font-semibold text-neutral-900">
                ¥{(g.subtotal_amount + g.shipping_amount).toLocaleString('ja-JP')}
              </span>
            </div>
          </div>
        </Card>

        <Card title="発送情報">
          <div className="text-[11px] text-neutral-500 space-y-1">
            <div>
              現在: <span className="font-semibold text-neutral-900">{statusLabel(g.fulfillment_status)}</span>
            </div>
            {g.shipped_at && <div>発送日時: {formatJSTDateTime(g.shipped_at)}</div>}
            {g.delivered_at && <div>配達日時: {formatJSTDateTime(g.delivered_at)}</div>}
            {g.tracking_carrier && (
              <div>配送業者: {carrierLabel(g.tracking_carrier)}</div>
            )}
            {g.tracking_number && (
              <div>追跡番号: <span className="font-mono">{g.tracking_number}</span></div>
            )}
          </div>
        </Card>
      </div>

      {/* 商品items / 配送先 / 発送操作 は order + items fetch 完了後にストリーミング */}
      <Suspense fallback={<OrderDetailRelatedSkeleton />}>
        <OrderDetailRelated
          loose={loose}
          groupId={g.id}
          orderId={g.order_id}
          fulfillmentStatus={g.fulfillment_status}
        />
      </Suspense>
    </div>
  )
}

// -----------------------------------------------------------------------------
// order + items を並列 fetch し、商品カード / 配送先 / 発送操作を描画
// -----------------------------------------------------------------------------
type LooseFrom = {
  from: (t: string) => {
    select: (s: string) => {
      eq: (c: string, v: string) => {
        eq: (c: string, v: string) => {
          maybeSingle: () => Promise<{
            data: Omit<GroupDetail, 'shop_orders' | 'shop_order_items'> | null
            error: { message: string } | null
          }>
        }
        maybeSingle: () => Promise<{
          data: NonNullable<GroupDetail['shop_orders']> | null
          error: { message: string } | null
        }>
      }
      in?: never
    }
  }
}

async function OrderDetailRelated({
  loose,
  groupId,
  orderId,
  fulfillmentStatus,
}: {
  loose: LooseFrom
  groupId: string
  orderId: string
  fulfillmentStatus: string
}) {
  const [orderRes, itemsRes] = await Promise.all([
    loose
      .from('shop_orders')
      .select(
        'id, status, payment_status, currency, shipping_name, shipping_postal_code, shipping_prefecture, shipping_city, shipping_address_line1, shipping_address_line2, shipping_phone, created_at, receipt_status, received_at, auto_completed_at, delivered_at'
      )
      .eq('id', orderId)
      .maybeSingle(),
    (loose as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (c: string, v: string) => Promise<{
            data: NonNullable<GroupDetail['shop_order_items']> | null
            error: { message: string } | null
          }>
        }
      }
    })
      .from('shop_order_items')
      .select('id, product_name, quantity, unit_price, line_total, size, color_name')
      .eq('order_group_id', groupId),
  ])
  if (orderRes.error) console.error('[brand-admin/orders/[groupId]] order fetch failed', orderRes.error)
  if (itemsRes.error) console.error('[brand-admin/orders/[groupId]] items fetch failed', itemsRes.error)
  const order = orderRes.data ?? null
  const items = (itemsRes.data ?? []) as NonNullable<GroupDetail['shop_order_items']>
  const parentStatus = order?.status ?? ''
  const shippable = !['cancelled', 'cancel_requested', 'refund_required', 'failed'].includes(parentStatus)
  const g = {
    id: groupId,
    fulfillment_status: fulfillmentStatus,
    shop_orders: order,
    shop_order_items: items,
  }

  return (
    <>
      {!shippable && (
        <div className="mb-6 text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          この注文はキャンセル / 返金対応中のため発送操作は行えません
          (親注文状態: {parentStatus})。
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="商品">
          {(g.shop_order_items ?? []).map((it) => (
            <div
              key={it.id}
              className="py-2 border-b border-neutral-100 last:border-b-0"
            >
              <div className="text-sm font-semibold">{it.product_name}</div>
              <div className="mt-0.5 text-[11px] text-neutral-500 flex gap-2">
                {it.size && <span>{it.size}</span>}
                {it.color_name && <span>{it.color_name}</span>}
                <span>× {it.quantity}</span>
              </div>
              <div className="mt-0.5 text-[11px] font-mono text-neutral-700">
                ¥{it.line_total.toLocaleString('ja-JP')}
              </div>
            </div>
          ))}
        </Card>

        <Card title="配送先">
          <div className="text-sm font-semibold">{g.shop_orders?.shipping_name}</div>
          <div className="mt-1 text-[11px] text-neutral-500">
            〒{g.shop_orders?.shipping_postal_code}
          </div>
          <div className="mt-0.5 text-sm">
            {g.shop_orders?.shipping_prefecture}
            {g.shop_orders?.shipping_city}
            {g.shop_orders?.shipping_address_line1}
          </div>
          {g.shop_orders?.shipping_address_line2 && (
            <div className="text-sm">{g.shop_orders.shipping_address_line2}</div>
          )}
          <div className="mt-1 text-[11px] font-mono text-neutral-500">
            {g.shop_orders?.shipping_phone}
          </div>
        </Card>
      </div>

      {shippable && (
        <div className="mt-8 border-t border-neutral-200 pt-6">
          <div className="text-[10px] tracking-widest text-neutral-500 mb-2">
            OPERATIONS
          </div>
          {g.fulfillment_status === 'unfulfilled' && (
            <form action={startFulfillmentAction}>
              <input type="hidden" name="order_group_id" value={g.id} />
              <ConfirmSubmitButton
                label="発送準備を開始する"
                confirmMessage="この注文を発送準備中にしますか？"
                primary
              />
            </form>
          )}
          {g.fulfillment_status === 'preparing' && (
            <ShipForm groupId={g.id} action={markShippedAction} />
          )}
          {g.fulfillment_status === 'shipped' && (() => {
            const rs = g.shop_orders?.receipt_status ?? null
            const receivedAt = g.shop_orders?.received_at
              ? formatJSTDateTime(g.shop_orders.received_at)
              : null
            const autoCompletedAt = g.shop_orders?.auto_completed_at
              ? formatJSTDateTime(g.shop_orders.auto_completed_at)
              : null
            if (rs === 'received') {
              return (
                <div className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 leading-relaxed">
                  <div className="font-semibold">受取完了 (取引完了)</div>
                  {receivedAt && (
                    <div className="mt-1 text-[11px] font-mono">
                      受取確認日時: {receivedAt}
                    </div>
                  )}
                  <div className="mt-1 text-[11px]">
                    購入者が iOS で受取確認を行いました。以降のブランド操作はありません。
                  </div>
                </div>
              )
            }
            if (rs === 'auto_completed') {
              return (
                <div className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 leading-relaxed">
                  <div className="font-semibold">取引完了 (自動)</div>
                  {autoCompletedAt && (
                    <div className="mt-1 text-[11px] font-mono">
                      自動完了日時: {autoCompletedAt}
                    </div>
                  )}
                </div>
              )
            }
            if (rs === 'issue_reported') {
              return (
                <div className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 leading-relaxed">
                  <div className="font-semibold">商品トラブル報告あり</div>
                  <div className="mt-1 text-[11px]">
                    購入者が問題を報告しています。左メニュー「商品トラブル」から確認してください。
                  </div>
                </div>
              )
            }
            // 'ready' / 'waiting' / null → 受取確認待ち
            return (
              <div className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 leading-relaxed">
                発送済み (ブランド側の最終状態)。<br />
                購入者が iOS 側で「商品を受け取りました」を選択すると取引完了になります。
                受取確認は購入者本人のみが行えます。
              </div>
            )
          })()}
          {g.fulfillment_status === 'delivered' && (
            <div className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
              配達完了 (legacy)。以降の操作はありません。
            </div>
          )}
          {g.fulfillment_status === 'cancelled' && (
            <div className="text-[12px] text-neutral-600 bg-neutral-50 border border-neutral-200 rounded px-3 py-2">
              キャンセル済み。操作できません。
            </div>
          )}
        </div>
      )}
    </>
  )
}

function OrderDetailRelatedSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 animate-pulse">
      <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-2">
        <div className="h-3 w-16 bg-neutral-200 rounded" />
        <div className="h-4 w-3/4 bg-neutral-100 rounded" />
        <div className="h-3 w-1/2 bg-neutral-100 rounded" />
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-2">
        <div className="h-3 w-16 bg-neutral-200 rounded" />
        <div className="h-4 w-2/3 bg-neutral-100 rounded" />
        <div className="h-3 w-1/2 bg-neutral-100 rounded" />
        <div className="h-3 w-1/3 bg-neutral-100 rounded" />
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="text-[10px] tracking-widest text-neutral-500 mb-2">
        {title.toUpperCase()}
      </div>
      {children}
    </div>
  )
}

function carrierLabel(v: string): string {
  switch (v) {
    case 'yamato': return 'ヤマト運輸'
    case 'sagawa': return '佐川急便'
    case 'japan_post': return '日本郵便'
    case 'other': return 'その他'
    default: return v
  }
}

function errorMessage(code: string): string {
  switch (code) {
    case 'invalid_carrier':          return '配送業者を選択してください。'
    case 'tracking_number_required': return '追跡番号を入力してください (最大 60 文字)。'
    case 'order_group_not_found':    return '注文が見つからないか、権限がありません。'
    case 'order_not_shippable':      return 'この注文はキャンセル / 返金対応中のため発送できません。'
    case 'update_failed':            return '更新に失敗しました。時間をおいて再度お試しください。'
    case 'recalc_failed':            return '集計処理に失敗しました。ページを更新してください。'
    case 'lookup_failed':            return '注文情報の取得に失敗しました。'
    default:
      if (code.startsWith('invalid_status_transition')) {
        return '注文の状態が変更されています。ページを更新してください。'
      }
      return `処理に失敗しました。(${code})`
  }
}
