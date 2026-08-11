import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getBrandAdminContext, isBrandAdminDevBypassEnabled } from '@/lib/brandAdmin'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import ProductBasicsForm from '@/components/brand-admin/products/ProductBasicsForm'
import ImageUploadForm from '@/components/brand-admin/products/ImageUploadForm'
import VariantEditor from '@/components/brand-admin/products/VariantEditor'
import AddVariantSection from '@/components/brand-admin/products/AddVariantSection'
import PublishProductForm from '@/components/brand-admin/products/PublishProductForm'
import ConfirmSubmitButton from '@/components/brand-admin/products/ConfirmSubmitButton'
import {
  updateProductAction,
  upsertVariantAction,
  deleteVariantAction,
  uploadImageAction,
  deleteImageAction,
  setPrimaryImageAction,
  publishProductAction,
  archiveProductAction,
  revertSoldOutAction,
} from '../actions'

export const dynamic = 'force-dynamic'

const MAX_IMAGES_PER_PRODUCT = 5

interface CategoryRow {
  id: string
  slug: string
  display_name: string
  sort_order: number
}
interface ProductRow {
  id: string
  brand_id: string
  category_id: string
  name: string
  description: string | null
  status: string
  base_price: number
  compare_at_price: number | null
  currency: string
  style_id_tags: string[]
  is_new: boolean
  published_at: string | null
  updated_at: string
}
interface ImageRow {
  id: string
  storage_path: string
  sort_order: number
  is_primary: boolean
}
interface VariantRow {
  id: string
  sku: string
  size: string | null
  color_name: string | null
  color_hex: string | null
  price: number | null
  status: string
  shop_inventory: { quantity_available: number; quantity_reserved: number } | null
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

function errorLabel(code: string): string {
  switch (code) {
    case 'name_required':               return '商品名を入力してください。'
    case 'category_not_found':          return 'カテゴリを選択してください。'
    case 'invalid_status':              return '公開設定が不正です。'
    case 'invalid_price':               return '価格の形式が正しくありません。'
    case 'normal_price_required':       return '通常価格を 1 円以上の整数で入力してください。'
    case 'invalid_sale_price':          return 'セール価格は 1 円以上の整数で入力してください。'
    case 'sale_price_ge_normal':        return 'セール価格は通常価格より低く設定してください。'
    case 'publish_requires_price':      return '公開するには通常価格を 1 円以上で設定してください。'
    case 'publish_requires_image':      return '公開するには商品画像を 1 枚以上登録してください。'
    case 'publish_requires_variant':    return '公開するにはサイズ・カラー・在庫を持つ「販売中」バリエーションを 1 件以上登録してください。'
    case 'too_many_images':             return `画像は最大 ${MAX_IMAGES_PER_PRODUCT} 枚まで登録できます。既存を削除してから追加してください。`
    case 'file_required':               return '画像ファイルを選択してください。'
    case 'file_too_large':              return '画像は 8MB 以下にしてください。'
    case 'not_image':                   return '画像ファイル (image/*) を選択してください。'
    case 'upload_failed':               return '画像アップロードに失敗しました。時間をおいて再度お試しください。'
    case 'size_required':               return 'サイズを選択してください。'
    case 'color_required':              return 'カラーを選択してください。'
    case 'sku_already_used':            return 'SKU が既に使われています。もう一度お試しください (自動生成)。'
    case 'sku_generation_failed':       return 'SKU の自動生成に失敗しました。時間をおいて再度お試しください。'
    case 'already_published':           return 'この商品は既に公開中です。'
    case 'already_archived':            return 'この商品は既にアーカイブ済みです。'
    case 'not_sold_out':                return 'この商品は在庫切れ (旧仕様) 状態ではありません。'
    case 'variant_in_use_order':        return 'このバリエーションは注文履歴で使用されているため削除できません。「販売停止」に切替えてください。'
    case 'variant_in_use_cart':         return 'このバリエーションは他の購入者のカートに入っているため削除できません。しばらくおいて再試行するか、「販売停止」に切替えてください。'
    case 'variant_in_use_reserved':     return 'このバリエーションは決済中の確保があるため削除できません。しばらくおいて再試行するか、「販売停止」に切替えてください。'
    case 'service_role_missing':        return 'Dev Bypass 用の SUPABASE_SERVICE_ROLE_KEY が設定されていません。'
    case 'invalid_quantity':            return '在庫は 0 以上の整数で入力してください。'
    case 'variant_not_found':           return '対象のバリエーションが見つかりません。'
    case 'image_not_found':             return '対象の画像が見つかりません。'
    case 'invalid_storage_path':        return '画像パスが不正です。'
    case 'forbidden':                   return '編集権限がありません (owner / admin のみ)。'
    case 'not_authenticated':           return '認証情報が失われました。再ログインしてください。'
    case 'product_not_found':           return '対象の商品が見つかりません。'
    case 'update_failed':               return '保存に失敗しました。時間をおいて再度お試しください。'
    default:                            return `エラー (${code})`
  }
}

export default async function BrandAdminProductEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>
  searchParams?: Promise<{ saved?: string; err?: string; created?: string; published?: string; archived?: string; reverted?: string; deleted?: string; step?: string }>
}) {
  const { productId } = await params
  if (!/^[0-9a-fA-F-]{36}$/.test(productId)) {
    return <ErrorBanner title="商品が見つかりません" detail="URL の productId が不正です。" />
  }
  const sp = (await searchParams) ?? {}
  const savedOk = sp.saved === '1'
  const justCreated = sp.created === '1'
  const justPublished = sp.published === '1'
  const justArchived = sp.archived === '1'
  const justReverted = sp.reverted === '1'
  const justDeleted = sp.deleted === '1'
  const errCode = sp.err ?? null
  // step 型 UI (1=基本情報, 2=商品画像, 3=バリエーション・在庫, 4=公開)
  const stepNum: 1 | 2 | 3 | 4 = sp.step === '2' ? 2 : sp.step === '3' ? 3 : sp.step === '4' ? 4 : 1

  const ctx = await getBrandAdminContext()
  const canEdit = ctx.currentBrand.role === 'owner' || ctx.currentBrand.role === 'admin'
  const bypass = isBrandAdminDevBypassEnabled()
  if (bypass && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return <ErrorBanner title="Dev Bypass 設定不足" detail="SUPABASE_SERVICE_ROLE_KEY を設定してください。" />
  }
  const supabase = bypass ? createAdminClient() : await createClient()

  type LooseFrom = {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          eq?: (c: string, v: string) => {
            maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>
          }
          maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>
          order: (c: string, o: { ascending: boolean }) => Promise<{ data: unknown[] | null; error: { message: string } | null }>
        }
      }
    }
  }
  const loose = supabase as unknown as LooseFrom

  const prodRes = await loose.from('shop_products').select(
    'id, brand_id, category_id, name, description, status, base_price, compare_at_price, currency, style_id_tags, is_new, published_at, updated_at'
  ).eq('id', productId).maybeSingle()
  if (prodRes.error) return <ErrorBanner title="商品取得エラー" detail={prodRes.error.message} />
  const product = prodRes.data as ProductRow | null
  if (!product) return <ErrorBanner title="商品が見つかりません" detail="削除されているか、閲覧権限がありません。" />
  if (product.brand_id !== ctx.currentBrand.brandId) {
    redirect('/brand-admin/products?err=forbidden')
  }

  const [catRes, imgRes, varRes] = await Promise.all([
    loose.from('shop_categories').select('id, slug, display_name, sort_order').eq('is_active', 'true').order('sort_order', { ascending: true }),
    loose.from('shop_product_images').select('id, storage_path, sort_order, is_primary').eq('product_id', productId).order('sort_order', { ascending: true }),
    loose.from('shop_product_variants').select('id, sku, size, color_name, color_hex, price, status, shop_inventory(quantity_available, quantity_reserved)').eq('product_id', productId).order('sku', { ascending: true }),
  ])
  const categories = ((catRes.data ?? []) as CategoryRow[])
  const images = ((imgRes.data ?? []) as ImageRow[])
  const variants = ((varRes.data ?? []) as VariantRow[])

  const currentCategorySlug = categories.find((c) => c.id === product.category_id)?.slug ?? 'other'

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publicBase = supaUrl ? `${supaUrl}/storage/v1/object/public/shop-product-images/` : ''

  // form 用 mapping: DB (Shopify モデル) → 通常価格 / セール価格
  // compare_at_price あり → セール中: normalPrice = compare_at_price, salePrice = base_price
  // compare_at_price なし → セールなし: normalPrice = base_price, salePrice = ""
  const onSale = product.compare_at_price !== null && product.compare_at_price > product.base_price
  const initialNormal = onSale ? String(product.compare_at_price) : String(product.base_price)
  const initialSale = onSale ? String(product.base_price) : ''

  return (
    <div className="space-y-8">
      <div>
        <Link href="/brand-admin/products" className="text-[11px] text-neutral-500 hover:underline">
          ← 商品一覧へ
        </Link>
        <div className="mt-2 text-[10px] tracking-[0.3em] text-neutral-500">{ctx.currentBrand.brandName}</div>
        <h1 className="mt-1 text-2xl font-semibold">{product.name}</h1>
        <div className="mt-2 text-[11px] text-neutral-500">
          product id: <span className="font-mono">{product.id}</span>
        </div>
      </div>

      {justCreated && (
        <div className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          商品を作成しました。続けて<b>商品画像</b>と<b>バリエーション・在庫</b>を登録してください。すべて揃ったら「公開中」に切替えできます。
        </div>
      )}
      {justPublished && (
        <div className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          商品を公開しました。iOS の HYPE 一覧に表示されます。
        </div>
      )}
      {justArchived && (
        <div className="text-[12px] text-neutral-700 bg-neutral-100 border border-neutral-300 rounded px-3 py-2">
          商品をアーカイブしました。HYPE 一覧から非表示になります。
        </div>
      )}
      {justReverted && (
        <div className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          「公開中」に戻しました。在庫は自動判定されます。
        </div>
      )}
      {justDeleted && (
        <div className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          バリエーションを削除しました。
        </div>
      )}
      {savedOk && !justCreated && !justPublished && !justArchived && !justReverted && !justDeleted && (
        <div className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          商品を保存しました。
        </div>
      )}
      {errCode && (
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {errorLabel(errCode)}
        </div>
      )}

      {/* ── STEP indicator ── */}
      <StepIndicator current={stepNum} productId={product.id} />

      {/* ── STEP 1: 基本情報 ── */}
      {stepNum === 1 && (
      <section className="border border-neutral-200 rounded-xl bg-white p-6">
        <h2 className="text-sm font-semibold mb-4">STEP 1 / 4 · 基本情報</h2>
        <ProductBasicsForm
          action={updateProductAction}
          mode="edit"
          categories={categories.map((c) => ({ id: c.id, label: c.display_name }))}
          disabled={!canEdit}
          initial={{
            productId: product.id,
            name: product.name,
            description: product.description ?? '',
            categoryId: product.category_id,
            normalPrice: initialNormal,
            salePrice: initialSale,
            status: (product.status as 'draft' | 'published' | 'sold_out' | 'archived'),
            isNew: product.is_new,
          }}
        />
      </section>
      )}

      {/* ── STEP 2: 商品画像 ── */}
      {stepNum === 2 && (
      <section id="images" className="border border-neutral-200 rounded-xl bg-white p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold">STEP 2 / 4 · 商品画像</h2>
          <span className="text-[11px] text-neutral-500">{images.length} / {MAX_IMAGES_PER_PRODUCT} 枚</span>
        </div>
        <div className="text-[11px] text-neutral-500 mb-4">
          最大 {MAX_IMAGES_PER_PRODUCT} 枚まで登録できます。「メイン画像」は商品一覧・詳細のトップに表示されます。
        </div>
        {images.length === 0 ? (
          <div className="text-[13px] text-orange-700 bg-orange-50 border border-orange-200 rounded px-3 py-3 mb-4">
            商品画像を追加してください（公開には 1 枚以上必要です）。
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {images.map((img) => (
              <div key={img.id} className="border border-neutral-200 rounded-lg overflow-hidden bg-neutral-50">
                <div className="relative aspect-square">
                  {publicBase && (
                    <Image
                      src={`${publicBase}${img.storage_path}`}
                      alt=""
                      fill
                      sizes="200px"
                      className="object-cover"
                      unoptimized
                    />
                  )}
                  {img.is_primary && (
                    <span className="absolute top-1 left-1 text-[9px] font-semibold bg-neutral-900 text-white px-1.5 py-0.5 rounded">
                      メイン画像
                    </span>
                  )}
                </div>
                {canEdit && (
                  <div className="p-2 space-y-1.5">
                    {!img.is_primary && (
                      <form action={setPrimaryImageAction}>
                        <input type="hidden" name="product_id" value={product.id} />
                        <input type="hidden" name="image_id" value={img.id} />
                        <button
                          type="submit"
                          className="w-full text-[11px] py-1 rounded border border-neutral-900 text-neutral-900 hover:bg-neutral-50"
                        >
                          メイン画像に設定
                        </button>
                      </form>
                    )}
                    <form action={deleteImageAction}>
                      <input type="hidden" name="product_id" value={product.id} />
                      <input type="hidden" name="image_id" value={img.id} />
                      <button
                        type="submit"
                        className="w-full text-[11px] py-1 rounded border border-red-300 text-red-700 hover:bg-red-50"
                      >
                        削除
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {canEdit && images.length < MAX_IMAGES_PER_PRODUCT && (
          <ImageUploadForm productId={product.id} action={uploadImageAction} />
        )}
      </section>
      )}

      {/* ── STEP 3: バリエーション・在庫 ── */}
      {stepNum === 3 && (
      <section id="variants" className="border border-neutral-200 rounded-xl bg-white p-6">
        <h2 className="text-sm font-semibold mb-4">STEP 3 / 4 · バリエーション・在庫</h2>
        {variants.length === 0 ? (
          <div className="text-[13px] text-orange-700 bg-orange-50 border border-orange-200 rounded px-3 py-3 mb-4">
            サイズ・カラー・在庫を持つバリエーションを 1 件以上登録してください（公開に必須）。
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {variants.map((v) => (
              <VariantEditor
                key={v.id}
                productId={product.id}
                categorySlug={currentCategorySlug}
                disabled={!canEdit}
                upsertAction={upsertVariantAction}
                deleteAction={deleteVariantAction}
                existing={{
                  id: v.id,
                  sku: v.sku,
                  size: v.size,
                  colorName: v.color_name,
                  colorHex: v.color_hex,
                  price: v.price,
                  status: v.status,
                  available: v.shop_inventory?.quantity_available ?? 0,
                  reserved: v.shop_inventory?.quantity_reserved ?? 0,
                }}
              />
            ))}
          </div>
        )}

        {canEdit && (
          <AddVariantSection
            productId={product.id}
            categorySlug={currentCategorySlug}
            upsertAction={upsertVariantAction}
          />
        )}
      </section>
      )}

      {/* ── STEP 4: 公開 / アーカイブ (最終) ── */}
      {stepNum === 4 && (() => {
        // 「在庫あり」= active variant のうち販売可能数 > 0 が 1 件以上
        const activeAvail = variants
          .filter((v) => v.status === 'active' && v.shop_inventory !== null)
          .reduce((sum, v) => sum + Math.max(0, (v.shop_inventory?.quantity_available ?? 0) - (v.shop_inventory?.quantity_reserved ?? 0)), 0)
        const hasImage = images.length > 0
        const hasActiveVariant = variants.some(
          (v) => v.status === 'active' && v.shop_inventory !== null
        )
        const hasPrice = product.base_price > 0
        const ready = hasImage && hasActiveVariant && hasPrice
        const missing: string[] = []
        if (!hasPrice) missing.push('通常価格 (1 円以上)')
        if (!hasImage) missing.push('商品画像 1 枚以上')
        if (!hasActiveVariant) missing.push('「販売中」バリエーション 1 件以上 (サイズ・カラー・在庫)')
        const publishReason = ready
          ? undefined
          : `公開には次が必要です: ${missing.join(' / ')}`

        return (
          <>
            {/* published / draft の主導線 */}
            <section className="border border-neutral-200 rounded-xl bg-white p-6">
              <h2 className="text-sm font-semibold mb-1">STEP 4 / 4 · 公開</h2>
              {product.status === 'published' ? (
                <div className="space-y-3">
                  <div className="text-[13px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 inline-flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    この商品は公開中です
                  </div>
                  {activeAvail === 0 && hasActiveVariant && (
                    <div className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                      現在すべての販売中バリエーションが在庫切れのため、HYPE 側では「在庫切れ」として表示されます。在庫を追加すると自動で購入可能になります。
                    </div>
                  )}
                  <div className="text-[11px] text-neutral-500">
                    変更内容は自動的に公開中の商品へ反映されます。
                  </div>
                </div>
              ) : product.status === 'draft' ? (
                <>
                  <p className="text-[12px] text-neutral-600 mb-4">
                    入力内容を確認して商品を公開します。
                  </p>
                  {canEdit ? (
                    <PublishProductForm
                      productId={product.id}
                      action={publishProductAction}
                      disabled={!ready}
                      disabledReason={publishReason}
                    />
                  ) : (
                    <div className="text-[12px] text-neutral-500">
                      公開は owner / admin のみ操作できます。
                    </div>
                  )}
                </>
              ) : product.status === 'sold_out' ? (
                <>
                  <div className="text-[12px] text-neutral-700 bg-neutral-100 border border-neutral-200 rounded px-3 py-2 mb-3">
                    この商品は旧仕様の「在庫切れ」状態です。今後は在庫から自動判定するため、「公開中に戻す」を押すと通常の公開状態になります。
                  </div>
                  {canEdit && (
                    <ConfirmSubmitButton
                      action={revertSoldOutAction}
                      hiddenFields={{ product_id: product.id }}
                      confirmMessage="この商品を「公開中」に戻しますか？\n\n今後は在庫の有無に応じて自動で「在庫切れ」表示されます。"
                      buttonLabel="公開中に戻す"
                      pendingLabel="切替中…"
                      buttonClassName="px-4 py-2 rounded-md text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-400 disabled:cursor-not-allowed"
                    />
                  )}
                </>
              ) : product.status === 'archived' ? (
                <div className="space-y-3">
                  <div className="text-[13px] text-neutral-700 bg-neutral-100 border border-neutral-200 rounded px-3 py-2 inline-flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-neutral-500" />
                    状態：アーカイブ済み
                  </div>
                  <p className="text-[12px] text-neutral-600">
                    現在この商品は HYPE に表示されていません。再公開すると HYPE の商品一覧に再び表示されます。
                  </p>
                  {canEdit ? (
                    <PublishProductForm
                      productId={product.id}
                      action={publishProductAction}
                      disabled={!ready}
                      disabledReason={publishReason && `再公開には次が必要です: ${publishReason.replace(/^公開には次が必要です: /, '')}`}
                      buttonLabel="商品を再公開する"
                      pendingLabel="再公開処理中…"
                      confirmMessage={'この商品を再公開しますか？\n\n再公開すると HYPE の商品一覧に再び表示されます。'}
                    />
                  ) : (
                    <div className="text-[12px] text-neutral-500">
                      再公開は owner / admin のみ操作できます。
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[12px] text-neutral-500">状態: {product.status}</div>
              )}
            </section>

            {/* アーカイブ (別セクション、危険操作) */}
            {canEdit && product.status !== 'archived' && (
              <section className="border border-neutral-200 rounded-xl bg-white p-6">
                <h2 className="text-sm font-semibold mb-1">アーカイブ</h2>
                <p className="text-[12px] text-neutral-600 mb-4">
                  アーカイブすると HYPE の商品一覧から非表示になります (既存注文には影響しません)。
                </p>
                <ConfirmSubmitButton
                  action={archiveProductAction}
                  hiddenFields={{ product_id: product.id }}
                  confirmMessage="この商品をアーカイブしますか？\n\nアーカイブすると HYPE の商品一覧から非表示になります (既存注文には影響しません)。"
                  buttonLabel="商品をアーカイブする"
                  pendingLabel="アーカイブ中…"
                  buttonClassName="px-4 py-2 rounded-md text-sm font-semibold bg-white text-red-700 border border-red-400 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </section>
            )}
          </>
        )
      })()}

      {/* ── STEP nav (戻る / 次へ) ── */}
      <StepNav current={stepNum} productId={product.id} />

      {!canEdit && (
        <div className="text-[11px] text-neutral-500 border border-neutral-200 rounded px-3 py-2 bg-neutral-50">
          あなたのロール ({ctx.currentBrand.role}) では閲覧のみ可能です。編集は owner / admin のみです。
        </div>
      )}
    </div>
  )
}

const STEP_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: '基本情報',
  2: '商品画像',
  3: 'バリエーション・在庫',
  4: '公開',
}

function StepIndicator({ current, productId }: { current: 1 | 2 | 3 | 4; productId: string }) {
  return (
    <div className="flex items-center gap-1 text-[10px] flex-wrap">
      {([1, 2, 3, 4] as const).map((n) => {
        const active = n === current
        const isPast = n < current
        return (
          <Link
            key={n}
            href={`/brand-admin/products/${productId}?step=${n}`}
            className={
              'px-2.5 py-1 rounded-full border font-semibold ' +
              (active
                ? 'bg-neutral-900 text-white border-neutral-900'
                : isPast
                ? 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                : 'bg-white text-neutral-400 border-neutral-200 hover:bg-neutral-50')
            }
          >
            STEP {n} · {STEP_LABELS[n]}
          </Link>
        )
      })}
    </div>
  )
}

function StepNav({ current, productId }: { current: 1 | 2 | 3 | 4; productId: string }) {
  const prev = current > 1 ? (current - 1 as 1 | 2 | 3 | 4) : null
  const next = current < 4 ? (current + 1 as 1 | 2 | 3 | 4) : null
  return (
    <div className="flex items-center justify-between border-t border-neutral-200 pt-6">
      {prev ? (
        <Link
          href={`/brand-admin/products/${productId}?step=${prev}`}
          className="px-4 py-2 rounded-md text-sm font-semibold bg-white text-neutral-900 border border-neutral-900 hover:bg-neutral-50"
        >
          ← 戻る (STEP {prev} · {STEP_LABELS[prev]})
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={`/brand-admin/products/${productId}?step=${next}`}
          className="px-4 py-2 rounded-md text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-800"
        >
          次へ: STEP {next} · {STEP_LABELS[next]} →
        </Link>
      ) : (
        <span />
      )}
    </div>
  )
}

