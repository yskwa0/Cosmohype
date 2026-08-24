'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getBrandAdminContext } from '@/lib/brandAdmin'

// Dev Bypass 撤去済 (Production Supabase 一本運用)。
// createAdminClient は deleteProductAction / deleteVariantAction の DELETE 権限 (RLS で
// authenticated に DELETE grant なし) に対する server-side ガード付き service_role アクセスで
// のみ引き続き使用。 通常の UPDATE / INSERT はすべて SECURITY DEFINER RPC 経由に統一済。

// -----------------------------------------------------------------------------
// 型緩和 (types/database に shop_* 未生成のため)
// -----------------------------------------------------------------------------
type Rpc = { rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> }
interface QueryBuilder extends Promise<{ data: unknown[] | null; error: { message: string } | null }> {
  eq: (c: string, v: string) => QueryBuilder
  order: (c: string, o: { ascending: boolean }) => QueryBuilder
  limit: (n: number) => QueryBuilder
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>
  single: () => Promise<{ data: unknown; error: { message: string } | null }>
}
interface UpdateBuilder extends Promise<{ error: { message: string } | null }> {
  eq: (c: string, v: string) => UpdateBuilder
}
interface DeleteBuilder extends Promise<{ error: { message: string } | null }> {
  eq: (c: string, v: string) => DeleteBuilder
}
type LooseFrom = {
  from: (t: string) => {
    select: (s: string) => QueryBuilder
    insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
    update: (patch: Record<string, unknown>) => UpdateBuilder
    delete: () => DeleteBuilder
  }
  storage: {
    from: (bucket: string) => {
      upload: (path: string, file: Blob, options?: { upsert?: boolean; contentType?: string }) => Promise<{ data: unknown; error: { message: string } | null }>
      remove: (paths: string[]) => Promise<{ data: unknown; error: { message: string } | null }>
    }
  }
}

// -----------------------------------------------------------------------------
// 定数
// -----------------------------------------------------------------------------
const MAX_IMAGES_PER_PRODUCT = 5

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------
function assertUUID(v: unknown): string {
  const s = String(v ?? '')
  if (!/^[0-9a-fA-F-]{36}$/.test(s)) throw new Error('invalid_uuid')
  return s
}
function trimOr(v: FormDataEntryValue | null, max = 1000): string {
  return String(v ?? '').trim().slice(0, max)
}
function toIntOrNull(v: FormDataEntryValue | null): number | null | typeof INVALID {
  const s = String(v ?? '').trim()
  if (s === '') return null
  const n = Number(s)
  if (!Number.isFinite(n) || !Number.isInteger(n)) return INVALID
  return n
}
const INVALID = Symbol('invalid_number')
function toInt(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? '').trim())
  if (!Number.isFinite(n) || !Number.isInteger(n)) return NaN
  return n
}
function toVariantStatus(v: FormDataEntryValue | null): string {
  const s = String(v ?? '').trim()
  if (!['active', 'inactive', 'archived'].includes(s)) return ''
  return s
}

function mapErrorCode(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('forbidden')) return 'forbidden'
  if (lower.includes('not_authenticated')) return 'not_authenticated'
  if (lower.includes('name_required')) return 'name_required'
  if (lower.includes('invalid_variant_status')) return 'invalid_status'
  if (lower.includes('invalid_status')) return 'invalid_status'
  if (lower.includes('invalid_base_price')) return 'invalid_price'
  if (lower.includes('invalid_compare_at_price')) return 'invalid_price'
  if (lower.includes('invalid_price')) return 'invalid_price'
  if (lower.includes('invalid_quantity')) return 'invalid_quantity'
  if (lower.includes('sku_required')) return 'sku_required'
  if (lower.includes('sku_already_used')) return 'sku_already_used'
  if (lower.includes('category_not_found')) return 'category_not_found'
  if (lower.includes('product_not_found')) return 'product_not_found'
  if (lower.includes('variant_not_found')) return 'variant_not_found'
  if (lower.includes('image_not_found')) return 'image_not_found'
  if (lower.includes('already_published')) return 'already_published'
  if (lower.includes('already_archived')) return 'already_archived'
  if (lower.includes('not_sold_out')) return 'not_sold_out'
  if (lower.includes('invalid_storage_path')) return 'invalid_storage_path'
  return 'update_failed'
}

async function getContextAndClient() {
  const ctx = await getBrandAdminContext()
  const supabase = await createClient()
  return { ctx, supabase: supabase as unknown as (Rpc & LooseFrom) }
}

// -----------------------------------------------------------------------------
// form 「通常価格 (normal_price)」+「セール価格 (sale_price)」を
// DB 「base_price」+「compare_at_price」にマッピング。
//
// 戻り値:
//   basePrice / compareAtPrice が両方 null → 「価格未入力 (変更なし)」
//     → create: base_price=0 の draft placeholder
//     → update: DB 現在値を preserve
//
//   basePrice=normal / compareAtPrice=null → セールなし (normal のみ入力)
//   basePrice=sale   / compareAtPrice=normal → セール中 (両方入力かつ sale<normal)
//
// autosave 経路では価格未入力でも draft 作成/継続を許可、公開時のみ
// base_price > 0 を強制する (assertPublishableOrRedirect で検証)。
// -----------------------------------------------------------------------------
function mapPricesOrError(fd: FormData, back: string): { basePrice: number | null; compareAtPrice: number | null } {
  const normalRaw = toIntOrNull(fd.get('normal_price'))
  const saleRaw = toIntOrNull(fd.get('sale_price'))
  if (normalRaw === INVALID || saleRaw === INVALID) {
    redirect(`${back}?err=invalid_price`)
  }
  const normal = normalRaw as number | null
  const sale = saleRaw as number | null

  // 両方空 → 変更なし (preserve / draft placeholder)
  if (normal === null && sale === null) {
    return { basePrice: null, compareAtPrice: null }
  }
  // sale だけ入力は無効 (通常価格ベースなので normal が主)
  if (normal === null && sale !== null) {
    redirect(`${back}?err=normal_price_required`)
  }
  // normal あり
  if (!Number.isInteger(normal!) || (normal as number) <= 0) {
    redirect(`${back}?err=normal_price_required`)
  }
  if (sale !== null) {
    if (!Number.isInteger(sale) || sale <= 0) redirect(`${back}?err=invalid_sale_price`)
    if (sale >= (normal as number)) redirect(`${back}?err=sale_price_ge_normal`)
    return { basePrice: sale, compareAtPrice: normal as number }
  }
  return { basePrice: normal as number, compareAtPrice: null }
}

// -----------------------------------------------------------------------------
// publish 前 validation
//   ・base_price > 0
//   ・images >= 1
//   ・active variants >= 1 (inventory row 付き)
//   ・Phase 2 (Migration 163): 販売事業者情報 (legal_*) 必須 8 項目 (line2 は任意)
//   ・Phase 2: 有効な shipping rule が 1 件以上存在
//   ・Phase 2: 配送・返品ポリシー (dispatch_lead_days / return_accepted /
//              return_days [returnAccepted=true 時] / exchange_accepted) が設定済
//
// 既存 published 商品は「本ゲートを経由しない update / archive / revert」については
// 現状の値を preserve するので影響なし = 既存 row を deploy 瞬間に自動 unpublish しない。
// 新規 publishProductAction / updateProductAction 経由で `status='published'` へ遷移する
// タイミングにのみ本 gate が発火する。
// 不足があれば `publish_requires_*` err code で redirect し、日本語で不足内容を返す。
// -----------------------------------------------------------------------------
async function assertPublishableOrRedirect(
  supabase: Rpc & LooseFrom,
  productId: string,
  back: string
): Promise<void> {
  // 通常価格 (base_price) が 0 のまま公開させない (autosave の draft 段階では 0 許容だが、公開時は必須)
  const priceRes = await supabase.from('shop_products').select('base_price, brand_id').eq('id', productId).maybeSingle()
  const priceRow = priceRes.data as { base_price: number; brand_id: string } | null
  if (!priceRow || priceRow.base_price <= 0) redirect(`${back}?err=publish_requires_price`)

  // 画像
  const imgRes = await supabase.from('shop_product_images').select('id').eq('product_id', productId).limit(1)
  const hasImage = ((imgRes.data as unknown[] | null) ?? []).length > 0
  if (!hasImage) redirect(`${back}?err=publish_requires_image`)

  // active variant + inventory row
  const varRes = await supabase.from('shop_product_variants').select('id, status, shop_inventory(variant_id)').eq('product_id', productId)
  const variants = (varRes.data as Array<{ id: string; status: string; shop_inventory: { variant_id: string } | null }> | null) ?? []
  const activeWithInv = variants.filter((v) => v.status === 'active' && v.shop_inventory !== null)
  if (activeWithInv.length === 0) redirect(`${back}?err=publish_requires_variant`)

  const brandId = priceRow!.brand_id

  // Phase 2 (Migration 163): 販売事業者情報 + 配送・返品ポリシー を brand row から確認
  const brandRes = await supabase
    .from('shop_brands')
    .select('legal_name, legal_representative_name, legal_postal_code, legal_prefecture, legal_city, legal_address_line1, legal_phone, legal_email, dispatch_lead_days, return_accepted, return_days, exchange_accepted')
    .eq('id', brandId)
    .maybeSingle()
  const brandRow = brandRes.data as {
    legal_name: string | null; legal_representative_name: string | null;
    legal_postal_code: string | null; legal_prefecture: string | null; legal_city: string | null;
    legal_address_line1: string | null; legal_phone: string | null; legal_email: string | null;
    dispatch_lead_days: number | null; return_accepted: boolean | null; return_days: number | null;
    exchange_accepted: boolean | null;
  } | null
  if (!brandRow) redirect(`${back}?err=publish_requires_legal_info`)

  // 販売事業者情報: line2 以外の 8 項目必須 (Phase 1 で shop_brands に追加した legal_*)
  const legalRequired = brandRow!.legal_name && brandRow!.legal_representative_name
    && brandRow!.legal_postal_code && brandRow!.legal_prefecture && brandRow!.legal_city
    && brandRow!.legal_address_line1 && brandRow!.legal_phone && brandRow!.legal_email
  if (!legalRequired) redirect(`${back}?err=publish_requires_legal_info`)

  // 配送・返品ポリシー: 発送目安 + 返品受付判定 (accepted=true なら日数必須) + 交換受付
  if (brandRow!.dispatch_lead_days === null) redirect(`${back}?err=publish_requires_delivery_policy`)
  if (brandRow!.return_accepted === null)    redirect(`${back}?err=publish_requires_delivery_policy`)
  if (brandRow!.return_accepted === true && brandRow!.return_days === null) {
    redirect(`${back}?err=publish_requires_delivery_policy`)
  }
  if (brandRow!.exchange_accepted === null)  redirect(`${back}?err=publish_requires_delivery_policy`)

  // 有効な shipping rule (JP, is_active=true) が 1 件以上存在
  const shipRes = await supabase
    .from('shop_brand_shipping_rules')
    .select('id')
    .eq('brand_id', brandId)
    .limit(1)
  const shipRows = (shipRes.data as Array<{ id: string }> | null) ?? []
  if (shipRows.length === 0) redirect(`${back}?err=publish_requires_shipping`)
}

// =============================================================================
// createProductAction
// =============================================================================
export async function createProductAction(formData: FormData): Promise<void> {
  const { ctx, supabase } = await getContextAndClient()
  const brandId = assertUUID(ctx.currentBrand.brandId)
  const back = '/brand-admin/products/new'

  const name = trimOr(formData.get('name'), 200)
  const categoryId = String(formData.get('category_id') ?? '').trim()
  const description = trimOr(formData.get('description'), 2000)
  const isNew = String(formData.get('is_new') ?? '') === 'true'
  // 「次へ」button 押下時のみ STEP2 へ進む。autosave (intent 未指定) は STEP1 に留まる。
  //   これにより「基本情報を入力し終わっていないのに勝手に STEP2 へ進む」問題を防ぐ。
  const advanceStep = String(formData.get('intent') ?? '') === 'advance'
  const targetStep = advanceStep ? 2 : 1

  if (!name) redirect(`${back}?err=name_required`)
  if (!/^[0-9a-fA-F-]{36}$/.test(categoryId)) redirect(`${back}?err=category_not_found`)

  const { basePrice, compareAtPrice } = mapPricesOrError(formData, back)
  const finalBasePrice = basePrice ?? 0
  const finalCompareAtPrice = compareAtPrice

  // 新規商品は必ず draft (client からは status を受け取らない)。
  // published への遷移は publishProductAction、archived は archiveProductAction 経由のみ。
  const status: 'draft' = 'draft'

  const res = await supabase.rpc('shop_brand_create_product', {
    p_brand_id:         brandId,
    p_category_id:      categoryId,
    p_name:             name,
    p_description:      description.length > 0 ? description : null,
    p_base_price:       finalBasePrice,
    p_compare_at_price: finalCompareAtPrice,
    p_currency:         'JPY',
    p_status:           status,
    p_style_id_tags:    [],
    p_is_new:           isNew,
  })
  if (res.error) {
    console.error('[brand-admin/products] rpc create failed', res.error)
    redirect(`${back}?err=${encodeURIComponent(mapErrorCode(res.error.message))}`)
  }
  const newId = (res.data as string | null) ?? null
  revalidatePath('/brand-admin/products')
  if (newId) redirect(`/brand-admin/products/${newId}?saved=1&created=1&step=${targetStep}`)
  redirect('/brand-admin/products?saved=1')
}

// =============================================================================
// updateProductAction
// =============================================================================
export async function updateProductAction(formData: FormData): Promise<void> {
  const { supabase } = await getContextAndClient()
  const productId = assertUUID(formData.get('product_id'))
  const back = `/brand-admin/products/${productId}`

  const name = trimOr(formData.get('name'), 200)
  const categoryId = String(formData.get('category_id') ?? '').trim()
  const description = trimOr(formData.get('description'), 2000)
  const isNew = String(formData.get('is_new') ?? '') === 'true'

  if (!name) redirect(`${back}?err=name_required`)
  if (!/^[0-9a-fA-F-]{36}$/.test(categoryId)) redirect(`${back}?err=category_not_found`)

  const { basePrice, compareAtPrice } = mapPricesOrError(formData, back)

  // status / style_id_tags / (価格空欄時の) base_price / compare_at_price は Brand Admin UI から
  // 明示的に変更させない項目 → DB 現在値を必ず維持する
  const cur = await supabase.from('shop_products').select('brand_id, style_id_tags, status, base_price, compare_at_price').eq('id', productId).maybeSingle()
  const curRow = cur.data as { brand_id: string; style_id_tags: string[] | null; status: string; base_price: number; compare_at_price: number | null } | null
  if (!curRow) redirect(`${back}?err=product_not_found`)
  const preservedTags = (curRow!.style_id_tags ?? []) as string[]
  const status = curRow!.status
  // 価格未入力なら現在値を preserve (draft 段階 base_price=0 も保持)
  const finalBasePrice = basePrice ?? curRow!.base_price
  const finalCompareAtPrice = basePrice === null ? curRow!.compare_at_price : compareAtPrice

  const res = await supabase.rpc('shop_brand_update_product', {
    p_product_id:       productId,
    p_category_id:      categoryId,
    p_name:             name,
    p_description:      description.length > 0 ? description : null,
    p_base_price:       finalBasePrice,
    p_compare_at_price: finalCompareAtPrice,
    p_currency:         'JPY',
    p_status:           status,
    p_style_id_tags:    preservedTags,
    p_is_new:           isNew,
  })
  if (res.error) {
    console.error('[brand-admin/products] rpc update failed', res.error)
    redirect(`${back}?err=${encodeURIComponent(mapErrorCode(res.error.message))}`)
  }
  revalidatePath(back)
  return
}

// -----------------------------------------------------------------------------
// SKU 自動生成 (Brand Admin UI から SKU 手入力を撤廃したため server 側で生成)
// フォーマット: {BRAND3}-{PROD6}-{COLOR3}-{SIZE5}-{RAND4}
//   - 全て英数大文字、識別子として読める形
//   - RAND4 は crypto.randomUUID の hex 4 文字 (16^4 = 65536 通り) で
//     一意性の実務レベル担保
//   - unique_violation 発生時は最大 5 回まで regenerate + retry
// -----------------------------------------------------------------------------
function sanitizeSegment(s: string, keep: RegExp, max: number, fallback: string): string {
  const v = (s || '').toUpperCase().replace(keep, '').slice(0, max)
  return v.length > 0 ? v : fallback
}
function generateSku(brandSlug: string | null, productId: string, colorName: string, size: string): string {
  const bSeg = sanitizeSegment(brandSlug ?? 'BR', /[^A-Z0-9]/g, 3, 'BR')
  const pSeg = sanitizeSegment(productId.replace(/-/g, ''), /[^A-Z0-9]/g, 6, 'PROD')
  const cSeg = sanitizeSegment(colorName, /[^A-Z0-9]/g, 3, 'NA')
  const sSeg = sanitizeSegment(size.replace(/\./g, ''), /[^A-Z0-9]/g, 5, 'NA')
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 4).toUpperCase()
  return `${bSeg}-${pSeg}-${cSeg}-${sSeg}-${rand}`
}

// =============================================================================
// publishProductAction  (画面下部「商品を公開する」専用)
//   - 既存 fields を DB から fetch して shop_brand_update_product RPC に丸ごと渡す
//     (Brand Admin UI からは status='published' への遷移をここ一箇所に集約)
//   - 既存 assertPublishableOrRedirect で validation (画像 >=1、active variant >=1)
//   - RPC / permission / brand ownership は既存経路をそのまま利用 (新 RPC 追加なし)
// =============================================================================
export async function publishProductAction(formData: FormData): Promise<void> {
  const { supabase } = await getContextAndClient()
  const productId = assertUUID(formData.get('product_id'))
  const back = `/brand-admin/products/${productId}`

  const cur = await supabase.from('shop_products').select(
    'brand_id, category_id, name, description, base_price, compare_at_price, currency, style_id_tags, is_new, status'
  ).eq('id', productId).maybeSingle()
  const row = cur.data as {
    brand_id: string; category_id: string; name: string; description: string | null;
    base_price: number; compare_at_price: number | null; currency: string;
    style_id_tags: string[] | null; is_new: boolean; status: string
  } | null
  if (!row) redirect(`${back}?err=product_not_found`)
  if (row!.status === 'published') redirect(`${back}?err=already_published`)

  await assertPublishableOrRedirect(supabase, productId, back)

  const res = await supabase.rpc('shop_brand_update_product', {
    p_product_id:       productId,
    p_category_id:      row!.category_id,
    p_name:             row!.name,
    p_description:      row!.description,
    p_base_price:       row!.base_price,
    p_compare_at_price: row!.compare_at_price,
    p_currency:         row!.currency,
    p_status:           'published',
    p_style_id_tags:    row!.style_id_tags ?? [],
    p_is_new:           row!.is_new,
  })
  if (res.error) {
    console.error('[brand-admin/products] rpc publish failed', res.error)
    redirect(`${back}?err=${encodeURIComponent(mapErrorCode(res.error.message))}`)
  }
  revalidatePath(back)
  redirect(`${back}?saved=1&published=1`)
}

// =============================================================================
// archiveProductAction  (画面下部の「商品をアーカイブする」専用、危険操作)
//   status → 'archived' のみ。iOS 一覧から非表示、既存注文には影響なし。
// =============================================================================
export async function archiveProductAction(formData: FormData): Promise<void> {
  const { supabase } = await getContextAndClient()
  const productId = assertUUID(formData.get('product_id'))
  // 一覧「…」メニューから呼ばれた時は back='list' → 一覧へ redirect (既存詳細ページからの呼出は back 未指定で従来通り詳細へ戻る)
  const backFrom = String(formData.get('back') || '')
  const backList = `/brand-admin/products`
  const backDetail = `/brand-admin/products/${productId}`
  const back = backFrom === 'list' ? backList : backDetail

  const cur = await supabase.from('shop_products').select(
    'brand_id, category_id, name, description, base_price, compare_at_price, currency, style_id_tags, is_new, status'
  ).eq('id', productId).maybeSingle()
  const row = cur.data as {
    brand_id: string; category_id: string; name: string; description: string | null;
    base_price: number; compare_at_price: number | null; currency: string;
    style_id_tags: string[] | null; is_new: boolean; status: string
  } | null
  if (!row) redirect(`${back}?err=product_not_found`)
  if (row!.status === 'archived') {
    // 既 archived の場合、一覧経路では silent success (Optimistic UI と整合)、詳細経路では既存挙動維持
    if (backFrom === 'list') { revalidatePath(backList); redirect(`${backList}?saved=1&archived=1`) }
    redirect(`${back}?err=already_archived`)
  }

  const res = await supabase.rpc('shop_brand_update_product', {
    p_product_id:       productId,
    p_category_id:      row!.category_id,
    p_name:             row!.name,
    p_description:      row!.description,
    p_base_price:       row!.base_price,
    p_compare_at_price: row!.compare_at_price,
    p_currency:         row!.currency,
    p_status:           'archived',
    p_style_id_tags:    row!.style_id_tags ?? [],
    p_is_new:           row!.is_new,
  })
  if (res.error) {
    console.error('[brand-admin/products] rpc archive failed', res.error)
    redirect(`${back}?err=${encodeURIComponent(mapErrorCode(res.error.message))}`)
  }
  // list 経路は list を revalidate、詳細経路は詳細を revalidate
  revalidatePath(back)
  if (backFrom === 'list') { revalidatePath(backList) }
  redirect(`${back}?saved=1&archived=1`)
}

// =============================================================================
// deleteProductAction  (完全削除 = 本物の DELETE、注文履歴があると拒否)
// -----------------------------------------------------------------------------
//   一覧「…」メニュー「完全削除」から呼ばれる。owner/admin のみ許可、staff は forbidden。
//
//   Guard (すべて 0 件でなければ削除拒否):
//     1) shop_order_items.product_id = productId          → has_orders
//     2) shop_cart_items.variant_id  IN (product.variants)→ has_cart_items
//     3) shop_inventory_reservations.variant_id IN (...)  → has_reservations
//
//   Cascade order (FK 制約に合わせる):
//     1) collect storage_paths from shop_product_images
//     2) DELETE shop_product_variants WHERE product_id
//        (shop_inventory は CASCADE で自動削除、変数は Guard 済のため RESTRICT に当たらない)
//     3) DELETE shop_products WHERE id
//        (shop_product_images / shop_product_favorites は CASCADE、
//         shop_order_items は Guard 済のため RESTRICT に当たらない)
//     4) storage.remove(paths) — best-effort、DB 側は既に消えているので失敗しても続行
//
//   RLS bypass: shop_products は authenticated に DELETE grant が無いため
//     service_role (createAdminClient) を使う。以下 2 層防御:
//       ・in-code: role='owner'|'admin' + product.brand_id === ctx.brand.brandId
//       ・SQL: DELETE 句の WHERE に brand_id を含める (取り違え防止)
//
//   Production: SUPABASE_SERVICE_ROLE_KEY は Vercel env に設定済 (81 日前設定)。
// =============================================================================
export async function deleteProductAction(formData: FormData): Promise<void> {
  const ctx = await getBrandAdminContext()
  const productId = assertUUID(formData.get('product_id'))
  const backList = '/brand-admin/products'

  if (ctx.currentBrand.role !== 'owner' && ctx.currentBrand.role !== 'admin') {
    redirect(`${backList}?err=forbidden`)
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    redirect(`${backList}?err=service_role_missing`)
  }

  // deno-lint-ignore no-explicit-any
  const admin = createAdminClient() as unknown as any

  // 1) product 存在 + brand 一致確認
  const prod = await admin.from('shop_products').select('id, brand_id').eq('id', productId).maybeSingle()
  const row = prod.data as { id: string; brand_id: string } | null
  if (!row) redirect(`${backList}?err=product_not_found`)
  if (row!.brand_id !== ctx.currentBrand.brandId) redirect(`${backList}?err=forbidden`)

  // 2) 対象商品の variant id を全部取得 (guard + delete で使用)
  const varRes = await admin.from('shop_product_variants').select('id').eq('product_id', productId)
  const variantIds = ((varRes.data as { id: string }[] | null) ?? []).map((v) => v.id)

  // 3) Guard: 注文履歴
  const orderCheck = await admin
    .from('shop_order_items')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)
  if ((orderCheck.count ?? 0) > 0) {
    redirect(`${backList}?err=has_orders`)
  }

  // 4) Guard: cart / reservation (variant 経由、variant が 1 件でもあれば確認)
  if (variantIds.length > 0) {
    const cartCheck = await admin
      .from('shop_cart_items')
      .select('id', { count: 'exact', head: true })
      .in('variant_id', variantIds)
    if ((cartCheck.count ?? 0) > 0) {
      redirect(`${backList}?err=has_cart_items`)
    }
    const resCheck = await admin
      .from('shop_inventory_reservations')
      .select('id', { count: 'exact', head: true })
      .in('variant_id', variantIds)
    if ((resCheck.count ?? 0) > 0) {
      redirect(`${backList}?err=has_reservations`)
    }
  }

  // 5) storage_paths を先に取得 (DB DELETE 後に取れなくなるため)
  const imgRes = await admin.from('shop_product_images').select('storage_path').eq('product_id', productId)
  const storagePaths = ((imgRes.data as { storage_path: string }[] | null) ?? []).map((i) => i.storage_path)

  // 6) 子テーブル: shop_product_variants を先に DELETE (shop_inventory は CASCADE で自動削除)
  if (variantIds.length > 0) {
    const delVar = await admin
      .from('shop_product_variants')
      .delete()
      .eq('product_id', productId)
    if (delVar.error) {
      console.error('[brand-admin/products] delete variants failed', delVar.error)
      redirect(`${backList}?err=delete_variants_failed`)
    }
  }

  // 7) shop_products 本体 DELETE (shop_product_images / shop_product_favorites は CASCADE)
  //    WHERE 句に brand_id を追加して二重防御
  const delProd = await admin
    .from('shop_products')
    .delete()
    .eq('id', productId)
    .eq('brand_id', ctx.currentBrand.brandId)
  if (delProd.error) {
    console.error('[brand-admin/products] delete product failed', delProd.error)
    redirect(`${backList}?err=delete_product_failed`)
  }

  // 8) storage オブジェクト削除 (best-effort。DB は既に消えているので失敗しても続行)
  if (storagePaths.length > 0) {
    const storageRes = await admin.storage.from('shop-product-images').remove(storagePaths)
    if (storageRes.error) {
      console.warn('[brand-admin/products] storage remove failed (DB already deleted, orphan objects possible)', storageRes.error)
    }
  }

  revalidatePath(backList)
  redirect(`${backList}?saved=1&deleted=1`)
}

// =============================================================================
// revertToDraftAction  (published / archived → draft 手動戻し)
//   一覧「…」メニューの「下書きに戻す」から呼ばれる。owner/admin のみ許可
//   (server 側 shop_brand_update_product RPC が manager 権限を要求)。
//   既存 archiveProductAction と同じパターン: 現在値を SELECT して p_status='draft'
//   のみ差替、他 field は保持。
//   revalidate は一覧側 (/brand-admin/products) と詳細側の両方。
// =============================================================================
export async function revertToDraftAction(formData: FormData): Promise<void> {
  const { supabase } = await getContextAndClient()
  const productId = assertUUID(formData.get('product_id'))
  const backList = `/brand-admin/products`
  const backDetail = `/brand-admin/products/${productId}`

  const cur = await supabase.from('shop_products').select(
    'brand_id, category_id, name, description, base_price, compare_at_price, currency, style_id_tags, is_new, status'
  ).eq('id', productId).maybeSingle()
  const row = cur.data as {
    brand_id: string; category_id: string; name: string; description: string | null;
    base_price: number; compare_at_price: number | null; currency: string;
    style_id_tags: string[] | null; is_new: boolean; status: string
  } | null
  if (!row) redirect(`${backList}?err=product_not_found`)
  if (row!.status === 'draft') {
    revalidatePath(backList); redirect(`${backList}?saved=1`)
  }

  const res = await supabase.rpc('shop_brand_update_product', {
    p_product_id:       productId,
    p_category_id:      row!.category_id,
    p_name:             row!.name,
    p_description:      row!.description,
    p_base_price:       row!.base_price,
    p_compare_at_price: row!.compare_at_price,
    p_currency:         row!.currency,
    p_status:           'draft',
    p_style_id_tags:    row!.style_id_tags ?? [],
    p_is_new:           row!.is_new,
  })
  if (res.error) {
    console.error('[brand-admin/products] rpc revert-to-draft failed', res.error)
    redirect(`${backList}?err=${encodeURIComponent(mapErrorCode(res.error.message))}`)
  }
  revalidatePath(backList)
  revalidatePath(backDetail)
  redirect(`${backList}?saved=1`)
}

// =============================================================================
// revertSoldOutAction  (legacy sold_out → published 手動移行)
//   在庫切れは今後自動判定 (variant inventory ベース) に統一するため、
//   既存 sold_out 商品を published に戻す明示ボタン用。
//   publish validation は緩め (元 published → sold_out → published の復帰なので)。
// =============================================================================
export async function revertSoldOutAction(formData: FormData): Promise<void> {
  const { supabase } = await getContextAndClient()
  const productId = assertUUID(formData.get('product_id'))
  const back = `/brand-admin/products/${productId}`

  const cur = await supabase.from('shop_products').select(
    'brand_id, category_id, name, description, base_price, compare_at_price, currency, style_id_tags, is_new, status'
  ).eq('id', productId).maybeSingle()
  const row = cur.data as {
    brand_id: string; category_id: string; name: string; description: string | null;
    base_price: number; compare_at_price: number | null; currency: string;
    style_id_tags: string[] | null; is_new: boolean; status: string
  } | null
  if (!row) redirect(`${back}?err=product_not_found`)
  if (row!.status !== 'sold_out') redirect(`${back}?err=not_sold_out`)

  const res = await supabase.rpc('shop_brand_update_product', {
    p_product_id:       productId,
    p_category_id:      row!.category_id,
    p_name:             row!.name,
    p_description:      row!.description,
    p_base_price:       row!.base_price,
    p_compare_at_price: row!.compare_at_price,
    p_currency:         row!.currency,
    p_status:           'published',
    p_style_id_tags:    row!.style_id_tags ?? [],
    p_is_new:           row!.is_new,
  })
  if (res.error) redirect(`${back}?err=${encodeURIComponent(mapErrorCode(res.error.message))}`)
  revalidatePath(back)
  redirect(`${back}?saved=1&reverted=1`)
}

// =============================================================================
// upsertVariantAction (variant + inventory)
// SKU は client から送らず、server 側で:
//   新規: auto-generate (unique_violation なら最大 5 回 retry)
//   既存: 現行 DB 値を fetch して保持 (勝手にリネームしない)
// =============================================================================
export async function upsertVariantAction(formData: FormData): Promise<void> {
  const { ctx, supabase } = await getContextAndClient()
  const productId = assertUUID(formData.get('product_id'))
  const back = `/brand-admin/products/${productId}`

  const variantIdRaw = String(formData.get('variant_id') ?? '').trim()
  const variantId = variantIdRaw.length > 0 ? assertUUID(variantIdRaw) : null
  const size = trimOr(formData.get('size'), 60)
  const colorName = trimOr(formData.get('color_name'), 60)
  const colorHex = trimOr(formData.get('color_hex'), 20)
  const status = toVariantStatus(formData.get('status'))
  const qty = toInt(formData.get('quantity_available'))

  if (size.length === 0) redirect(`${back}?err=size_required`)
  if (colorName.length === 0) redirect(`${back}?err=color_required`)
  if (!status) redirect(`${back}?err=invalid_status`)
  if (!Number.isFinite(qty) || qty < 0) redirect(`${back}?err=invalid_quantity`)

  // SKU + variant.price 決定
  //   variant.price は Brand Admin UI から編集不可のため、
  //   新規: null (checkout は coalesce(variant.price, product.base_price) で fallback)
  //   既存: DB 現在値を preserve
  let sku: string
  let priceRaw: number | null = null
  if (variantId === null) {
    sku = generateSku(ctx.currentBrand.brandSlug, productId, colorName, size)
    priceRaw = null
  } else {
    const cur = await supabase.from('shop_product_variants').select('sku, product_id, price').eq('id', variantId).maybeSingle()
    const row = cur.data as { sku: string; product_id: string; price: number | null } | null
    if (!row || row.product_id !== productId) redirect(`${back}?err=variant_not_found`)
    sku = row!.sku
    priceRaw = row!.price   // 既存 variant.price を維持
  }

  // RPC 経路 (新規時は unique_violation → sku 再生成 retry)
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await supabase.rpc('shop_brand_upsert_variant', {
      p_product_id:         productId,
      p_variant_id:         variantId,
      p_sku:                sku,
      p_size:               size.length > 0 ? size : null,
      p_color_name:         colorName.length > 0 ? colorName : null,
      p_color_hex:          colorHex.length > 0 ? colorHex : null,
      p_price:              priceRaw,
      p_status:             status,
      p_quantity_available: qty,
    })
    if (!res.error) {
      revalidatePath(back)
      return
    }
    if (variantId === null && /sku_already_used/i.test(res.error.message)) {
      sku = generateSku(ctx.currentBrand.brandSlug, productId, colorName, size)
      continue
    }
    console.error('[brand-admin/products] rpc upsert variant failed', res.error)
    redirect(`${back}?err=${encodeURIComponent(mapErrorCode(res.error.message))}`)
  }
  redirect(`${back}?err=sku_generation_failed`)
}

// =============================================================================
// deleteVariantAction  (誤って作った未使用 variant の物理 DELETE)
//   - order_items / cart_items で参照されている variant は削除禁止
//     (該当時は「販売停止」に切替るよう UI 側でメッセージ表示)
//   - quantity_reserved > 0 も削除禁止 (checkout 中のロック)
//   - shop_inventory は on delete cascade で連動削除
//   - server-side で ctx.currentBrand.brandId 一致 + owner/admin role を検証
// =============================================================================
export async function deleteVariantAction(formData: FormData): Promise<void> {
  const ctx = await getBrandAdminContext()
  // DELETE 権限は authenticated に無いため admin client (service_role) を使い、
  // brand ownership / role を server-side で必ず検証する。
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    redirect('/brand-admin/products?err=service_role_missing')
  }
  const admin = createAdminClient() as unknown as (Rpc & LooseFrom)
  const productId = assertUUID(formData.get('product_id'))
  const variantId = assertUUID(formData.get('variant_id'))
  const back = `/brand-admin/products/${productId}`

  // (a) product の brand が currentBrand と一致すること
  const prodRes = await admin.from('shop_products').select('brand_id').eq('id', productId).maybeSingle()
  const prodRow = prodRes.data as { brand_id: string } | null
  if (!prodRow) redirect(`${back}?err=product_not_found`)
  if (prodRow!.brand_id !== ctx.currentBrand.brandId) redirect(`${back}?err=forbidden`)

  // (b) owner / admin のみ
  if (!(ctx.currentBrand.role === 'owner' || ctx.currentBrand.role === 'admin')) {
    redirect(`${back}?err=forbidden`)
  }

  // (c) variant が対象 product 配下であること (他 product 経由の書換防御)
  const varRes = await admin.from('shop_product_variants').select('id, product_id').eq('id', variantId).maybeSingle()
  const varRow = varRes.data as { id: string; product_id: string } | null
  if (!varRow || varRow.product_id !== productId) redirect(`${back}?err=variant_not_found`)

  // (d) reservation チェック (checkout 中の予約が残っていたら delete しない)
  const invRes = await admin.from('shop_inventory').select('quantity_reserved').eq('variant_id', variantId).maybeSingle()
  const invRow = invRes.data as { quantity_reserved: number } | null
  if (invRow && invRow.quantity_reserved > 0) redirect(`${back}?err=variant_in_use_reserved`)

  // (e) 注文履歴で参照されていないか
  const oiRes = await admin.from('shop_order_items').select('id').eq('variant_id', variantId).limit(1)
  const orderRefs = ((oiRes.data as unknown[] | null) ?? [])
  if (orderRefs.length > 0) redirect(`${back}?err=variant_in_use_order`)

  // (f) 他ユーザーの cart で参照されていないか
  const ciRes = await admin.from('shop_cart_items').select('id').eq('variant_id', variantId).limit(1)
  const cartRefs = ((ciRes.data as unknown[] | null) ?? [])
  if (cartRefs.length > 0) redirect(`${back}?err=variant_in_use_cart`)

  // (g) DELETE (shop_inventory は cascade で連動削除)
  const delOp = await admin.from('shop_product_variants').delete().eq('id', variantId)
  if (delOp.error) {
    console.error('[brand-admin/products] variant delete failed', delOp.error)
    redirect(`${back}?err=update_failed`)
  }

  revalidatePath(back)
  redirect(`${back}?saved=1&deleted=1`)
}

// =============================================================================
// archiveVariantAction  (物理 delete しない、既存互換のみ保持)
// =============================================================================
export async function archiveVariantAction(formData: FormData): Promise<void> {
  const { supabase } = await getContextAndClient()
  const productId = assertUUID(formData.get('product_id'))
  const variantId = assertUUID(formData.get('variant_id'))
  const back = `/brand-admin/products/${productId}`

  const res = await supabase.rpc('shop_brand_archive_variant', { p_variant_id: variantId })
  if (res.error) redirect(`${back}?err=${encodeURIComponent(mapErrorCode(res.error.message))}`)
  revalidatePath(back)
  redirect(`${back}?saved=1`)
}

// =============================================================================
// updateInventoryAction  (quantity_available のみ)
// =============================================================================
export async function updateInventoryAction(formData: FormData): Promise<void> {
  const { supabase } = await getContextAndClient()
  const productId = assertUUID(formData.get('product_id'))
  const variantId = assertUUID(formData.get('variant_id'))
  const qty = toInt(formData.get('quantity_available'))
  const back = `/brand-admin/products/${productId}`
  if (!Number.isFinite(qty) || qty < 0) redirect(`${back}?err=invalid_quantity`)

  const res = await supabase.rpc('shop_brand_update_inventory', {
    p_variant_id: variantId, p_quantity_available: qty,
  })
  if (res.error) redirect(`${back}?err=${encodeURIComponent(mapErrorCode(res.error.message))}`)
  revalidatePath(back)
  redirect(`${back}?saved=1`)
}

// =============================================================================
// uploadImageAction  (max 5 枚制限、file upload + row insert)
// =============================================================================
export async function uploadImageAction(formData: FormData): Promise<void> {
  const { ctx, supabase } = await getContextAndClient()
  const productId = assertUUID(formData.get('product_id'))
  // 画像操作は必ず STEP2 UI 上で発火する。redirect に step=2 を含めないと
  // 完了後 STEP1 (=default) に戻ってしまうため、成功/失敗どちらも step=2 で戻す。
  const back = `/brand-admin/products/${productId}?step=2`
  const brandId = ctx.currentBrand.brandId

  // 5 枚上限チェック
  const cnt = await supabase.from('shop_product_images').select('id').eq('product_id', productId).limit(MAX_IMAGES_PER_PRODUCT + 1)
  const existing = ((cnt.data as unknown[] | null) ?? [])
  if (existing.length >= MAX_IMAGES_PER_PRODUCT) {
    redirect(`${back}&err=too_many_images`)
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) redirect(`${back}&err=file_required`)
  const f = file as File
  if (f.size > 8 * 1024 * 1024) redirect(`${back}&err=file_too_large`)
  const contentType = f.type || 'application/octet-stream'
  if (!contentType.startsWith('image/')) redirect(`${back}&err=not_image`)

  const nameParts = f.name.split('.')
  const ext = nameParts.length > 1 ? nameParts[nameParts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '') : 'bin'
  const rand = crypto.randomUUID()
  const path = `${brandId}/${productId}/${rand}.${ext}`

  const up = await supabase.storage.from('shop-product-images').upload(path, f, {
    contentType,
    upsert: false,
  })
  if (up.error) {
    console.error('[brand-admin/products] image upload failed', up.error)
    redirect(`${back}&err=upload_failed`)
  }

  const isPrimary = existing.length === 0
  // 追加行の image_id を取得して redirect param に載せる (Grid 側で crop editor を auto-open)
  let newImageId: string | null = null
  const res = await supabase.rpc('shop_brand_add_product_image', {
    p_product_id: productId,
    p_storage_path: path,
    p_sort_order: existing.length,
    p_is_primary: isPrimary,
  })
  if (res.error) {
    await supabase.storage.from('shop-product-images').remove([path]).catch(() => {})
    console.error('[brand-admin/products] rpc add image failed', res.error)
    redirect(`${back}&err=${encodeURIComponent(mapErrorCode(res.error.message))}`)
  }
  // RPC は新規 image UUID を返す (Migration 130)
  const raw = res.data
  if (typeof raw === 'string' && /^[0-9a-fA-F-]{36}$/.test(raw)) {
    newImageId = raw
  }
  // revalidate は step クエリなしの base path で
  revalidatePath(`/brand-admin/products/${productId}`)
  const uploadedParam = newImageId ? `&just_uploaded=${encodeURIComponent(newImageId)}` : ''
  redirect(`${back}&saved=1${uploadedParam}`)
}

// =============================================================================
// setPrimaryImageAction  (unique index 対応の原子的 primary 切替)
// =============================================================================
export async function setPrimaryImageAction(formData: FormData): Promise<void> {
  const { supabase } = await getContextAndClient()
  const productId = assertUUID(formData.get('product_id'))
  const imageId = assertUUID(formData.get('image_id'))
  // 画像操作は STEP2 UI 上で発火するため redirect にも step=2 を保持
  const back = `/brand-admin/products/${productId}?step=2`

  const res = await supabase.rpc('shop_brand_set_primary_image', { p_image_id: imageId })
  if (res.error) {
    console.error('[brand-admin/products] rpc set primary failed', res.error)
    redirect(`${back}&err=${encodeURIComponent(mapErrorCode(res.error.message))}`)
  }
  revalidatePath(`/brand-admin/products/${productId}`)
  redirect(`${back}&saved=1`)
}

// =============================================================================
// deleteImageAction
// =============================================================================
export async function deleteImageAction(formData: FormData): Promise<void> {
  const { supabase } = await getContextAndClient()
  const productId = assertUUID(formData.get('product_id'))
  const imageId = assertUUID(formData.get('image_id'))
  // 画像操作は STEP2 UI 上で発火するため redirect にも step=2 を保持
  const back = `/brand-admin/products/${productId}?step=2`

  const res = await supabase.rpc('shop_brand_delete_product_image', { p_image_id: imageId })
  if (res.error) redirect(`${back}&err=${encodeURIComponent(mapErrorCode(res.error.message))}`)
  const storagePath = (res.data as string | null) ?? null

  if (storagePath) {
    const rm = await supabase.storage.from('shop-product-images').remove([storagePath])
    if (rm.error) console.warn('[brand-admin/products] storage remove failed (row already deleted)', rm.error)
  }
  revalidatePath(`/brand-admin/products/${productId}`)
  redirect(`${back}&saved=1`)
}

// =============================================================================
// updateImageCropAction (Migration 137)
//   4:5 crop 値 (zoom / offset_x / offset_y) を shop_product_images に upsert。
//   通常経路は shop_brand_update_image_crop RPC (owner/admin 検証、SECURITY DEFINER)。
//   Dev Bypass 経路は admin client で直接 UPDATE。
//   RSC 全体再描画は避け throw しない (Client 側で optimistic update する)。
//
// 【error 方針】
//   他 action と同じく Postgres / Storage の生 message を client へ throw せず、
//   snake_case な error code だけを throw する。詳細は console.error に残す。
//   client 側 (ShopImageCropEditor) は code を判定せず「保存に失敗しました」の
//   固定文言を出す (現時点 crop 特有の user 分岐は不要)。
// =============================================================================
export async function updateImageCropAction(formData: FormData): Promise<void> {
  const { supabase } = await getContextAndClient()
  const imageId = assertUUID(formData.get('image_id'))
  const zoom    = Number(formData.get('crop_zoom'))
  const offX    = Number(formData.get('crop_offset_x'))
  const offY    = Number(formData.get('crop_offset_y'))
  if (!Number.isFinite(zoom) || zoom < 1.0 || zoom > 5.0) throw new Error('invalid_zoom')
  if (!Number.isFinite(offX) || offX < -1.0 || offX > 1.0) throw new Error('invalid_offset_x')
  if (!Number.isFinite(offY) || offY < -1.0 || offY > 1.0) throw new Error('invalid_offset_y')

  const res = await supabase.rpc('shop_brand_update_image_crop', {
    p_image_id: imageId,
    p_zoom: zoom,
    p_offset_x: offX,
    p_offset_y: offY,
  })
  if (res.error) {
    console.error('[brand-admin/products] rpc crop update failed', res.error)
    throw new Error(mapErrorCode(res.error.message))
  }
}
