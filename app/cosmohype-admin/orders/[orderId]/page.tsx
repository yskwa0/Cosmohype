import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCosmohypeAdminContext } from '@/lib/cosmohypeAdmin'

export const dynamic = 'force-dynamic'

/**
 * Cosmohype 運営者向け 注文詳細 (Phase D、read-only)。
 *
 * データ源: shop_admin_get_order_detail(p_order_id) SECURITY DEFINER RPC。
 * jsonb 応答を order / buyer / groups / items / issues に分解して表示。
 *
 * DELIVERY & RETURN セクションは Phase B snapshot 列を表示 (現在の brand 設定ではない)。
 * 個人情報は本ページ内でのみ表示 — URL / log / console に絶対に出さない。
 */

// ── jsonb 応答の型定義 (RPC の返却形状と一致) ──
interface OrderJson {
  id: string
  created_at: string
  updated_at: string
  status: string
  payment_status: string
  fulfillment_status: string
  currency: string
  subtotal_amount: number
  shipping_amount: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  shipping_name: string
  shipping_postal_code: string
  shipping_prefecture: string
  shipping_city: string
  shipping_address_line1: string
  shipping_address_line2: string | null
  shipping_phone: string
  shipping_country_code: string
  stripe_payment_intent_id: string | null
  user_id: string
}
interface BuyerJson {
  id: string
  username: string | null
  display_name: string | null
  email: string | null
}
interface GroupJson {
  id: string
  brand_id: string
  brand_name: string
  subtotal_amount: number
  shipping_amount: number
  discount_amount: number
  fulfillment_status: string
  tracking_carrier: string | null
  tracking_number: string | null
  shipped_at: string | null
  delivered_at: string | null
  snapshot_dispatch_lead_days: number | null
  snapshot_return_accepted: boolean | null
  snapshot_return_days: number | null
  snapshot_exchange_accepted: boolean | null
  snapshot_return_policy_note: string | null
}
interface ItemJson {
  id: string
  order_group_id: string
  product_id: string
  variant_id: string
  brand_id: string
  product_name: string
  brand_name: string
  sku: string
  size: string | null
  color_name: string | null
  unit_price: number
  quantity: number
  line_total: number
}
interface IssueJson {
  id: string
  order_item_id: string
  issue_type: string
  status: string
  created_at: string
}
interface DetailJson {
  order: OrderJson
  buyer: BuyerJson | null
  groups: GroupJson[]
  items: ItemJson[]
  issues: IssueJson[]
}

function formatYen(v: number, currency: string): string {
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

function formatSnapshot(g: GroupJson): string {
  const any = g.snapshot_dispatch_lead_days !== null
    || g.snapshot_return_accepted !== null
    || g.snapshot_return_days !== null
    || g.snapshot_exchange_accepted !== null
    || (g.snapshot_return_policy_note !== null && g.snapshot_return_policy_note.length > 0)
  if (!any) return '(購入時のポリシー snapshot なし)'
  const lines: string[] = []
  if (g.snapshot_dispatch_lead_days !== null) {
    lines.push(`発送: 通常 ${g.snapshot_dispatch_lead_days} 日以内`)
  }
  if (g.snapshot_return_accepted === true) {
    lines.push(
      g.snapshot_return_days !== null
        ? `返品: 商品到着後 ${g.snapshot_return_days} 日以内`
        : '返品: 受付'
    )
  } else if (g.snapshot_return_accepted === false) {
    lines.push('返品: 対応なし')
  }
  if (g.snapshot_exchange_accepted === true)  lines.push('交換: 対応')
  else if (g.snapshot_exchange_accepted === false) lines.push('交換: 対応なし')
  if (g.snapshot_return_policy_note && g.snapshot_return_policy_note.length > 0) {
    lines.push(g.snapshot_return_policy_note)
  }
  return lines.join('\n')
}

function errorLabel(code: string): string {
  switch (code) {
    case 'forbidden':         return '運営者権限が必要です。'
    case 'not_authenticated': return '認証情報が失われました。再ログインしてください。'
    case 'order_not_found':   return '対象の注文が見つかりませんでした。'
    case 'order_id_required': return '注文 ID を指定してください。'
    default:                  return `注文詳細の取得に失敗しました (${code})`
  }
}

function mapRpcErrorToCode(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('forbidden'))         return 'forbidden'
  if (lower.includes('not_authenticated')) return 'not_authenticated'
  if (lower.includes('order_not_found'))   return 'order_not_found'
  if (lower.includes('order_id_required')) return 'order_id_required'
  return 'unknown'
}

export default async function CosmohypeAdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  await getCosmohypeAdminContext()

  const { orderId } = await params
  // UUID 形式チェック — 不正 URL では即エラー表示 (RPC を叩かない)
  const isValidUuid = /^[0-9a-fA-F-]{36}$/.test(orderId)
  if (!isValidUuid) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {errorLabel('order_id_required')}
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  // deno-lint-ignore no-explicit-any
  const loose = supabase as unknown as any

  const { data, error } = await loose.rpc('shop_admin_get_order_detail', {
    p_order_id: orderId,
  })

  if (error) {
    const code = mapRpcErrorToCode(error.message ?? '')
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {errorLabel(code)}
        </div>
      </div>
    )
  }

  const d = data as DetailJson
  const o = d.order

  // group ごとの item を pre-group して表示 (複数ブランド注文で正しく分ける)
  const itemsByGroup = new Map<string, ItemJson[]>()
  for (const it of d.items) {
    const arr = itemsByGroup.get(it.order_group_id) ?? []
    arr.push(it)
    itemsByGroup.set(it.order_group_id, arr)
  }

  return (
    <div className="space-y-6">
      <BackLink />

      <div>
        <div className="text-[10px] font-bold tracking-widest text-neutral-500">ORDER</div>
        <h1 className="text-xl font-semibold text-neutral-900 font-mono break-all">{o.id}</h1>
        <div className="mt-1 text-[12px] text-neutral-500">作成: {formatDT(o.created_at)} / 更新: {formatDT(o.updated_at)}</div>
      </div>

      {/* ステータス */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusCell label="status" value={o.status} />
        <StatusCell label="payment_status" value={o.payment_status} />
        <StatusCell label="fulfillment_status" value={o.fulfillment_status} />
      </section>

      {/* 購入者 (個人情報を含むため運営者専用) */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900 mb-3">購入者</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
          <Kv label="user_id" value={o.user_id} mono />
          <Kv label="email" value={d.buyer?.email ?? '-'} mono />
          <Kv label="username" value={d.buyer?.username ?? '-'} />
          <Kv label="display_name" value={d.buyer?.display_name ?? '-'} />
        </div>
      </section>

      {/* 配送先 (運営サポート対応で必要) */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900 mb-3">配送先</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
          <Kv label="宛名" value={o.shipping_name} />
          <Kv label="電話" value={o.shipping_phone} mono />
          <Kv label="国" value={o.shipping_country_code} mono />
          <Kv label="郵便番号" value={o.shipping_postal_code} mono />
          <Kv label="住所"
              value={`${o.shipping_prefecture}${o.shipping_city}${o.shipping_address_line1}${o.shipping_address_line2 ? ' ' + o.shipping_address_line2 : ''}`} />
        </div>
      </section>

      {/* 金額 (すべて DB order 値、client 再計算なし) */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900 mb-3">金額</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[13px]">
          <Kv label="小計"   value={formatYen(o.subtotal_amount, o.currency)} mono />
          <Kv label="送料"   value={formatYen(o.shipping_amount, o.currency)} mono />
          <Kv label="税"     value={formatYen(o.tax_amount, o.currency)} mono />
          <Kv label="割引"   value={`-${formatYen(o.discount_amount, o.currency)}`} mono />
          <Kv label="合計"   value={formatYen(o.total_amount, o.currency)} mono />
          <Kv label="通貨"   value={o.currency} />
          <Kv label="Stripe PI" value={o.stripe_payment_intent_id ?? '-'} mono />
        </div>
      </section>

      {/* ブランドグループごとの内訳 (複数 brand 注文はここで分割表示) */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900">ブランドグループ</h2>
        {d.groups.length === 0 && (
          <div className="text-[12px] text-neutral-500">このオーダーに group がありません。</div>
        )}
        {d.groups.map((g) => {
          const gItems = itemsByGroup.get(g.id) ?? []
          return (
            <div key={g.id} className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <div>
                  <div className="text-[10px] font-bold tracking-widest text-neutral-500">BRAND</div>
                  <div className="text-base font-semibold text-neutral-900">{g.brand_name}</div>
                  <div className="text-[10px] text-neutral-500 font-mono">{g.brand_id}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-neutral-500">fulfillment_status</div>
                  <div className="text-[12px] font-semibold text-neutral-900">{g.fulfillment_status}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
                <Kv label="小計"     value={formatYen(g.subtotal_amount, o.currency)} mono />
                <Kv label="送料"     value={formatYen(g.shipping_amount, o.currency)} mono />
                <Kv label="tracking" value={g.tracking_carrier ? `${g.tracking_carrier} / ${g.tracking_number ?? '-'}` : '(未発送)'} />
                <Kv label="shipped_at" value={formatDT(g.shipped_at)} />
                <Kv label="delivered_at" value={formatDT(g.delivered_at)} />
              </div>

              {/* 商品明細 */}
              <div>
                <div className="text-[11px] font-semibold text-neutral-500 mb-2">商品</div>
                <table className="w-full text-[12px]">
                  <thead className="text-[10px] text-neutral-500 border-b border-neutral-200">
                    <tr>
                      <th className="text-left py-1.5 px-2">商品名</th>
                      <th className="text-left py-1.5 px-2">variant</th>
                      <th className="text-right py-1.5 px-2">単価</th>
                      <th className="text-right py-1.5 px-2">数量</th>
                      <th className="text-right py-1.5 px-2">小計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gItems.map((it) => (
                      <tr key={it.id} className="border-b border-neutral-100">
                        <td className="py-1.5 px-2 text-neutral-900">{it.product_name}
                          <div className="text-[10px] text-neutral-500 font-mono">sku: {it.sku}</div>
                        </td>
                        <td className="py-1.5 px-2 text-neutral-700">
                          {[it.color_name, it.size].filter(Boolean).join(' · ') || '-'}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono">{formatYen(it.unit_price, o.currency)}</td>
                        <td className="py-1.5 px-2 text-right">× {it.quantity}</td>
                        <td className="py-1.5 px-2 text-right font-mono">{formatYen(it.line_total, o.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 購入時 snapshot (Phase B) — 現在の brand 設定ではなく購入時の値 */}
              <div className="rounded border border-neutral-100 bg-neutral-50 p-3">
                <div className="text-[10px] font-bold tracking-widest text-neutral-500 mb-1">
                  DELIVERY &amp; RETURN (購入時 snapshot)
                </div>
                <div className="text-[12px] text-neutral-800 whitespace-pre-line">
                  {formatSnapshot(g)}
                </div>
                <div className="mt-1 text-[10px] text-neutral-500">
                  ※ この内容は購入時点で保存されたもので、その後のブランド設定変更に影響されません。
                </div>
              </div>
            </div>
          )
        })}
      </section>

      {/* issues */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900 mb-3">
          関連 issue ({d.issues.length})
        </h2>
        {d.issues.length === 0 ? (
          <div className="text-[12px] text-neutral-500">この注文に関する issue はありません。</div>
        ) : (
          <table className="w-full text-[12px]">
            <thead className="text-[10px] text-neutral-500 border-b border-neutral-200">
              <tr>
                <th className="text-left py-1.5 px-2">issue id</th>
                <th className="text-left py-1.5 px-2">type</th>
                <th className="text-left py-1.5 px-2">status</th>
                <th className="text-left py-1.5 px-2">created_at</th>
                <th className="text-left py-1.5 px-2">対象 item</th>
              </tr>
            </thead>
            <tbody>
              {d.issues.map((iss) => (
                <tr key={iss.id} className="border-b border-neutral-100">
                  <td className="py-1.5 px-2 font-mono text-neutral-700">{iss.id.slice(0, 8)}…</td>
                  <td className="py-1.5 px-2">{iss.issue_type}</td>
                  <td className="py-1.5 px-2">{iss.status}</td>
                  <td className="py-1.5 px-2 font-mono">{formatDT(iss.created_at)}</td>
                  <td className="py-1.5 px-2 font-mono text-neutral-500">{iss.order_item_id.slice(0, 8)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

function BackLink() {
  return (
    <div>
      <Link href="/cosmohype-admin/orders" className="text-[12px] text-neutral-600 hover:text-neutral-900">
        ← 注文一覧へ戻る
      </Link>
    </div>
  )
}

function StatusCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-widest text-neutral-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-neutral-900">{value}</div>
    </div>
  )
}

function Kv({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-neutral-500">{label}</div>
      <div className={`mt-0.5 text-[13px] text-neutral-800 ${mono ? 'font-mono break-all' : 'break-words'}`}>
        {value}
      </div>
    </div>
  )
}
