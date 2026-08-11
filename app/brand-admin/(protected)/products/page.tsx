import Link from 'next/link'
import Image from 'next/image'
import { getBrandAdminContext, isBrandAdminDevBypassEnabled } from '@/lib/brandAdmin'
import { createClient, createAdminClient } from '@/lib/supabase/server'

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
function statusColor(s: string): string {
  switch (s) {
    case 'published': return 'bg-emerald-100 text-emerald-800'
    case 'draft':     return 'bg-neutral-100 text-neutral-700'
    case 'sold_out':  return 'bg-amber-100 text-amber-800'
    case 'archived':  return 'bg-neutral-100 text-neutral-500'
    default:          return 'bg-neutral-100 text-neutral-700'
  }
}
function formatDate(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}/${m}/${day} ${hh}:${mm}`
}

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
            className="px-4 py-2 rounded-md text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-800"
          >
            商品を追加
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
          エラー: {errCode}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-1 text-[11px]">
        {(['all','published','draft','archived'] as StatusFilter[]).map((s) => (
          <Link
            key={s}
            href={s === 'all' ? '/brand-admin/products' : `/brand-admin/products?status=${s}`}
            className={
              'px-3 py-1.5 rounded-md border ' +
              (filter === s
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50')
            }
          >
            {s === 'all' ? 'すべて' : statusLabel(s)}
          </Link>
        ))}
      </div>

      {data.length === 0 ? (
        <div className="text-sm text-neutral-500 border border-neutral-200 rounded-xl bg-white px-5 py-8 text-center">
          該当する商品はありません。
        </div>
      ) : (
        <div className="border border-neutral-200 rounded-xl bg-white overflow-hidden">
          {data.map((p, i) => {
            const primary = (p.shop_product_images ?? []).slice().sort(
              (a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order
            )[0] ?? null
            const variantCount = (p.shop_product_variants ?? []).length
            // 販売可能数: active variant のみ、reserved を控除
            const activeAvail = (p.shop_product_variants ?? [])
              .filter((v) => v.status === 'active' && v.shop_inventory !== null)
              .reduce(
                (sum, v) => sum + Math.max(0, (v.shop_inventory?.quantity_available ?? 0) - (v.shop_inventory?.quantity_reserved ?? 0)),
                0
              )
            const hasActiveVariant = (p.shop_product_variants ?? []).some(
              (v) => v.status === 'active' && v.shop_inventory !== null
            )
            const isOutOfStock = p.status === 'published' && hasActiveVariant && activeAvail === 0
            const priceLabel = new Intl.NumberFormat('ja-JP').format(p.base_price)
            return (
              <Link
                key={p.id}
                href={`/brand-admin/products/${p.id}`}
                className={
                  'flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 ' +
                  (i > 0 ? 'border-t border-neutral-200' : '')
                }
              >
                <div className="w-14 h-14 rounded-lg bg-neutral-100 overflow-hidden flex items-center justify-center shrink-0 relative">
                  {primary && publicBase ? (
                    <Image
                      src={`${publicBase}${primary.storage_path}`}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-[9px] text-neutral-400">NO IMG</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${statusColor(p.status)}`}>
                      {statusLabel(p.status)}
                    </span>
                    {isOutOfStock && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        在庫切れ
                      </span>
                    )}
                    <span className="text-[10px] text-neutral-500">
                      {p.shop_categories?.display_name ?? '—'}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-neutral-900 truncate">{p.name}</div>
                  <div className="mt-0.5 text-[11px] text-neutral-500">
                    {formatDate(p.updated_at)} · variants {variantCount} · 販売可能 {activeAvail}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold font-mono">¥{priceLabel}</div>
                  <div className="text-[10px] text-neutral-500 mt-1">›</div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
