import { createClient } from '@/lib/supabase/server'
import { getCosmohypeAdminContext } from '@/lib/cosmohypeAdmin'
import { forceUnpublishProductAction } from './actions'
import ConfirmSubmitButton from './_ConfirmSubmitButton'

export const dynamic = 'force-dynamic'

interface ProductRow {
  id: string
  name: string
  status: string
  brand_id: string
  shop_brands: { name: string; slug: string } | null
}

function errorLabel(code: string): string {
  switch (code) {
    case 'forbidden':          return '運営者権限が必要です。'
    case 'not_authenticated':  return '認証情報が失われました。再ログインしてください。'
    case 'product_not_found':  return '対象商品が見つかりませんでした。'
    case 'reason_too_long':    return '理由は 1000 文字以内で入力してください。'
    case 'update_failed':      return '販売停止に失敗しました。時間をおいて再度お試しください。'
    default:                   return `販売停止に失敗しました (${code})`
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'draft':     return '下書き'
    case 'published': return '公開中'
    case 'sold_out':  return '在庫切れ (legacy)'
    case 'archived':  return 'アーカイブ / 停止済'
    default:          return status
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'published': return 'bg-emerald-50 text-emerald-800 border-emerald-200'
    case 'archived':  return 'bg-red-50 text-red-800 border-red-200'
    case 'sold_out':  return 'bg-neutral-100 text-neutral-700 border-neutral-300'
    case 'draft':     return 'bg-neutral-100 text-neutral-600 border-neutral-300'
    default:          return 'bg-neutral-50 text-neutral-500 border-neutral-200'
  }
}

export default async function CosmohypeAdminProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; saved?: string; err?: string }>
}) {
  // layout でも auth gate 済だが Server Action と対称で page 側でも再検証。
  await getCosmohypeAdminContext()

  const sp = (await searchParams) ?? {}
  const q = (sp.q ?? '').trim()
  const savedUnpublished = sp.saved === 'unpublished'
  const errCode = sp.err ?? null

  // 検索: uuid 完全一致 or 商品名 ilike。 未入力なら最新 50 件 (全 status)。
  const isUuid = /^[0-9a-fA-F-]{36}$/.test(q)
  const supabase = await createClient()
  // deno-lint-ignore no-explicit-any
  const loose = supabase as unknown as any

  const selectStr = 'id, name, status, brand_id, shop_brands(name, slug)'

  let result: { data: ProductRow[] | null; error: { message: string } | null }
  if (isUuid) {
    result = await loose.from('shop_products').select(selectStr).eq('id', q).limit(1)
  } else if (q.length > 0) {
    const escaped = q.replace(/%/g, '\\%')
    result = await loose.from('shop_products').select(selectStr).ilike('name', `%${escaped}%`).limit(50)
  } else {
    result = await loose.from('shop_products').select(selectStr).order('created_at', { ascending: false }).limit(50)
  }

  const rows: ProductRow[] = result.data ?? []
  const fetchError = result.error?.message ?? null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">商品管理</h1>
        <p className="mt-1 text-[12px] text-neutral-600">
          Cosmohype 運営者専用。 問題のある商品を販売停止します (status=&apos;archived&apos; へ遷移)。
          停止された商品は HYPE 一覧・検索・Checkout から即時除外されますが、過去注文の詳細は引き続き閲覧できます。
        </p>
      </div>

      {savedUnpublished && (
        <div className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          商品を販売停止しました。 監査ログ (shop_admin_actions) に記録されました。
        </div>
      )}
      {errCode && (
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {errorLabel(errCode)}
        </div>
      )}

      <form action="/cosmohype-admin/products" method="get" className="flex items-center gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="商品名で検索 (もしくは product id を貼付)"
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

      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-[11px] uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-2 text-left">商品名</th>
              <th className="px-4 py-2 text-left">ブランド</th>
              <th className="px-4 py-2 text-left">status</th>
              <th className="px-4 py-2 text-left">product id</th>
              <th className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500 text-[12px]">
                  {q.length > 0 ? '該当商品はありません。' : '商品が登録されていません。'}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-neutral-100 align-top">
                <td className="px-4 py-3 text-neutral-900">{r.name}</td>
                <td className="px-4 py-3 text-neutral-700">{r.shop_brands?.name ?? '-'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${statusBadgeClass(r.status)}`}
                  >
                    {statusLabel(r.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-[11px] text-neutral-500 font-mono">{r.id}</td>
                <td className="px-4 py-3 text-right">
                  {r.status === 'archived' ? (
                    <span className="text-[11px] text-neutral-500">停止済</span>
                  ) : (
                    <form action={forceUnpublishProductAction} className="inline-flex items-center gap-2">
                      <input type="hidden" name="product_id" value={r.id} />
                      <input type="hidden" name="q" value={q} />
                      <input
                        type="text"
                        name="reason"
                        placeholder="理由 (任意、監査ログへ)"
                        className="h-8 border border-neutral-300 rounded px-2 text-[12px] bg-white w-56"
                        maxLength={1000}
                      />
                      <ConfirmSubmitButton />
                    </form>
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
