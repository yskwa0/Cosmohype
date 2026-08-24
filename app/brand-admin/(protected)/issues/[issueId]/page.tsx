import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBrandAdminContext } from '@/lib/brandAdmin'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { formatJSTDateTime } from '@/lib/brandAdminDate'
import {
  IssueStatusPill,
  RefundStatusPill,
  issueStatusLabel,
  issueTypeLabel,
  rejectionReasonLabel,
} from '../page'
import {
  startIssueReviewAction,
  approveIssueAction,
  rejectIssueAction,
  initiateIssueRefundAction,
} from '../actions'
import ReceiveAndRefundForm from '@/components/brand-admin/ReceiveAndRefundForm'
import IssueDecisionForm from '@/components/brand-admin/IssueDecisionForm'
import ConfirmSubmitButton from '@/components/brand-admin/ConfirmSubmitButton'
import { pressableClass } from '@/lib/brandAdminUi'
import { NavPendingSpinner } from '@/components/brand-admin/NavPendingSpinner'

export const dynamic = 'force-dynamic'

interface IssueDetail {
  id: string
  order_id: string
  order_item_id: string
  user_id: string
  brand_id: string
  issue_type: string
  description: string
  status: string
  reviewed_at: string | null
  reviewed_by: string | null
  rejection_reason: string | null
  resolution_note: string | null
  return_carrier: string | null
  return_tracking_number: string | null
  returned_at: string | null
  return_received_at: string | null
  refund_status: string | null
  stripe_refund_id: string | null
  refund_amount: number | null
  refund_requested_at: string | null
  refunded_at: string | null
  created_at: string
  updated_at: string
}
interface BrandReturnAddress {
  return_recipient_name: string | null
  return_postal_code: string | null
  return_prefecture: string | null
  return_city: string | null
  return_address_line1: string | null
  return_address_line2: string | null
  return_phone: string | null
}

interface OrderItemInfo {
  id: string
  product_name: string
  quantity: number
  unit_price: number
  size: string | null
  color_name: string | null
}
interface OrderInfo {
  id: string
  shipping_name: string
  shipping_postal_code: string
  shipping_prefecture: string
  shipping_city: string
  shipping_address_line1: string
  shipping_address_line2: string | null
  created_at: string
}
interface IssueImageRow {
  id: string
  storage_path: string
  sort_order: number
}

export default async function BrandAdminIssueDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ issueId: string }>
  searchParams: Promise<{ err?: string }>
}) {
  const { issueId } = await params
  const { err } = await searchParams
  if (!/^[0-9a-fA-F-]{36}$/.test(issueId)) notFound()

  const ctx = await getBrandAdminContext()
  const supabase = await createClient()

  type LooseFrom = {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          eq: (c: string, v: string) => {
            maybeSingle: () => Promise<{ data: IssueDetail | null; error: { message: string } | null }>
          }
        }
      }
    }
  }
  const loose = supabase as unknown as LooseFrom

  const issueRes = await loose
    .from('shop_order_issues')
    .select(
      'id, order_id, order_item_id, user_id, brand_id, issue_type, description, status, reviewed_at, reviewed_by, rejection_reason, resolution_note, return_carrier, return_tracking_number, returned_at, return_received_at, refund_status, stripe_refund_id, refund_amount, refund_requested_at, refunded_at, created_at, updated_at'
    )
    .eq('id', issueId)
    .eq('brand_id', ctx.currentBrand.brandId)
    .maybeSingle()
  if (issueRes.error) {
    console.error('[brand-admin/issues/[id]] issue fetch failed', issueRes.error)
    return <FailBanner detail={issueRes.error.message} />
  }
  if (!issueRes.data) notFound()
  const issue = issueRes.data

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/brand-admin/issues"
          className={'inline-flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-neutral-800 ' + pressableClass}
        >
          ← 商品トラブル 一覧
          <NavPendingSpinner size={10} />
        </Link>
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <IssueStatusPill status={issue.status} />
          <RefundStatusPill refundStatus={issue.refund_status} />
          <span className="text-[11px] font-mono text-neutral-500">
            {issue.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
        {issue.refund_status === 'succeeded' && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="text-[11px] font-bold text-emerald-800">返金完了</div>
            <div className="mt-0.5 text-[13px] font-semibold text-emerald-900">
              返金額: ¥{(issue.refund_amount ?? 0).toLocaleString('ja-JP')}
            </div>
            {issue.refunded_at && (
              <div className="text-[11px] text-emerald-800">
                返金日時: {formatJSTDateTime(issue.refunded_at)}
              </div>
            )}
            {issue.stripe_refund_id && (
              <div className="mt-0.5 text-[10px] font-mono text-emerald-700 break-all">
                Stripe refund: {issue.stripe_refund_id}
              </div>
            )}
          </div>
        )}
        <h1 className="mt-2 text-xl font-semibold">
          {issueTypeLabel(issue.issue_type)}
        </h1>
        <div className="mt-1 text-[11px] text-neutral-500">
          報告日時: {formatJSTDateTime(issue.created_at)}
        </div>
      </div>

      {err && (
        <div className="mb-6 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {errorMessage(err)}
        </div>
      )}

      {/* issue.description のみで完結する部分は即描画 */}
      <div className="mb-6">
        <Card title="購入者からの説明">
          <div className="text-[13px] whitespace-pre-wrap text-neutral-800">
            {issue.description}
          </div>
        </Card>
      </div>

      {/* order / item / images / signed URLs / brand return は Suspense 内で並列 fetch */}
      <Suspense fallback={<IssueRelatedSkeleton />}>
        <IssueRelated issue={issue} />
      </Suspense>
    </div>
  )
}

// -----------------------------------------------------------------------------
// issue 派生情報 (order + item + images + signed URLs + brand return) を並列 fetch し、
// 対象商品カード / 購入者カード / 証拠写真 / 審査結果 / 操作導線を描画
// -----------------------------------------------------------------------------
async function IssueRelated({ issue }: { issue: IssueDetail }) {
  const supabase = await createClient()
  // 証拠画像 (issue-evidence bucket) は storage RLS 未整備のため signed URL 発行を
  // service_role (createAdminClient) で行う。 これは Dev Bypass ではなく Production
  // の恒常運用に必要な admin client 経路 (storage 権限 gap 対応)。
  const adminForSigned = createAdminClient()
  type LooseFrom = {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          maybeSingle: () => Promise<{
            data: OrderItemInfo | OrderInfo | null
            error: { message: string } | null
          }>
          order: (c: string, o: { ascending: boolean }) => Promise<{
            data: IssueImageRow[] | null
            error: { message: string } | null
          }>
        }
      }
    }
  }
  const loose = supabase as unknown as LooseFrom

  const needBrandReturn = issue.status === 'approved' || issue.status === 'return_in_progress' || issue.status === 'resolved'
  const brandReturnQuery: Promise<{ data: BrandReturnAddress | null; error: unknown }> = needBrandReturn
    ? (adminForSigned as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (c: string, v: string) => {
              maybeSingle: () => Promise<{ data: BrandReturnAddress | null; error: unknown }>
            }
          }
        }
      })
        .from('shop_brands')
        .select('return_recipient_name, return_postal_code, return_prefecture, return_city, return_address_line1, return_address_line2, return_phone')
        .eq('id', issue.brand_id)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const [orderRes, itemRes, imagesRes, brandRes] = await Promise.all([
    loose
      .from('shop_orders')
      .select(
        'id, shipping_name, shipping_postal_code, shipping_prefecture, shipping_city, shipping_address_line1, shipping_address_line2, created_at'
      )
      .eq('id', issue.order_id)
      .maybeSingle(),
    loose
      .from('shop_order_items')
      .select('id, product_name, quantity, unit_price, size, color_name')
      .eq('id', issue.order_item_id)
      .maybeSingle(),
    loose
      .from('shop_order_issue_images')
      .select('id, storage_path, sort_order')
      .eq('issue_id', issue.id)
      .order('sort_order', { ascending: true }),
    brandReturnQuery,
  ])
  if (orderRes.error) console.error('[brand-admin/issues/[id]] order fetch failed', orderRes.error)
  if (itemRes.error) console.error('[brand-admin/issues/[id]] item fetch failed', itemRes.error)
  if (imagesRes.error) console.error('[brand-admin/issues/[id]] images fetch failed', imagesRes.error)

  const order = (orderRes.data as OrderInfo | null) ?? null
  const item = (itemRes.data as OrderItemInfo | null) ?? null
  const images = (imagesRes.data as IssueImageRow[]) ?? []
  const brandReturn = brandRes.data ?? null

  const signedResults = await Promise.all(
    images.map((img) =>
      (adminForSigned as unknown as {
        storage: {
          from: (b: string) => {
            createSignedUrl: (path: string, ttl: number) => Promise<{
              data: { signedUrl: string } | null
              error: unknown
            }>
          }
        }
      }).storage
        .from('shop-order-issue-images')
        .createSignedUrl(img.storage_path, 300)
    )
  )
  const signedImageUrls: string[] = signedResults
    .map((s) => s.data?.signedUrl)
    .filter((u): u is string => typeof u === 'string')

  const decided = issue.status === 'approved' || issue.status === 'rejected'
  const canReview = issue.status === 'submitted'
  const canDecide = issue.status === 'under_review'
  const canReceiveAndRefund = issue.status === 'return_in_progress' && issue.returned_at != null

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="対象商品">
          {item ? (
            <div>
              <div className="text-sm font-semibold">{item.product_name}</div>
              <div className="mt-1 text-[11px] text-neutral-500 flex gap-2">
                {item.size && <span>{item.size}</span>}
                {item.color_name && <span>{item.color_name}</span>}
                <span>× {item.quantity}</span>
                <span className="font-mono">¥{item.unit_price.toLocaleString('ja-JP')}</span>
              </div>
              <div className="mt-2 text-[10px] font-mono text-neutral-400">
                注文 {issue.order_id.slice(0, 8).toUpperCase()}
              </div>
            </div>
          ) : (
            <div className="text-[12px] text-neutral-500">対象商品情報の取得に失敗しました</div>
          )}
        </Card>

        <Card title="購入者">
          {order ? (
            <div>
              <div className="text-sm font-semibold">{order.shipping_name}</div>
              <div className="mt-1 text-[11px] text-neutral-500">
                〒{order.shipping_postal_code}
              </div>
              <div className="mt-0.5 text-[12px]">
                {order.shipping_prefecture}
                {order.shipping_city}
                {order.shipping_address_line1}
              </div>
              {order.shipping_address_line2 && (
                <div className="text-[12px]">{order.shipping_address_line2}</div>
              )}
            </div>
          ) : (
            <div className="text-[12px] text-neutral-500">注文情報の取得に失敗しました</div>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title={`証拠写真 (${signedImageUrls.length})`}>
          {signedImageUrls.length === 0 ? (
            <div className="text-[12px] text-neutral-500">写真がありません</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {signedImageUrls.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block aspect-square bg-neutral-100 rounded overflow-hidden"
                >
                  {/* signed URL は 5 分で expire */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="issue evidence" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          )}
          <div className="mt-2 text-[10px] text-neutral-500">
            signed URL: 5 分で失効。長時間離席後に見えなくなったら画面再読込。
          </div>
        </Card>
      </div>

      {decided && (
        <div className="mt-6">
          <Card title="審査結果">
            <div className="text-[12px] text-neutral-700 space-y-1">
              <div>状態: <span className="font-semibold">{issueStatusLabel(issue.status)}</span></div>
              {issue.reviewed_at && <div>審査日時: {formatJSTDateTime(issue.reviewed_at)}</div>}
              {issue.status === 'rejected' && issue.rejection_reason && (
                <div>却下理由: {rejectionReasonLabel(issue.rejection_reason)}</div>
              )}
              {issue.resolution_note && (
                <div>
                  <div className="text-[11px] font-semibold text-neutral-600 mt-2">
                    ブランドコメント
                  </div>
                  <div className="mt-0.5 whitespace-pre-wrap">{issue.resolution_note}</div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {(canReview || canDecide) && (
        <div className="mt-8 border-t border-neutral-200 pt-6">
          <div className="text-[10px] tracking-widest text-neutral-500 mb-3">REVIEW</div>
          {canReview && (
            <form action={startIssueReviewAction}>
              <input type="hidden" name="issue_id" value={issue.id} />
              <ConfirmSubmitButton
                label="審査を開始する"
                confirmMessage="この報告の審査を開始しますか？"
                primary
              />
            </form>
          )}
          {canDecide && (
            <IssueDecisionForm
              issueId={issue.id}
              approveAction={approveIssueAction}
              rejectAction={rejectIssueAction}
            />
          )}
        </div>
      )}

      {/* Phase 4: 返品対応セクション (approved / return_in_progress / resolved) */}
      {(issue.status === 'approved'
        || issue.status === 'return_in_progress'
        || issue.status === 'resolved') && (
        <div className="mt-8 border-t border-neutral-200 pt-6">
          <div className="text-[10px] tracking-widest text-neutral-500 mb-3">RETURN & REFUND</div>

          {brandReturn && (
            <div className="rounded-xl border border-neutral-200 bg-white p-5 mb-4">
              <div className="text-[10px] tracking-widest text-neutral-500 mb-2">返品先住所</div>
              <div className="text-sm font-semibold">{brandReturn.return_recipient_name ?? '—'}</div>
              <div className="text-[11px] text-neutral-500 mt-1">〒{brandReturn.return_postal_code ?? '—'}</div>
              <div className="text-[12px]">
                {brandReturn.return_prefecture}
                {brandReturn.return_city}
                {brandReturn.return_address_line1}
              </div>
              {brandReturn.return_address_line2 && (
                <div className="text-[12px]">{brandReturn.return_address_line2}</div>
              )}
              <div className="text-[11px] font-mono text-neutral-500 mt-0.5">
                {brandReturn.return_phone ?? '—'}
              </div>
            </div>
          )}

          {issue.status === 'approved' && (
            <div className="text-[12px] text-neutral-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              購入者が商品を返送すると、追跡番号がここに表示されます。
            </div>
          )}

          {(issue.status === 'return_in_progress' || issue.status === 'resolved') && issue.returned_at && (
            <div className="rounded-xl border border-neutral-200 bg-white p-5 mb-4">
              <div className="text-[10px] tracking-widest text-neutral-500 mb-2">返送情報</div>
              <div className="text-[12px] text-neutral-700">
                <div>配送業者: {carrierLabel(issue.return_carrier)}</div>
                <div>追跡番号: <span className="font-mono">{issue.return_tracking_number ?? '—'}</span></div>
                <div>返送日時: {formatJSTDateTime(issue.returned_at)}</div>
                {issue.return_received_at && (
                  <div>ブランド受領日時: {formatJSTDateTime(issue.return_received_at)}</div>
                )}
              </div>
            </div>
          )}

          {canReceiveAndRefund && issue.refund_status !== 'succeeded' && (
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="text-[10px] tracking-widest text-neutral-500 mb-2">ブランド受領 + 全額返金</div>
              {issue.refund_status === 'scope_conflict' && (
                <div className="mb-3 text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  この注文は複数商品を含むため、Stripe 上 partial refund になります。
                  本プロジェクトの部分返金なし方針により、Stripe 自動返金を停止しました。
                  Cosmohype 運営に手動対応を依頼してください。
                </div>
              )}
              {issue.refund_status === 'failed' && (
                <div className="mb-3 text-[12px] text-red-800 bg-red-50 border border-red-200 rounded px-3 py-2">
                  返金処理に失敗しました。時間をおいて再試行するか運営にお問い合わせください。
                </div>
              )}
              <ReceiveAndRefundForm
                issueId={issue.id}
                action={initiateIssueRefundAction}
                disabled={issue.refund_status === 'scope_conflict' || issue.refund_status === 'pending'}
              />
              {issue.refund_status === 'pending' && (
                <div className="mt-3 text-[11px] text-neutral-600">
                  Stripe 返金処理中… 完了は webhook で確定します。
                </div>
              )}
            </div>
          )}

          {issue.status === 'resolved' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="text-[11px] font-bold text-emerald-800">返品・返金 完了</div>
              <div className="mt-1 text-[12px] text-emerald-800">
                返金額: ¥{(issue.refund_amount ?? 0).toLocaleString('ja-JP')}
              </div>
              {issue.refunded_at && (
                <div className="text-[11px] text-emerald-700 mt-0.5">
                  返金日時: {formatJSTDateTime(issue.refunded_at)}
                </div>
              )}
              {issue.stripe_refund_id && (
                <div className="text-[10px] font-mono text-emerald-700 mt-0.5 break-all">
                  refund id: {issue.stripe_refund_id}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}

function IssueRelatedSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-2">
          <div className="h-3 w-16 bg-neutral-200 rounded" />
          <div className="h-4 w-3/4 bg-neutral-100 rounded" />
          <div className="h-3 w-1/2 bg-neutral-100 rounded" />
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-2">
          <div className="h-3 w-16 bg-neutral-200 rounded" />
          <div className="h-4 w-2/3 bg-neutral-100 rounded" />
          <div className="h-3 w-1/3 bg-neutral-100 rounded" />
        </div>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="h-3 w-20 bg-neutral-200 rounded mb-3" />
        <div className="grid grid-cols-3 gap-3">
          <div className="aspect-square bg-neutral-100 rounded" />
          <div className="aspect-square bg-neutral-100 rounded" />
          <div className="aspect-square bg-neutral-100 rounded" />
        </div>
      </div>
    </div>
  )
}

function carrierLabel(v: string | null): string {
  switch (v) {
    case 'yamato':     return 'ヤマト運輸'
    case 'sagawa':     return '佐川急便'
    case 'japan_post': return '日本郵便'
    case 'other':      return 'その他'
    default:           return '—'
  }
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
function FailBanner({ detail }: { detail: string }) {
  return (
    <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 whitespace-pre-wrap break-words">
      詳細の取得に失敗しました: {detail}
    </div>
  )
}

function errorMessage(code: string): string {
  switch (code) {
    case 'invalid_rejection_reason': return '却下理由を選択してください。'
    case 'issue_not_found':          return '報告が見つからないか、権限がありません。'
    case 'update_failed':            return '更新に失敗しました。時間をおいて再度お試しください。'
    case 'receipt_reset_failed':     return '状態更新後の receipt_status 復元に失敗しました。'
    case 'lookup_failed':            return '報告情報の取得に失敗しました。'
    default:
      if (code.startsWith('invalid_status_transition')) {
        return '報告の状態が変更されています。ページを更新してください。'
      }
      return `処理に失敗しました。(${code})`
  }
}
