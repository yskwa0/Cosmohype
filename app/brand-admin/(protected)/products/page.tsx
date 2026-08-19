import Link from 'next/link'
import { getBrandAdminContext, isBrandAdminDevBypassEnabled } from '@/lib/brandAdmin'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import ProductListActions, { type ProductListItem } from '@/components/brand-admin/products/ProductListActions'
import { archiveProductAction, revertToDraftAction, deleteProductAction } from './actions'
import { pressableClass } from '@/lib/brandAdminUi'
import { NavPendingSpinner } from '@/components/brand-admin/NavPendingSpinner'

// エラーコード → 表示ラベル (完全削除 flow で発生し得るコードを含む)
function errLabel(code: string): string {
  switch (code) {
    case 'has_orders':            return '注文履歴があるため削除できません。アーカイブしてください。'
    case 'has_cart_items':        return 'カートに入っているため削除できません。少し時間を置いて再度お試しください。'
    case 'has_reservations':      return '在庫予約中のため削除できません。少し時間を置いて再度お試しください。'
    case 'service_role_missing':  return 'サーバ設定エラー (service_role 未設定)。運営にお問い合わせください。'
    case 'delete_variants_failed':return 'バリアントの削除に失敗しました。時間を置いて再度お試しください。'
    case 'delete_product_failed': return '商品の削除に失敗しました。時間を置いて再度お試しください。'
    case 'product_not_found':     return '対象の商品が見つかりませんでした。'
    case 'forbidden':             return 'この操作を行う権限がありません。'
    default:                      return `エラー: ${code}`
  }
}

export const dynamic = 'force-dynamic'

interface ProductRow {
  id: string
  name: string
  status: string
  base_price: number
  currency: string
  category_id: string
  updated_at: string
  shop_categories: { display_name: string } | null
  shop_product_images: Array<{ storage_path: string; is_primary: boolean; sort_order: number }> | null
  shop_product_variants: Array<{
    id: string
    status: string
    shop_inventory: { quantity_available: number; quantity_reserved: number } | null
  }> | null
}

type StatusFilter = 'all' | 'published' | 'draft' | 'archived'

function statusLabel(s: string): string {
  switch (s) {
    case 'draft':     return '下書き'
    case 'published': return '公開中'
    case 'sold_out':  return '在庫切れ (旧仕様)'
    case 'archived':  return 'アーカイブ（非表示）'
    default:          return s
  }
}
// statusColor / formatDate は ProductListActions.tsx (Client) 側へ移動済

function ErrorBanner({ title, detail }: { title: string; detail: string }) {
  return (
    <div>
      <h1 className="text-lg font-semibold mb-2">{title}</h1>
      <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 whitespace-pre-wrap break-words">
        {detail}
      </div>
    </div>
  )
}

export default async function BrandAdminProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; saved?: string; err?: string }>
}) {
  const sp = (await searchParams) ?? {}
  const filter: StatusFilter =
    sp.status === 'published' || sp.status === 'draft' || sp.status === 'archived'
      ? (sp.status as StatusFilter)
      : 'all'
  const savedOk = sp.saved === '1'
  const errCode = sp.err ?? null

  const ctx = await getBrandAdminContext()
  const bypass = isBrandAdminDevBypassEnabled()
  if (bypass && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <ErrorBanner
        title="Dev Bypass 設定不足"
        detail=".env.local に SUPABASE_SERVICE_ROLE_KEY を Test project の service_role key で設定してください。"
      />
    )
  }
  const supabase = bypass ? createAdminClient() : await createClient()

  type LooseFrom = {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          eq: (c: string, v: string) => {
            order: (c: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }>
            }
          }
          order: (c: string, o: { ascending: boolean }) => {
            limit: (n: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }>
          }
        }
      }
    }
  }
  const loose = supabase as unknown as LooseFrom

  const baseSelect = 'id, name, status, base_price, currency, category_id, updated_at, ' +
    'shop_categories(display_name), ' +
    'shop_product_images(storage_path, is_primary, sort_order), ' +
    'shop_product_variants(id, status, shop_inventory(quantity_available, quantity_reserved))'
  const q = loose.from('shop_products').select(baseSelect).eq('brand_id', ctx.currentBrand.brandId)
  const res = filter === 'all'
    ? await q.order('updated_at', { ascending: false }).limit(200)
    : await q.eq('status', filter).order('updated_at', { ascending: false }).limit(200)

  if (res.error) {
    return <ErrorBanner title="商品一覧の取得に失敗しました" detail={res.error.message} />
  }
  const data = (res.data ?? []) as ProductRow[]

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publicBase = supaUrl ? `${supaUrl}/storage/v1/object/public/shop-product-images/` : ''

  const canEdit = ctx.currentBrand.role === 'owner' || ctx.currentBrand.role === 'admin'

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] tracking-[0.3em] text-neutral-500">{ctx.currentBrand.brandName}</div>
          <h1 className="mt-1 text-2xl font-semibold">商品管理</h1>
          <div className="mt-2 text-[11px] text-neutral-500">
            自ブランドの商品 (最大 200 件、更新日時が新しい順)
          </div>
        </div>
        {canEdit && (
          <Link
            href="/brand-admin/products/new"
            className={
              'inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-800 ' +
              pressableClass
            }
          >
            商品を追加
            <NavPendingSpinner />
          </Link>
        )}
      </div>

      {savedOk && (
        <div className="mb-4 text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          保存しました。
        </div>
      )}
      {errCode && (
        <div className="mb-4 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {errLabel(errCode)}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-1 text-[11px]">
        {(['all','published','draft','archived'] as StatusFilter[]).map((s) => (
          <Link
            key={s}
            href={s === 'all' ? '/brand-admin/products' : `/brand-admin/products?status=${s}`}
            className={
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border ' +
              (filter === s
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50') + ' ' +
              pressableClass
            }
          >
            {s === 'all' ? 'すべて' : statusLabel(s)}
            <NavPendingSpinner size={10} />
          </Link>
        ))}
      </div>

      {(() => {
        const listItems: ProductListItem[] = data.map((p) => {
          const primary = (p.shop_product_images ?? []).slice().sort(
            (a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order
          )[0] ?? null
          const variantCount = (p.shop_product_variants ?? []).length
          const activeAvail = (p.shop_product_variants ?? [])
            .filter((v) => v.status === 'active' && v.shop_inventory !== null)
            .reduce(
              (sum, v) => sum + Math.max(0, (v.shop_inventory?.quantity_available ?? 0) - (v.shop_inventory?.quantity_reserved ?? 0)),
              0
            )
          const hasActiveVariant = (p.shop_product_variants ?? []).some(
            (v) => v.status === 'active' && v.shop_inventory !== null
          )
          return {
            id: p.id,
            name: p.name,
            status: p.status,
            base_price: p.base_price,
            category_display_name: p.shop_categories?.display_name ?? null,
            primary_storage_path: primary?.storage_path ?? null,
            variant_count: variantCount,
            active_avail: activeAvail,
            is_out_of_stock: p.status === 'published' && hasActiveVariant && activeAvail === 0,
            updated_at: p.updated_at,
          }
        })
        return (
          <ProductListActions
            items={listItems}
            publicBase={publicBase}
            canEdit={canEdit}
            revertToDraftAction={revertToDraftAction}
            archiveAction={archiveProductAction}
            deleteAction={deleteProductAction}
          />
        )
      })()}
    </div>
  )
}
