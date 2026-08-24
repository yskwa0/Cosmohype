import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCosmohypeAdminContext } from '@/lib/cosmohypeAdmin'

export const dynamic = 'force-dynamic'

/**
 * Cosmohype 運営者向け HYPE 商品通報一覧 (Phase E)。
 *
 * データ源: shop_admin_search_product_reports(p_status, p_limit, p_offset)
 * SECURITY DEFINER RPC。 内部で profiles.role='admin' を再検証。
 *
 * 通報者 email / 住所は表示しない (username / display_name のみ、要件 #20)。
 * status 別絞込、open を先頭に並べる (RPC 側 order by で保証)。
 */

interface ReportRow {
  id: string
  created_at: string
  status: string
  reason: string
  product_id: string | null
  brand_id: string | null
  snapshot_product_name: string
  snapshot_brand_name: string
  reporter_user_id: string | null
  reporter_username: string | null
  reporter_display_name: string | null
  reviewed_by: string | null
  reviewed_at: string | null
}

const STATUS_OPTIONS = [
  { value: '',          label: '(全 status)' },
  { value: 'open',      label: 'open' },
  { value: 'reviewing', label: 'reviewing' },
  { value: 'resolved',  label: 'resolved' },
  { value: 'dismissed', label: 'dismissed' },
] as const

const REASON_LABEL: Record<string, string> = {
  prohibited_item:       '出品禁止物',
  ip_infringement:       '著作権・商標侵害',
  counterfeit:           '偽造・ブランド偽装',
  inappropriate_content: '不適切な表現',
  misleading:            '説明と実物が違う',
  unsafe:                '安全性に問題',
  other:                 'その他',
}

const PAGE_SIZE = 50

function formatDate(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

function statusBadge(s: string): string {
  const base = 'inline-block text-[10px] font-semibold px-2 py-0.5 rounded border '
  switch (s) {
    case 'open':      return base + 'bg-red-50 text-red-800 border-red-200'
    case 'reviewing': return base + 'bg-amber-50 text-amber-800 border-amber-200'
    case 'resolved':  return base + 'bg-emerald-50 text-emerald-800 border-emerald-200'
    case 'dismissed': return base + 'bg-neutral-100 text-neutral-600 border-neutral-300'
    default:          return base + 'bg-neutral-100 text-neutral-700 border-neutral-300'
  }
}

export default async function CosmohypeAdminReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; page?: string }>
}) {
  await getCosmohypeAdminContext()

  const sp = (await searchParams) ?? {}
  const status = (sp.status ?? '').trim()
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()
  // deno-lint-ignore no-explicit-any
  const loose = supabase as unknown as any

  const { data, error } = await loose.rpc('shop_admin_search_product_reports', {
    p_status: status.length > 0 ? status : null,
    p_limit:  PAGE_SIZE,
    p_offset: offset,
  })

  const rows: ReportRow[] = (data as ReportRow[] | null) ?? []
  const fetchError = error?.message ?? null

  const hasNextPage = rows.length === PAGE_SIZE
  const hasPrevPage = page > 1

  function pageHref(p: number): string {
    const qs = new URLSearchParams()
    if (status.length > 0) qs.set('status', status)
    if (p > 1) qs.set('page', String(p))
    const s = qs.toString()
    return s.length > 0 ? `/cosmohype-admin/reports?${s}` : '/cosmohype-admin/reports'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">商品通報一覧</h1>
        <p className="mt-1 text-[12px] text-neutral-600">
          HYPE 商品への通報 (read + status 更新)。 通報者の email や住所は表示しません。
          Phase E ではブランド通報 / DM 通報は未実装です。
        </p>
      </div>

      <form action="/cosmohype-admin/reports" method="get" className="flex items-center gap-2 flex-wrap">
        <select
          name="status"
          defaultValue={status}
          className="h-10 border border-neutral-300 rounded px-2 text-sm bg-white"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 px-4 rounded bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800"
        >
          絞込
        </button>
      </form>

      {fetchError && (
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          通報一覧の読み込みに失敗しました。 時間をおいてもう一度お試しください。
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-3 py-2 text-left">日時</th>
              <th className="px-3 py-2 text-left">status</th>
              <th className="px-3 py-2 text-left">reason</th>
              <th className="px-3 py-2 text-left">対象商品</th>
              <th className="px-3 py-2 text-left">ブランド</th>
              <th className="px-3 py-2 text-left">通報者</th>
              <th className="px-3 py-2 text-left">reviewer</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !fetchError && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-neutral-500 text-[12px]">
                  {status.length > 0 ? '該当する通報はありません' : 'まだ通報はありません'}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-neutral-100 align-top hover:bg-neutral-50">
                <td className="px-3 py-2 text-[12px] text-neutral-600 whitespace-nowrap font-mono">
                  {formatDate(r.created_at)}
                </td>
                <td className="px-3 py-2">
                  <span className={statusBadge(r.status)}>{r.status}</span>
                </td>
                <td className="px-3 py-2 text-[12px] text-neutral-800">
                  {REASON_LABEL[r.reason] ?? r.reason}
                  <div className="text-[10px] text-neutral-400 font-mono">{r.reason}</div>
                </td>
                <td className="px-3 py-2 text-[12px] text-neutral-800 max-w-[220px]">
                  <Link href={`/cosmohype-admin/reports/${r.id}`} className="hover:underline">
                    {r.snapshot_product_name}
                  </Link>
                  {r.product_id === null && (
                    <div className="text-[10px] text-red-600">※ 商品は削除済み (snapshot 表示)</div>
                  )}
                </td>
                <td className="px-3 py-2 text-[12px] text-neutral-700 max-w-[160px] truncate">
                  {r.snapshot_brand_name}
                </td>
                <td className="px-3 py-2 text-[12px] text-neutral-800">
                  {r.reporter_display_name && r.reporter_display_name.length > 0
                    ? r.reporter_display_name
                    : (r.reporter_username ?? '-')}
                  {r.reporter_username && (
                    <div className="text-[10px] text-neutral-500 font-mono">@{r.reporter_username}</div>
                  )}
                  {r.reporter_user_id === null && (
                    <div className="text-[10px] text-neutral-400">(通報者は削除済み)</div>
                  )}
                </td>
                <td className="px-3 py-2 text-[12px] text-neutral-600 font-mono">
                  {r.reviewed_by ? `${r.reviewed_by.slice(0, 8)}…` : '-'}
                  {r.reviewed_at && (
                    <div className="text-[10px] text-neutral-500">{formatDate(r.reviewed_at)}</div>
                  )}
                </td>
              </tr>
            ))}
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
