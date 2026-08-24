import { Suspense } from 'react'
import Link from 'next/link'
import { getBrandAdminContext } from '@/lib/brandAdmin'
import { createClient } from '@/lib/supabase/server'
import { formatJSTDateTime } from '@/lib/brandAdminDate'
import { pressableClass } from '@/lib/brandAdminUi'
import { NavPendingSpinner } from '@/components/brand-admin/NavPendingSpinner'
import { PressableRowLink } from '@/components/brand-admin/PressableRowLink'

export const dynamic = 'force-dynamic'

interface IssueRow {
  id: string
  order_id: string
  order_item_id: string
  user_id: string
  issue_type: string
  status: string
  created_at: string
  refund_status: string | null
  refund_amount: number | null
  refunded_at: string | null
}

interface OrderItemInfo {
  id: string
  product_name: string
}
interface OrderInfo {
  id: string
  shipping_name: string
}

const FILTERS = [
  { key: 'all',        label: 'すべて',   statuses: ['submitted','under_review','approved','rejected','return_in_progress','resolved'] },
  { key: 'submitted',  label: '未確認',   statuses: ['submitted'] },
  { key: 'reviewing',  label: '審査中',   statuses: ['under_review'] },
  { key: 'approved',   label: '承認済み', statuses: ['approved'] },
  { key: 'returning',  label: '返品中',   statuses: ['return_in_progress'] },
  { key: 'resolved',   label: '解決済み', statuses: ['resolved'] },
  { key: 'rejected',   label: '却下',     statuses: ['rejected'] },
] as const

export default async function BrandAdminIssuesListPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>
}) {
  const ctx = await getBrandAdminContext()

  const sp = await searchParams
  const activeFilter = FILTERS.find((f) => f.key === sp.f) ?? FILTERS[0]

  return (
    <div>
      <div className="mb-6">
        <div className="text-[10px] tracking-[0.3em] text-neutral-500">
          {ctx.currentBrand.brandName}
        </div>
        <h1 className="mt-1 text-2xl font-semibold">商品トラブル</h1>
        <div className="mt-2 text-[11px] text-neutral-500">
          自ブランドに届いた商品問題報告 (新しい順、最大 200 件)
        </div>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === 'all' ? '/brand-admin/issues' : `/brand-admin/issues?f=${f.key}`}
            className={
              'inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full ' +
              (activeFilter.key === f.key
                ? 'bg-neutral-900 text-white'
                : 'border border-neutral-300 text-neutral-700 hover:bg-neutral-100') + ' ' +
              pressableClass
            }
          >
            {f.label}
            <NavPendingSpinner size={10} />
          </Link>
        ))}
      </div>

      <Suspense fallback={<IssueListSkeleton />}>
        <IssueListSection
          brandId={ctx.currentBrand.brandId}
          statuses={[...activeFilter.statuses]}
        />
      </Suspense>
    </div>
  )
}

async function IssueListSection({
  brandId,
  statuses,
}: {
  brandId: string
  statuses: string[]
}) {
  const supabase = await createClient()
  type LooseFrom = {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          in: (c: string, v: string[]) => {
            order: (c: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{
                data: IssueRow[] | null
                error: { message: string } | null
              }>
            }
          }
        }
        in: (c: string, v: string[]) => Promise<{ data: unknown[] | null; error: { message: string } | null }>
      }
    }
  }
  const loose = supabase as unknown as LooseFrom

  const issuesRes = await loose
    .from('shop_order_issues')
    .select('id, order_id, order_item_id, user_id, issue_type, status, created_at, refund_status, refund_amount, refunded_at')
    .eq('brand_id', brandId)
    .in('status', statuses)
    .order('created_at', { ascending: false })
    .limit(200)
  if (issuesRes.error) {
    console.error('[brand-admin/issues] issues fetch failed', issuesRes.error)
    return (
      <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
        一覧の取得に失敗しました: {issuesRes.error.message}
      </div>
    )
  }
  const issues = issuesRes.data ?? []
  const itemIds = Array.from(new Set(issues.map((i) => i.order_item_id)))
  const orderIds = Array.from(new Set(issues.map((i) => i.order_id)))

  const [itemsRes, ordersRes] = await Promise.all([
    itemIds.length > 0
      ? loose.from('shop_order_items').select('id, product_name').in('id', itemIds)
      : Promise.resolve({ data: [], error: null }),
    orderIds.length > 0
      ? loose.from('shop_orders').select('id, shipping_name').in('id', orderIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (itemsRes.error) console.error('[brand-admin/issues] items fetch failed', itemsRes.error)
  if (ordersRes.error) console.error('[brand-admin/issues] orders fetch failed', ordersRes.error)

  const itemsById = new Map<string, OrderItemInfo>()
  for (const i of (itemsRes.data ?? []) as OrderItemInfo[]) itemsById.set(i.id, i)
  const ordersById = new Map<string, OrderInfo>()
  for (const o of (ordersRes.data ?? []) as OrderInfo[]) ordersById.set(o.id, o)

  if (issues.length === 0) {
    return <div className="text-sm text-neutral-500">該当する報告はありません。</div>
  }

  return (
    <div className="border border-neutral-200 rounded-xl bg-white overflow-hidden">
      {issues.map((r, i) => {
        const item = itemsById.get(r.order_item_id)
        const order = ordersById.get(r.order_id)
        return (
          <PressableRowLink
            key={r.id}
            href={`/brand-admin/issues/${r.id}`}
            className={
              'flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 ' +
              (i > 0 ? 'border-t border-neutral-200' : '')
            }
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <IssueStatusPill status={r.status} />
                <RefundStatusPill refundStatus={r.refund_status} />
                <span className="text-[10px] font-mono text-neutral-500">
                  {r.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="mt-1 text-sm font-semibold text-neutral-900 truncate">
                {item?.product_name ?? '(商品名取得失敗)'}
              </div>
              <div className="mt-0.5 text-[11px] text-neutral-500">
                {formatJSTDateTime(r.created_at)} · {issueTypeLabel(r.issue_type)} · {order?.shipping_name ?? '—'}
              </div>
              <div className="mt-0.5 text-[10px] font-mono text-neutral-400">
                注文 {r.order_id.slice(0, 8).toUpperCase()}
              </div>
              {r.refund_status === 'succeeded' && (
                <div className="mt-1 text-[11px] text-emerald-800 font-semibold">
                  返金額 ¥{(r.refund_amount ?? 0).toLocaleString('ja-JP')}
                  {r.refunded_at && (
                    <span className="ml-2 font-normal text-emerald-700">
                      · {formatJSTDateTime(r.refunded_at)}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="text-[10px] text-neutral-500 inline-flex items-center gap-1.5">
              <NavPendingSpinner size={10} />
              <span>›</span>
            </div>
          </PressableRowLink>
        )
      })}
    </div>
  )
}

function IssueListSkeleton() {
  return (
    <div className="border border-neutral-200 rounded-xl bg-white overflow-hidden animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={'flex items-center gap-4 px-5 py-4 ' + (i > 0 ? 'border-t border-neutral-200' : '')}>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-3 w-24 bg-neutral-100 rounded" />
            <div className="h-4 w-3/5 bg-neutral-200 rounded" />
            <div className="h-3 w-2/5 bg-neutral-100 rounded" />
          </div>
          <div className="h-3 w-3 bg-neutral-100 rounded" />
        </div>
      ))}
    </div>
  )
}

// -----------------------------------------------------------------------------

export function IssueStatusPill({ status }: { status: string }) {
  const [bg, text] = issueStatusColor(status)
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${bg} ${text}`}>
      {issueStatusLabel(status)}
    </span>
  )
}

/**
 * 返金状態バッジ (nullable)。none / null は非表示。
 * webhook 反映後の succeeded を最も目立たせる (緑)。pending は進行中 (青)。
 * failed / scope_conflict は運営判断待ち (赤 / 黄)。
 */
export function RefundStatusPill({ refundStatus }: { refundStatus: string | null | undefined }) {
  if (!refundStatus || refundStatus === 'none') return null
  const [bg, text, label] = refundStatusStyle(refundStatus)
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${bg} ${text}`}>
      {label}
    </span>
  )
}
function refundStatusStyle(s: string): [string, string, string] {
  switch (s) {
    case 'pending':        return ['bg-blue-100', 'text-blue-800', '返金処理中']
    case 'succeeded':      return ['bg-emerald-600', 'text-white', '返金完了']
    case 'failed':         return ['bg-red-100', 'text-red-800', '返金失敗']
    case 'scope_conflict': return ['bg-amber-100', 'text-amber-800', '返金保留 (要運営)']
    case 'canceled':       return ['bg-neutral-200', 'text-neutral-700', '返金キャンセル']
    default:               return ['bg-neutral-100', 'text-neutral-700', s]
  }
}

export function issueStatusLabel(s: string): string {
  switch (s) {
    case 'submitted':          return '未確認'
    case 'under_review':       return '審査中'
    case 'approved':           return '承認済み'
    case 'rejected':           return '却下'
    case 'return_in_progress': return '返品進行中'
    case 'resolved':           return '解決済み'
    default:                   return s
  }
}
function issueStatusColor(s: string): [string, string] {
  switch (s) {
    case 'submitted':          return ['bg-red-100', 'text-red-700']
    case 'under_review':       return ['bg-amber-100', 'text-amber-800']
    case 'approved':           return ['bg-emerald-100', 'text-emerald-800']
    case 'rejected':           return ['bg-neutral-200', 'text-neutral-700']
    case 'return_in_progress': return ['bg-blue-100', 'text-blue-800']
    case 'resolved':           return ['bg-neutral-100', 'text-neutral-500']
    default:                   return ['bg-neutral-100', 'text-neutral-700']
  }
}

export function issueTypeLabel(t: string): string {
  switch (t) {
    case 'damaged':                  return '商品が破損している'
    case 'wrong_item':               return '注文と違う商品が届いた'
    case 'wrong_size':               return '注文と違うサイズが届いた'
    case 'wrong_color':              return '注文と違うカラーが届いた'
    case 'differs_from_description': return '商品説明と異なる'
    case 'other_defect':             return 'その他の商品不良'
    default:                         return t
  }
}
export function rejectionReasonLabel(r: string | null | undefined): string {
  switch (r ?? '') {
    case 'defect_not_confirmed':   return '不良を確認できない'
    case 'matches_order':          return '注文内容と一致している'
    case 'customer_preference':    return 'お客様都合に該当'
    case 'insufficient_evidence':  return '証拠が不足している'
    case 'other':                  return 'その他'
    default:                       return ''
  }
}

