import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCosmohypeAdminContext } from '@/lib/cosmohypeAdmin'
import { updateReportStatusAction } from './actions'

export const dynamic = 'force-dynamic'

/**
 * Cosmohype 運営者向け HYPE 商品通報詳細 (Phase E、read + status 更新)。
 *
 * データ源: shop_admin_get_product_report_detail(p_report_id) SECURITY DEFINER RPC。
 * status 更新は Server Action → shop_admin_update_product_report_status。
 *
 * 通報者の email / 住所は取得・表示しない (RPC が返さない、要件 #20)。
 * Phase C の商品管理 (/cosmohype-admin/products?q=<brand id>) への導線を提供する
 * (対象商品を運営停止したい場合の遷移)。
 */

interface ReportJson {
  id: string
  created_at: string
  updated_at: string
  status: string
  reason: string
  details: string | null
  snapshot_product_name: string
  snapshot_brand_name: string
  reviewed_at: string | null
  reviewed_by: null | { id: string; username: string | null; display_name: string | null }
}
interface ReporterJson {
  id: string
  username: string | null
  display_name: string | null
}
interface ProductJson {
  id: string
  name: string
  status: string
  admin_suspended_at: string | null
  brand_id: string
}
interface BrandJson {
  id: string
  name: string
  slug: string
  status: string
}
interface DetailJson {
  report:   ReportJson
  reporter: ReporterJson | null
  product:  ProductJson | null
  brand:    BrandJson | null
}

const REASON_LABEL: Record<string, string> = {
  prohibited_item:       '出品禁止物',
  ip_infringement:       '著作権・商標侵害',
  counterfeit:           '偽造・ブランド偽装',
  inappropriate_content: '不適切な表現',
  misleading:            '説明と実物が違う',
  unsafe:                '安全性に問題',
  other:                 'その他',
}

const ALL_STATUS = ['open', 'reviewing', 'resolved', 'dismissed'] as const

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

function statusBadge(s: string): string {
  const base = 'inline-block text-[11px] font-semibold px-2 py-0.5 rounded border '
  switch (s) {
    case 'open':      return base + 'bg-red-50 text-red-800 border-red-200'
    case 'reviewing': return base + 'bg-amber-50 text-amber-800 border-amber-200'
    case 'resolved':  return base + 'bg-emerald-50 text-emerald-800 border-emerald-200'
    case 'dismissed': return base + 'bg-neutral-100 text-neutral-600 border-neutral-300'
    default:          return base + 'bg-neutral-100 text-neutral-700 border-neutral-300'
  }
}

function errorLabel(code: string): string {
  switch (code) {
    case 'forbidden':          return '運営者権限が必要です。'
    case 'not_authenticated':  return '認証情報が失われました。 再ログインしてください。'
    case 'report_not_found':   return '対象の通報が見つかりませんでした。'
    case 'report_id_required': return '通報 ID を指定してください。'
    case 'invalid_status':     return '不正な status が指定されました。'
    default:                   return `通報詳細の取得に失敗しました (${code})`
  }
}

function mapRpcErrorToCode(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('forbidden'))          return 'forbidden'
  if (lower.includes('not_authenticated'))  return 'not_authenticated'
  if (lower.includes('report_not_found'))   return 'report_not_found'
  if (lower.includes('report_id_required')) return 'report_id_required'
  return 'unknown'
}

export default async function CosmohypeAdminReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>
  searchParams?: Promise<{ saved?: string; err?: string }>
}) {
  await getCosmohypeAdminContext()

  const { reportId } = await params
  const sp = (await searchParams) ?? {}
  const savedStatus = sp.saved ?? null
  const savedErr = sp.err ?? null

  const isValidUuid = /^[0-9a-fA-F-]{36}$/.test(reportId)
  if (!isValidUuid) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {errorLabel('report_id_required')}
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  // deno-lint-ignore no-explicit-any
  const loose = supabase as unknown as any

  const { data, error } = await loose.rpc('shop_admin_get_product_report_detail', {
    p_report_id: reportId,
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
  const r = d.report

  const productsAdminLink = d.product
    ? `/cosmohype-admin/products?q=${encodeURIComponent(d.product.id)}`
    : null
  const brandAdminLink = d.brand
    ? `/cosmohype-admin/brands?q=${encodeURIComponent(d.brand.id)}`
    : null

  return (
    <div className="space-y-6">
      <BackLink />

      {savedStatus && (
        <div className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          status を「{savedStatus}」に更新しました。
        </div>
      )}
      {savedErr && (
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {errorLabel(savedErr)}
        </div>
      )}

      <div>
        <div className="text-[10px] font-bold tracking-widest text-neutral-500">REPORT</div>
        <div className="mt-1 flex items-baseline gap-3 flex-wrap">
          <h1 className="text-xl font-semibold text-neutral-900 font-mono break-all">{r.id}</h1>
          <span className={statusBadge(r.status)}>{r.status}</span>
        </div>
        <div className="mt-1 text-[12px] text-neutral-500">
          通報: {formatDT(r.created_at)}
          {r.updated_at !== r.created_at && <> / 更新: {formatDT(r.updated_at)}</>}
        </div>
      </div>

      {/* 通報内容 */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900">通報内容</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
          <Kv label="reason" value={`${REASON_LABEL[r.reason] ?? r.reason} (${r.reason})`} />
          <Kv label="通報時商品名" value={r.snapshot_product_name} />
          <Kv label="通報時ブランド名" value={r.snapshot_brand_name} />
        </div>
        {r.details && (
          <div>
            <div className="text-[10px] font-semibold text-neutral-500">details (ユーザー入力)</div>
            <div className="mt-1 whitespace-pre-wrap break-words text-[13px] text-neutral-800 border border-neutral-200 bg-neutral-50 rounded p-3">
              {r.details}
            </div>
          </div>
        )}
      </section>

      {/* 通報者 (最小情報) */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900 mb-3">通報者</h2>
        {d.reporter ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
            <Kv label="user_id" value={d.reporter.id} mono />
            <Kv label="username" value={d.reporter.username ?? '-'} />
            <Kv label="display_name" value={d.reporter.display_name ?? '-'} />
          </div>
        ) : (
          <div className="text-[12px] text-neutral-500">通報者は削除されています (snapshot は残っています)。</div>
        )}
      </section>

      {/* 対象商品 (現況 + Phase C 導線) */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-neutral-900">対象商品 (現況)</h2>
          {productsAdminLink && (
            <Link
              href={productsAdminLink}
              className="text-[12px] text-neutral-700 hover:text-neutral-900 border border-neutral-300 rounded px-2 py-1"
            >
              商品管理へ →
            </Link>
          )}
        </div>
        {d.product ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
            <Kv label="product_id" value={d.product.id} mono />
            <Kv label="商品名 (現在)" value={d.product.name} />
            <Kv label="status" value={d.product.status} />
            <Kv label="admin_suspended_at" value={formatDT(d.product.admin_suspended_at)} mono />
          </div>
        ) : (
          <div className="text-[12px] text-red-700">
            対象商品は削除されています。 snapshot: <span className="font-semibold">{r.snapshot_product_name}</span>
          </div>
        )}
      </section>

      {/* 対象ブランド (現況 + Phase C 導線) */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-neutral-900">対象ブランド (現況)</h2>
          {brandAdminLink && (
            <Link
              href={brandAdminLink}
              className="text-[12px] text-neutral-700 hover:text-neutral-900 border border-neutral-300 rounded px-2 py-1"
            >
              ブランド管理へ →
            </Link>
          )}
        </div>
        {d.brand ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
            <Kv label="brand_id" value={d.brand.id} mono />
            <Kv label="ブランド名 (現在)" value={d.brand.name} />
            <Kv label="slug" value={d.brand.slug} mono />
            <Kv label="status" value={d.brand.status} />
          </div>
        ) : (
          <div className="text-[12px] text-red-700">
            対象ブランドは削除されています。 snapshot: <span className="font-semibold">{r.snapshot_brand_name}</span>
          </div>
        )}
      </section>

      {/* status 更新 */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900">status 更新</h2>
        <p className="text-[12px] text-neutral-600">
          更新すると reviewed_by / reviewed_at が現在のログイン運営者 / 現在時刻で保存されます。
          「open」に戻すと reviewed_by / reviewed_at はクリアされます (未対応として扱う)。
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_STATUS.map((s) => (
            <form key={s} action={updateReportStatusAction}>
              <input type="hidden" name="report_id" value={r.id} />
              <input type="hidden" name="next_status" value={s} />
              <button
                type="submit"
                disabled={s === r.status}
                className={`text-[12px] px-3 py-1.5 rounded border ${
                  s === r.status
                    ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-default'
                    : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                → {s}
              </button>
            </form>
          ))}
        </div>
        {r.reviewed_by && (
          <div className="mt-2 text-[12px] text-neutral-600">
            最終更新者:{' '}
            <span className="font-semibold text-neutral-800">
              {r.reviewed_by.display_name ?? r.reviewed_by.username ?? r.reviewed_by.id.slice(0, 8) + '…'}
            </span>{' '}
            / {formatDT(r.reviewed_at)}
          </div>
        )}
      </section>
    </div>
  )
}

function BackLink() {
  return (
    <div>
      <Link href="/cosmohype-admin/reports" className="text-[12px] text-neutral-600 hover:text-neutral-900">
        ← 通報一覧へ戻る
      </Link>
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
