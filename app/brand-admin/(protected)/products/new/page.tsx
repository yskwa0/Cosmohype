import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getBrandAdminContext, isBrandAdminDevBypassEnabled } from '@/lib/brandAdmin'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createProductAction } from '../actions'
import ProductBasicsForm from '@/components/brand-admin/products/ProductBasicsForm'

export const dynamic = 'force-dynamic'

interface CategoryRow {
  id: string
  slug: string
  display_name: string
  sort_order: number
  is_active: boolean
}

function errorLabel(code: string): string {
  switch (code) {
    case 'name_required':               return '商品名を入力してください。'
    case 'category_not_found':          return 'カテゴリを選択してください。'
    case 'invalid_status':              return '公開設定が不正です。'
    case 'invalid_price':               return '価格の形式が正しくありません。'
    case 'normal_price_required':       return '通常価格を 1 円以上の整数で入力してください。'
    case 'invalid_sale_price':          return 'セール価格は 1 円以上の整数で入力してください。'
    case 'sale_price_ge_normal':        return 'セール価格は通常価格より低く設定してください。'
    case 'cannot_publish_new_product':  return '新規作成時は「公開中」にできません。まず「下書き」で作成し、画像と在庫を登録してから公開してください。'
    case 'forbidden':                   return '商品作成の権限がありません (owner / admin のみ)。'
    case 'not_authenticated':           return '認証情報が失われました。再ログインしてください。'
    case 'update_failed':               return '保存に失敗しました。時間をおいて再度お試しください。'
    default:                            return `エラー (${code})`
  }
}

export default async function BrandAdminProductNewPage({
  searchParams,
}: {
  searchParams?: Promise<{ err?: string }>
}) {
  const sp = (await searchParams) ?? {}
  const errCode = sp.err ?? null

  const ctx = await getBrandAdminContext()
  const canEdit = ctx.currentBrand.role === 'owner' || ctx.currentBrand.role === 'admin'
  if (!canEdit) {
    redirect('/brand-admin/products?err=forbidden')
  }
  const bypass = isBrandAdminDevBypassEnabled()
  const supabase = bypass ? createAdminClient() : await createClient()
  const loose = supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          order: (c: string, o: { ascending: boolean }) => Promise<{ data: unknown[] | null; error: { message: string } | null }>
        }
      }
    }
  }
  const catRes = await loose.from('shop_categories').select('id, slug, display_name, sort_order, is_active').eq('is_active', 'true').order('sort_order', { ascending: true })
  const categories = ((catRes.data ?? []) as CategoryRow[])

  return (
    <div className="space-y-6">
      <div>
        <Link href="/brand-admin/products" className="text-[11px] text-neutral-500 hover:underline">
          ← 商品一覧へ
        </Link>
        <div className="mt-2 text-[10px] tracking-[0.3em] text-neutral-500">{ctx.currentBrand.brandName}</div>
        <h1 className="mt-1 text-2xl font-semibold">商品を追加</h1>
        <div className="mt-2 text-[11px] text-neutral-500">
          このステップでは基本情報のみ入力します。「商品を作成」を押すと下書き商品が作成され、
          続けて<b>商品画像</b>・<b>バリエーション</b>・<b>在庫</b>を設定できます。
        </div>
      </div>

      {/* 進行段階の視覚化 */}
      <div className="flex items-center gap-2 text-[10px] text-neutral-600 flex-wrap">
        <span className="px-2 py-1 rounded-full bg-neutral-900 text-white font-semibold">1. 基本情報</span>
        <span className="text-neutral-400">→</span>
        <span className="px-2 py-1 rounded-full border border-neutral-300">2. 商品画像</span>
        <span className="text-neutral-400">→</span>
        <span className="px-2 py-1 rounded-full border border-neutral-300">3. バリエーション・在庫</span>
        <span className="text-neutral-400">→</span>
        <span className="px-2 py-1 rounded-full border border-neutral-300">4. 公開設定</span>
      </div>

      {errCode && (
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {errorLabel(errCode)}
        </div>
      )}

      <section className="border border-neutral-200 rounded-xl bg-white p-6">
        <h2 className="text-sm font-semibold mb-4">基本情報</h2>
        <ProductBasicsForm
          action={createProductAction}
          mode="new"
          categories={categories.map((c) => ({ id: c.id, label: c.display_name }))}
          initial={{
            productId: null,
            name: '',
            description: '',
            categoryId: categories[0]?.id ?? '',
            normalPrice: '',
            salePrice: '',
            status: 'draft',
            isNew: false,
          }}
        />
      </section>
    </div>
  )
}
