import Link from 'next/link'
import { getCosmohypeAdminContext } from '@/lib/cosmohypeAdmin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface Row {
  id:             string
  brand_name:     string
  contact_name:   string
  contact_email:  string
  status:         string
  website_url:    string | null
  instagram_url:  string | null
  created_at:     string
  approved_brand_id: string | null
  rejected_at:    string | null
  rejection_reason: string | null
}

function statusBadge(s: string): { label: string; cls: string } {
  switch (s) {
    case 'pending':   return { label: '審査待ち',   cls: 'bg-amber-100 text-amber-800' }
    case 'approved':  return { label: '承認済み',   cls: 'bg-emerald-100 text-emerald-800' }
    case 'rejected':  return { label: '却下',       cls: 'bg-neutral-100 text-neutral-600' }
    case 'withdrawn': return { label: '取り下げ',   cls: 'bg-neutral-100 text-neutral-500' }
    default:          return { label: s,            cls: 'bg-neutral-100 text-neutral-700' }
  }
}

function fmt(dt: string): string {
  const d = new Date(dt)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default async function HypeApplicationsListPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>
}) {
  await getCosmohypeAdminContext()
  const sp = (await searchParams) ?? {}
  const status = sp.status && ['pending','approved','rejected','withdrawn'].includes(sp.status) ? sp.status : null

  const supabase = await createClient()
  const rpcRes = await (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: Row[] | null; error: { message: string } | null }>
  }).rpc('shop_hype_admin_list_applications', { p_status: status, p_limit: 200 })

  if (rpcRes.error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">HYPE 出店申請</h1>
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          一覧の取得に失敗しました: {rpcRes.error.message}
        </div>
      </div>
    )
  }
  const rows = rpcRes.data ?? []

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">HYPE 出店申請</h1>
      <p className="text-[11px] text-neutral-500 mb-4">
        /hype/apply からの申請を確認します。 「承認」で shop_brands 作成 + Owner 招待送信、「却下」で理由を記録します。
      </p>

      <nav className="flex gap-4 text-[12px] mb-4 border-b border-neutral-200 pb-2">
        {[
          { key: null,        label: 'すべて' },
          { key: 'pending',   label: '審査待ち' },
          { key: 'approved',  label: '承認済み' },
          { key: 'rejected',  label: '却下' },
        ].map((t) => (
          <Link
            key={String(t.key)}
            href={t.key ? `/cosmohype-admin/hype-applications?status=${t.key}` : '/cosmohype-admin/hype-applications'}
            className={
              'px-2 py-1 rounded ' +
              ((status ?? null) === t.key ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100')
            }
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className="text-[13px] text-neutral-500">該当する申請はまだありません。</div>
      ) : (
        <div className="border border-neutral-200 rounded-lg bg-white overflow-hidden">
          {rows.map((r, i) => {
            const b = statusBadge(r.status)
            return (
              <Link
                key={r.id}
                href={`/cosmohype-admin/hype-applications/${r.id}`}
                className={
                  'flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 ' +
                  (i > 0 ? 'border-t border-neutral-200' : '')
                }
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${b.cls}`}>{b.label}</span>
                    <span className="text-sm font-semibold truncate">{r.brand_name}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-neutral-500 truncate">
                    {r.contact_name} · {r.contact_email}
                  </div>
                </div>
                <div className="text-right text-[11px] text-neutral-500 whitespace-nowrap">
                  {fmt(r.created_at)}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
