import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCosmohypeAdminContext } from '@/lib/cosmohypeAdmin'
import { suspendBrandAction, reactivateBrandAction } from './actions'
import { ConfirmSuspendButton, ConfirmReactivateButton } from './_ConfirmSubmitButtons'

export const dynamic = 'force-dynamic'

interface BrandRow {
  id: string
  name: string
  slug: string
  status: string
}

function errorLabel(code: string): string {
  switch (code) {
    case 'forbidden':          return '運営者権限が必要です。'
    case 'not_authenticated':  return '認証情報が失われました。再ログインしてください。'
    case 'brand_not_found':    return '対象ブランドが見つかりませんでした。'
    case 'brand_archived':     return 'アーカイブ済ブランドは本画面から状態変更できません。'
    case 'not_suspended':      return '停止中 (suspended) のブランドだけ再開できます。'
    case 'reason_too_long':    return '理由は 1000 文字以内で入力してください。'
    case 'update_failed':      return '操作に失敗しました。時間をおいて再度お試しください。'
    default:                   return `操作に失敗しました (${code})`
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'draft':     return '下書き'
    case 'active':    return '公開中'
    case 'suspended': return '停止中'
    case 'archived':  return 'アーカイブ'
    default:          return status
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'active':    return 'bg-emerald-50 text-emerald-800 border-emerald-200'
    case 'suspended': return 'bg-red-50 text-red-800 border-red-200'
    case 'archived':  return 'bg-neutral-100 text-neutral-700 border-neutral-300'
    case 'draft':     return 'bg-neutral-100 text-neutral-600 border-neutral-300'
    default:          return 'bg-neutral-50 text-neutral-500 border-neutral-200'
  }
}

export default async function CosmohypeAdminBrandsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; saved?: string; err?: string }>
}) {
  await getCosmohypeAdminContext()

  const sp = (await searchParams) ?? {}
  const q = (sp.q ?? '').trim()
  const savedSuspended = sp.saved === 'suspended'
  const savedReactivated = sp.saved === 'reactivated'
  const errCode = sp.err ?? null

  const isUuid = /^[0-9a-fA-F-]{36}$/.test(q)
  const supabase = await createClient()
  // deno-lint-ignore no-explicit-any
  const loose = supabase as unknown as any

  const selectStr = 'id, name, slug, status'

  let result: { data: BrandRow[] | null; error: { message: string } | null }
  if (isUuid) {
    result = await loose.from('shop_brands').select(selectStr).eq('id', q).limit(1)
  } else if (q.length > 0) {
    const escaped = q.replace(/%/g, '\\%')
    // 名前 ilike OR slug 完全一致 (postgrest or filter)
    result = await loose.from('shop_brands').select(selectStr)
      .or(`name.ilike.%${escaped}%,slug.eq.${q}`)
      .limit(50)
  } else {
    result = await loose.from('shop_brands').select(selectStr).order('name', { ascending: true }).limit(50)
  }

  const rows: BrandRow[] = result.data ?? []
  const fetchError = result.error?.message ?? null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">ブランド管理</h1>
        <p className="mt-1 text-[12px] text-neutral-600">
          Cosmohype 運営者専用。 ブランドを停止 (suspended) すると全商品が HYPE 一覧・検索・Checkout から除外され、
          Brand Admin からの新規商品公開もできなくなります。 ただし過去注文の発送・返金対応は継続できます。
        </p>
      </div>

      {savedSuspended && (
        <div className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          ブランドを停止しました。 監査ログ (shop_admin_actions) に記録されました。
        </div>
      )}
      {savedReactivated && (
        <div className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          ブランドを再開しました。 以前公開されていた商品はそのまま HYPE に復活します。
        </div>
      )}
      {errCode && (
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {errorLabel(errCode)}
        </div>
      )}

      <form action="/cosmohype-admin/brands" method="get" className="flex items-center gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="ブランド名で検索 (slug 完全一致 / brand id 貼付も可)"
          className="flex-1 h-10 border border-neutral-300 rounded px-3 text-sm bg-white"
        />
        <button
          type="submit"
          className="h-10 px-4 rounded bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800"
        >
          検索
        </button>
      </form>

      {fetchError && (
        <div className="text-[11px] text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1">
          読込エラー: {fetchError}
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-2 text-left">ブランド名</th>
              <th className="px-4 py-2 text-left">slug</th>
              <th className="px-4 py-2 text-left">status</th>
              <th className="px-4 py-2 text-left">brand id</th>
              <th className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500 text-[12px]">
                  {q.length > 0 ? '該当ブランドはありません。' : 'ブランドが登録されていません。'}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-neutral-100 align-top">
                <td className="px-4 py-3 text-neutral-900">{r.name}</td>
                <td className="px-4 py-3 text-[12px] text-neutral-600 font-mono">{r.slug}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${statusBadgeClass(r.status)}`}
                  >
                    {statusLabel(r.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-[11px] text-neutral-500 font-mono">
                  <div>{r.id}</div>
                  <Link
                    href={`/cosmohype-admin/brands/${r.id}`}
                    className="mt-1 inline-block text-[11px] text-neutral-700 hover:underline"
                  >
                    販売事業者情報を確認 →
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">
                  {r.status === 'active' && (
                    <form action={suspendBrandAction} className="inline-flex items-center gap-2">
                      <input type="hidden" name="brand_id" value={r.id} />
                      <input type="hidden" name="q" value={q} />
                      <input
                        type="text"
                        name="reason"
                        placeholder="理由 (任意)"
                        className="h-8 border border-neutral-300 rounded px-2 text-[12px] bg-white w-48"
                        maxLength={1000}
                      />
                      <ConfirmSuspendButton />
                    </form>
                  )}
                  {r.status === 'suspended' && (
                    <form action={reactivateBrandAction} className="inline-flex items-center gap-2">
                      <input type="hidden" name="brand_id" value={r.id} />
                      <input type="hidden" name="q" value={q} />
                      <input
                        type="text"
                        name="reason"
                        placeholder="理由 (任意)"
                        className="h-8 border border-neutral-300 rounded px-2 text-[12px] bg-white w-48"
                        maxLength={1000}
                      />
                      <ConfirmReactivateButton />
                    </form>
                  )}
                  {(r.status === 'draft' || r.status === 'archived') && (
                    <span className="text-[11px] text-neutral-500">操作対象外</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
