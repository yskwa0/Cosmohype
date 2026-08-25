'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getBrandAdminContext } from '@/lib/brandAdmin'

// Dev Bypass 撤去済 (Production Supabase 一本運用)。
// createAdminClient は「brand 画像 upload の storage RLS gap 回避 (Migration 145 の未整備を
// 補うため)」でのみ引き続き使用。 DB write 系はすべて SECURITY DEFINER RPC 経由に統一。

function trimOrEmpty(v: FormDataEntryValue | null, max = 200): string {
  return String(v ?? '').trim().slice(0, max)
}

function assertUUID(v: unknown): string {
  const s = String(v ?? '')
  if (!/^[0-9a-fA-F-]{36}$/.test(s)) throw new Error('invalid_uuid')
  return s
}

/**
 * 郵便番号 normalize + validate。
 * ハイフンあり/なしどちらでも受け取り、数字 7 桁でなければ null を返す。
 */
function normalizePostal(v: string): string | null {
  const stripped = v.replace(/[-ー－\s]/g, '')
  if (!/^\d{7}$/.test(stripped)) return null
  return stripped
}

/**
 * 返品先住所を更新する Server Action。
 *
 * 経路:
 *   Dev Bypass: URBAN NOTE 固定 brand_id + admin client で直接 UPDATE
 *               (auth session なしで通す唯一の抜け道、Production では発火不可)
 *   通常:       shop_brand_update_return_address SECURITY DEFINER RPC 経由。
 *               RPC 内で owner/admin role 検証 → staff 拒否。
 */
export async function updateReturnAddressAction(formData: FormData): Promise<void> {
  const returnUrl = '/brand-admin/settings'

  // 入力値 (client 側 validation もあるが server で最終保証)
  const recipient = trimOrEmpty(formData.get('return_recipient_name'))
  const postalRaw = trimOrEmpty(formData.get('return_postal_code'), 20)
  const prefecture = trimOrEmpty(formData.get('return_prefecture'))
  const city = trimOrEmpty(formData.get('return_city'))
  const line1 = trimOrEmpty(formData.get('return_address_line1'))
  const line2 = trimOrEmpty(formData.get('return_address_line2')) // optional
  const phone = trimOrEmpty(formData.get('return_phone'), 30)

  // 必須項目
  if (!recipient || !postalRaw || !prefecture || !city || !line1 || !phone) {
    redirect(`${returnUrl}?err=required_field_missing`)
  }

  const postal = normalizePostal(postalRaw)
  if (!postal) {
    redirect(`${returnUrl}?err=invalid_postal_code`)
  }

  const ctx = await getBrandAdminContext()
  const brandId = assertUUID(ctx.currentBrand.brandId)
  const supabase = await createClient()
  const { error } = await (
    supabase as unknown as {
      rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
    }
  ).rpc('shop_brand_update_return_address', {
    p_brand_id: brandId,
    p_return_recipient_name: recipient,
    p_return_postal_code: postal,
    p_return_prefecture: prefecture,
    p_return_city: city,
    p_return_address_line1: line1,
    p_return_address_line2: line2.length > 0 ? line2 : null,
    p_return_phone: phone,
  })
  if (error) {
    const msg = error.message.toLowerCase()
    let code: string = 'update_failed'
    if (msg.includes('forbidden')) code = 'forbidden'
    else if (msg.includes('not_authenticated')) code = 'not_authenticated'
    else if (msg.includes('required_field_missing')) code = 'required_field_missing'
    console.error('[brand-admin/settings] rpc update failed', error)
    redirect(`${returnUrl}?err=${encodeURIComponent(code)}`)
  }

  revalidatePath(returnUrl)
  redirect(`${returnUrl}?saved=1`)
}

/**
 * 送料ルールを upsert する Server Action。
 * (Migration 136 で追加された shop_brand_upsert_shipping_rule RPC 経由)
 *
 * 経路:
 *   Dev Bypass: URBAN NOTE 固定 brand_id + admin client で直接 upsert
 *   通常:       shop_brand_upsert_shipping_rule SECURITY DEFINER RPC 経由。
 *               RPC 内で owner/admin role 検証 → staff 拒否。
 */
export async function updateShippingRulesAction(formData: FormData): Promise<void> {
  const returnUrl = '/brand-admin/settings'

  function readNonNegInt(k: string): number | null {
    const raw = String(formData.get(k) ?? '').trim()
    if (raw.length === 0) return null
    if (!/^\d+$/.test(raw)) return null
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0) return null
    return n
  }

  // 「完全送料無料」toggle: flat_rate=0 / 地域列=NULL / 閾値=NULL を強制送出
  const completelyFree = String(formData.get('completely_free') ?? '') === '1'

  let flatRate: number
  let freeThreshold: number | null
  let rHok: number | null, rToh: number | null, rKan: number | null
  let rChu: number | null, rKin: number | null, rCg: number | null
  let rShi: number | null, rKyu: number | null, rOki: number | null

  if (completelyFree) {
    flatRate = 0
    freeThreshold = null
    rHok = rToh = rKan = rChu = rKin = rCg = rShi = rKyu = rOki = null
  } else {
    const fl = readNonNegInt('flat_rate')
    if (fl === null) {
      redirect(`${returnUrl}?err=shipping_flat_required`)
    }
    flatRate = fl as number
    freeThreshold = readNonNegInt('free_shipping_threshold')
    // 閾値 0 は「常に無料」と等価で flat_rate=0 と重複するため拒否
    if (freeThreshold !== null && freeThreshold <= 0) {
      redirect(`${returnUrl}?err=shipping_threshold_positive`)
    }
    rHok = readNonNegInt('rate_hokkaido')
    rToh = readNonNegInt('rate_tohoku')
    rKan = readNonNegInt('rate_kanto')
    rChu = readNonNegInt('rate_chubu')
    rKin = readNonNegInt('rate_kinki')
    rCg  = readNonNegInt('rate_chugoku')
    rShi = readNonNegInt('rate_shikoku')
    rKyu = readNonNegInt('rate_kyushu')
    rOki = readNonNegInt('rate_okinawa')
  }

  const ctx = await getBrandAdminContext()
  const brandId = assertUUID(ctx.currentBrand.brandId)
  const supabase = await createClient()
  const { error } = await (
    supabase as unknown as {
      rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
    }
  ).rpc('shop_brand_upsert_shipping_rule', {
    p_brand_id: brandId,
    p_flat_rate: flatRate,
    p_free_shipping_threshold: freeThreshold,
    p_rate_hokkaido: rHok,
    p_rate_tohoku:   rToh,
    p_rate_kanto:    rKan,
    p_rate_chubu:    rChu,
    p_rate_kinki:    rKin,
    p_rate_chugoku:  rCg,
    p_rate_shikoku:  rShi,
    p_rate_kyushu:   rKyu,
    p_rate_okinawa:  rOki,
  })
  if (error) {
    const msg = error.message.toLowerCase()
    let code = 'shipping_update_failed'
    if (msg.includes('forbidden')) code = 'forbidden'
    else if (msg.includes('not_authenticated')) code = 'not_authenticated'
    else if (msg.includes('invalid_flat_rate')) code = 'shipping_flat_required'
    console.error('[brand-admin/settings] rpc shipping upsert failed', error)
    redirect(`${returnUrl}?err=${encodeURIComponent(code)}`)
  }

  revalidatePath(returnUrl)
  redirect(`${returnUrl}?saved=shipping`)
}

// =============================================================================
// updateBrandProfileAction  (Migration 147: ブランドプロフィール編集)
//
// フォーム入力:
//   ・name / description (Migration 146 継承)
//   ・logo_file / cover_file (任意、`shop-brand-assets` bucket に固定 path で upsert=true)
//   ・logo_crop_zoom / logo_crop_offset_x / logo_crop_offset_y (Migration 147、client editor)
//   ・cover_crop_zoom / cover_crop_offset_x / cover_crop_offset_y (Migration 147、client editor)
//
// **Migration 147 変更点**: Website / Instagram URL は完全撤去 (HYPE 内購入導線保護)。
// `shop_brands.website_url` / `instagram_url` 列は残存するが、本 action からは書込しない。
// RPC も 11 引数版 (name + description + logo/cover path + crop 6) に整理済で、website/
// instagram を含まないため server 側でも書換不可能。
//
// Dev Bypass 経路: URBAN NOTE 固定 brand_id + admin client で直接 storage upload +
// shop_brands direct update (website/instagram は含めない = 既存値を破壊しない)。
// 通常経路: getBrandAdminContext() 経由で自 brand_id 解決 + shop_brand_update_profile RPC。
// =============================================================================
export async function updateBrandProfileAction(formData: FormData): Promise<void> {
  const returnUrl = '/brand-admin/settings'

  // Migration 146: ブランド名 (name) 必須 + 100 文字上限 (server 側 RPC でも再検証)
  const brandName = trimOrEmpty(formData.get('name'), 100)
  if (brandName.length === 0) {
    redirect(`${returnUrl}?err=name_required`)
  }
  const description = trimOrEmpty(formData.get('description'), 2000)
  const existingLogoPath  = trimOrEmpty(formData.get('existing_logo_path'), 500)
  const existingCoverPath = trimOrEmpty(formData.get('existing_cover_path'), 500)

  // Migration 147: crop 値の parse + clamp (server 側で防御、RPC でも重ねて clamp)
  function readClamped(name: string, def: number, lo: number, hi: number): number {
    const raw = String(formData.get(name) ?? '').trim()
    if (raw.length === 0) return def
    const n = Number(raw)
    if (!Number.isFinite(n)) return def
    return Math.min(hi, Math.max(lo, n))
  }
  const logoZoom     = readClamped('logo_crop_zoom',      1.0, 1.0,  3.0)
  const logoOffX     = readClamped('logo_crop_offset_x',  0.0, -1.0, 1.0)
  const logoOffY     = readClamped('logo_crop_offset_y',  0.0, -1.0, 1.0)
  const coverZoom    = readClamped('cover_crop_zoom',     1.0, 1.0,  3.0)
  const coverOffX    = readClamped('cover_crop_offset_x', 0.0, -1.0, 1.0)
  const coverOffY    = readClamped('cover_crop_offset_y', 0.0, -1.0, 1.0)

  const brandId = assertUUID((await getBrandAdminContext()).currentBrand.brandId)
  const supabase = await createClient()

  // 画像 upload ヘルパ (既存 uploadImageAction と同じ upsert / contentType 検証パターン)
  //
  // **2026-08-19 hotfix**: shop-brand-assets bucket は Migration 145 の実装計画
  // (コメント「別 turn で bucket policy 追加」) が Production へ反映されないまま
  // 稼働しており、通常経路の user client での upload は
  // `storage.objects` の per-brand INSERT policy が無いため 403
  // (StorageApiError: "new row violates row-level security policy") で必ず失敗する。
  //
  // 対策として本 upload だけ admin client (SERVICE_ROLE_KEY) 経由に切替える。
  // これは security definer RPC と同じ形の "server 側で権限検証済 → 検証済 path
  // だけを storage に書く" パターン:
  //   1. 認可は本 action の先頭で getBrandAdminContext() が owner/admin を検証
  //      (staff / 非 member / 未認証は forbidden で先に redirect 済)
  //   2. brandId は server 側で解決した validated UUID
  //   3. path は `${brandId}/${kind}.${ext}` に固定、他 brand の folder には
  //      物理的に書き込めない
  // よって RLS を bypass しても brand-scoped の分離は担保される。
  // 恒久対策として shop-product-images と同形の RLS policy を storage.objects に
  // 追加する新規 migration が別途あれば、本関数は普通の user client に戻せる。
  async function uploadIfPresent(field: string, kind: 'logo' | 'cover', existingPath: string): Promise<string | null> {
    const file = formData.get(field)
    if (!(file instanceof File) || file.size === 0) {
      // 未アップロード: 既存 path をそのまま維持 (空欄なら null で明示 clear)
      return existingPath.length > 0 ? existingPath : null
    }
    const f = file as File
    if (f.size > 8 * 1024 * 1024) redirect(`${returnUrl}?err=file_too_large`)
    const contentType = f.type || 'application/octet-stream'
    if (!contentType.startsWith('image/')) redirect(`${returnUrl}?err=not_image`)

    const nameParts = f.name.split('.')
    const ext = nameParts.length > 1
      ? nameParts[nameParts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '')
      : 'bin'
    const path = `${brandId}/${kind}.${ext}`

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error(`[brand-admin/settings] ${kind} upload skipped: SUPABASE_SERVICE_ROLE_KEY missing`)
      redirect(`${returnUrl}?err=service_role_missing`)
    }
    const admin = createAdminClient() as unknown as {
      storage: { from: (b: string) => {
        upload: (p: string, f: File, o: { contentType: string; upsert: boolean }) =>
          Promise<{ error: { message: string } | null }>
      } }
    }
    const up = await admin.storage.from('shop-brand-assets').upload(path, f, {
      contentType,
      upsert: true,   // 同 brand_id/<kind>.<ext> は同一 path で上書き
    })
    if (up.error) {
      console.error(`[brand-admin/settings] ${kind} upload failed`, up.error)
      redirect(`${returnUrl}?err=upload_failed`)
    }
    return path
  }

  const logoPath  = await uploadIfPresent('logo_file',  'logo',  existingLogoPath)
  const coverPath = await uploadIfPresent('cover_file', 'cover', existingCoverPath)

  // Migration 147: RPC は 11 引数版 (name + description + logo/cover path + crop 6)。
  // website / instagram は本 RPC の関心外、送出しない = server 側でも書換不可。
  const { error } = await (
    supabase as unknown as {
      rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
    }
  ).rpc('shop_brand_update_profile', {
    p_brand_id:             brandId,
    p_name:                 brandName,
    p_description:          description.length > 0 ? description : null,
    p_logo_path:            logoPath,
    p_cover_path:           coverPath,
    p_logo_crop_zoom:       logoZoom,
    p_logo_crop_offset_x:   logoOffX,
    p_logo_crop_offset_y:   logoOffY,
    p_cover_crop_zoom:      coverZoom,
    p_cover_crop_offset_x:  coverOffX,
    p_cover_crop_offset_y:  coverOffY,
  })
  if (error) {
    const msg = error.message.toLowerCase()
    let code: string = 'update_failed'
    if (msg.includes('forbidden'))         code = 'forbidden'
    else if (msg.includes('not_authenticated')) code = 'not_authenticated'
    else if (msg.includes('name_required'))     code = 'name_required'
    else if (msg.includes('name_too_long'))     code = 'name_too_long'
    console.error('[brand-admin/settings] rpc profile update failed', error)
    redirect(`${returnUrl}?err=${encodeURIComponent(code)}`)
  }

  revalidatePath(returnUrl)
  redirect(`${returnUrl}?saved=profile`)
}

// =============================================================================
// updateBrandSocialLinksAction  (Migration 162: 公式サイト URL / Instagram URL)
//
// フォーム入力:
//   ・website_url    text?  http(s)://... 形式のみ、空 → NULL
//   ・instagram_url  text?  https?://(www.)?instagram.com/... のみ、空 → NULL
//
// server / client 両方で validate:
//   ・client (BrandSocialLinksForm.tsx) は UX、送信ボタン disable
//   ・本 action は最終防波堤: pattern match + 長さ 500 char 上限
//   ・RPC 側 (shop_brand_update_social_links) がさらに三重にチェック
//
// 独立 RPC のため shop_brand_update_profile (11 引数版) には一切触れない = 既存
// name/description/logo/cover の保存フローと副作用を分離する。
// Dev Bypass 経路: 固定 brand_id + admin client で shop_brands 直 UPDATE。
// 通常経路: RPC shop_brand_update_social_links (SECURITY DEFINER + owner/admin gate)。
// =============================================================================

const WEBSITE_RE   = /^https?:\/\/[^\s]+$/i
const INSTAGRAM_RE = /^https?:\/\/(www\.)?instagram\.com\/[^\s]*$/i
const SOCIAL_MAX   = 500

/** 入力を trim → 空文字は null、非空なら 500 char 上限で slice。 */
function normalizeUrlInput(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? '').trim()
  if (s.length === 0) return null
  return s.slice(0, SOCIAL_MAX + 1) // 501 になったら pattern match で拒否
}

export async function updateBrandSocialLinksAction(formData: FormData): Promise<void> {
  const returnUrl = '/brand-admin/settings'

  const websiteInput   = normalizeUrlInput(formData.get('website_url'))
  const instagramInput = normalizeUrlInput(formData.get('instagram_url'))

  // 長さ + パターン (RPC 側も enforce するが手前で早期 return)
  if (websiteInput !== null) {
    if (websiteInput.length > SOCIAL_MAX) {
      redirect(`${returnUrl}?err=website_url_too_long`)
    }
    if (!WEBSITE_RE.test(websiteInput)) {
      redirect(`${returnUrl}?err=website_url_invalid`)
    }
  }
  if (instagramInput !== null) {
    if (instagramInput.length > SOCIAL_MAX) {
      redirect(`${returnUrl}?err=instagram_url_too_long`)
    }
    if (!INSTAGRAM_RE.test(instagramInput)) {
      redirect(`${returnUrl}?err=instagram_url_invalid`)
    }
  }

  // Production 一本運用: Dev Bypass 経路は本 action から意図的に削除。
  // 通常経路のみ = getBrandAdminContext() で認証済 owner/admin を検証し、
  // 常に SECURITY DEFINER RPC (shop_brand_update_social_links) を叩く。
  // Vercel Production / local dev いずれも .env の NEXT_PUBLIC_SUPABASE_URL に沿って
  // 動くため、Test project に書込む余地を残さない。
  const brandId = assertUUID((await getBrandAdminContext()).currentBrand.brandId)
  const supabase = await createClient()

  const { error } = await (
    supabase as unknown as {
      rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
    }
  ).rpc('shop_brand_update_social_links', {
    p_brand_id:      brandId,
    p_website_url:   websiteInput,
    p_instagram_url: instagramInput,
  })
  if (error) {
    const msg = error.message.toLowerCase()
    let code: string = 'update_failed'
    if (msg.includes('forbidden'))                    code = 'forbidden'
    else if (msg.includes('not_authenticated'))       code = 'not_authenticated'
    else if (msg.includes('website_url_too_long'))    code = 'website_url_too_long'
    else if (msg.includes('instagram_url_too_long'))  code = 'instagram_url_too_long'
    else if (msg.includes('website_url_invalid'))     code = 'website_url_invalid'
    else if (msg.includes('instagram_url_invalid'))   code = 'instagram_url_invalid'
    console.error('[brand-admin/settings] rpc social links update failed', error)
    redirect(`${returnUrl}?err=${encodeURIComponent(code)}`)
  }

  revalidatePath(returnUrl)
  redirect(`${returnUrl}?saved=social`)
}

// =============================================================================
// updateBrandLegalInfoAction  (Migration 163 / 166: 特商法表記 販売事業者情報)
//
// 【保存ルール — Phase 4 更新: 途中保存廃止 / 保存時全必須】
//   ・販売者区分 + 区分別必須項目がすべて入っていないと保存不可
//   ・必須 (両区分共通): legal_name / legal_postal_code / legal_prefecture / legal_city
//                        / legal_address_line1 / legal_phone / legal_email
//   ・必須 (法人のみ):    legal_representative_name
//   ・任意:               legal_address_line2 (建物名等)
//
//   client 側 (BrandLegalInfoForm.tsx canSubmit) と同じルールを本 action で再検証
//   (client disable の bypass に耐える二重防波堤)。 商品公開 gate
//   (assertPublishableOrRedirect) は撤去せず据え置き = 三重防御。
//
// 各種形式検証:
//   ・legal_postal_code   RPC で数字 7 桁に正規化 (invalid → invalid_legal_postal_code)
//   ・legal_phone         digits / - / 空白 / () / + のみ (<=30)
//   ・legal_email         @ 含む (<=200)
//
// 独立 RPC のため shop_brand_update_profile / _social_links / _return_address /
// _delivery_return_policy には一切触れない = 既存 5 action の副作用を分離する。
// =============================================================================
export async function updateBrandLegalInfoAction(formData: FormData): Promise<void> {
  const returnUrl = '/brand-admin/settings'

  const legalName    = trimOrEmpty(formData.get('legal_name'), 100)
  const legalRep     = trimOrEmpty(formData.get('legal_representative_name'), 100)
  const legalPostal  = trimOrEmpty(formData.get('legal_postal_code'), 20)
  const legalPref    = trimOrEmpty(formData.get('legal_prefecture'), 20)
  const legalCity    = trimOrEmpty(formData.get('legal_city'), 100)
  const legalA1      = trimOrEmpty(formData.get('legal_address_line1'), 200)
  const legalA2      = trimOrEmpty(formData.get('legal_address_line2'), 200)
  const legalPhone   = trimOrEmpty(formData.get('legal_phone'), 30)
  const legalEmail   = trimOrEmpty(formData.get('legal_email'), 200)
  // Migration 166: 販売者区分 (Phase 4 以降は保存必須。 未選択 → *_required で reject)
  const legalEntityRaw = trimOrEmpty(formData.get('legal_entity_type'), 20)
  if (legalEntityRaw.length === 0) {
    redirect(`${returnUrl}?err=legal_entity_type_required`)
  }
  if (legalEntityRaw !== 'corporation' && legalEntityRaw !== 'individual') {
    redirect(`${returnUrl}?err=invalid_legal_entity_type`)
  }

  // ─── 区分別必須検証 (client canSubmit と同一) ───
  //   client 側 disable の bypass を防ぐ最終防波堤。 個別 code を返して page.tsx で
  //   errorLabel から日本語化する。
  if (legalName.length === 0) {
    redirect(`${returnUrl}?err=legal_name_required`)
  }
  if (legalEntityRaw === 'corporation' && legalRep.length === 0) {
    redirect(`${returnUrl}?err=legal_representative_name_required`)
  }
  if (legalPostal.length === 0) {
    redirect(`${returnUrl}?err=legal_postal_code_required`)
  }
  if (legalPref.length === 0) {
    redirect(`${returnUrl}?err=legal_prefecture_required`)
  }
  if (legalCity.length === 0) {
    redirect(`${returnUrl}?err=legal_city_required`)
  }
  if (legalA1.length === 0) {
    redirect(`${returnUrl}?err=legal_address_line1_required`)
  }
  if (legalPhone.length === 0) {
    redirect(`${returnUrl}?err=legal_phone_required`)
  }
  if (legalEmail.length === 0) {
    redirect(`${returnUrl}?err=legal_email_required`)
  }

  // ─── 形式検証 ───
  // 郵便番号: - を除いて 7 桁 数字必須 (必須検証済のため空欄はここに来ない)
  const normalizedPostal = normalizePostal(legalPostal)
  if (!normalizedPostal) {
    redirect(`${returnUrl}?err=invalid_legal_postal_code`)
  }
  const postalForRpc: string | null = normalizedPostal

  if (!/^[0-9\-\s()+]+$/.test(legalPhone)) {
    redirect(`${returnUrl}?err=invalid_legal_phone`)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(legalEmail)) {
    redirect(`${returnUrl}?err=invalid_legal_email`)
  }

  const ctx = await getBrandAdminContext()
  const brandId = assertUUID(ctx.currentBrand.brandId)
  const supabase = await createClient()

  const { error } = await (
    supabase as unknown as {
      rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
    }
  ).rpc('shop_brand_update_legal_info', {
    p_brand_id:                    brandId,
    p_legal_name:                  legalName.length > 0 ? legalName : null,
    p_legal_representative_name:   legalRep.length > 0 ? legalRep : null,
    p_legal_postal_code:           postalForRpc,
    p_legal_prefecture:            legalPref.length > 0 ? legalPref : null,
    p_legal_city:                  legalCity.length > 0 ? legalCity : null,
    p_legal_address_line1:         legalA1.length > 0 ? legalA1 : null,
    p_legal_address_line2:         legalA2.length > 0 ? legalA2 : null,
    p_legal_phone:                 legalPhone.length > 0 ? legalPhone : null,
    p_legal_email:                 legalEmail.length > 0 ? legalEmail : null,
    p_legal_entity_type:           legalEntityRaw.length > 0 ? legalEntityRaw : null,
  })
  if (error) {
    const msg = error.message.toLowerCase()
    let code: string = 'update_failed'
    if (msg.includes('forbidden'))                                code = 'forbidden'
    else if (msg.includes('not_authenticated'))                   code = 'not_authenticated'
    else if (msg.includes('invalid_legal_postal_code'))           code = 'invalid_legal_postal_code'
    else if (msg.includes('invalid_legal_phone'))                 code = 'invalid_legal_phone'
    else if (msg.includes('invalid_legal_email'))                 code = 'invalid_legal_email'
    else if (msg.includes('invalid_legal_entity_type'))           code = 'invalid_legal_entity_type'
    else if (msg.includes('legal_name_too_long'))                 code = 'legal_name_too_long'
    else if (msg.includes('legal_representative_name_too_long'))  code = 'legal_representative_name_too_long'
    else if (msg.includes('legal_prefecture_too_long'))           code = 'legal_prefecture_too_long'
    else if (msg.includes('legal_city_too_long'))                 code = 'legal_city_too_long'
    else if (msg.includes('legal_address_line1_too_long'))        code = 'legal_address_line1_too_long'
    else if (msg.includes('legal_address_line2_too_long'))        code = 'legal_address_line2_too_long'
    else if (msg.includes('legal_phone_too_long'))                code = 'legal_phone_too_long'
    else if (msg.includes('legal_email_too_long'))                code = 'legal_email_too_long'
    console.error('[brand-admin/settings] rpc legal info update failed', error)
    redirect(`${returnUrl}?err=${encodeURIComponent(code)}`)
  }

  revalidatePath(returnUrl)
  redirect(`${returnUrl}?saved=legal`)
}

// =============================================================================
// updateDeliveryReturnPolicyAction (Phase B / Migration 155)
//
// フォーム入力 (すべて任意、空 = null にリセット可能):
//   ・dispatch_lead_days   int? (1..90)
//   ・return_accepted      "unset" | "yes" | "no"  (client 側 tri-state select)
//   ・return_days          int? (1..365)  ─ return_accepted=yes のとき必須
//   ・exchange_accepted    "unset" | "yes" | "no"
//   ・return_policy_note   text? (1..1000 chars, plain text)
//
// Dev Bypass 経路: 固定 brand_id + admin client で shop_brands を直接 UPDATE。
// 通常経路: getBrandAdminContext() 経由の brand_id + shop_brand_update_delivery_return_policy
//   RPC (SECURITY DEFINER + owner/admin role 検証) を呼ぶ。 staff は RPC 内で forbidden。
//
// 生 Postgrest error は client へ露出させず、既存 errorLabel() で日本語化される
// snake_case code に必ずマップして redirect する。
// =============================================================================

/** tri-state "unset"/"yes"/"no" → null/true/false */
function parseTri(v: FormDataEntryValue | null): boolean | null {
  const s = String(v ?? 'unset')
  if (s === 'yes') return true
  if (s === 'no')  return false
  return null
}

/** "" → null / "3" → 3 / invalid → NaN */
function parseOptionalInt(v: FormDataEntryValue | null): number | null | typeof NaN {
  const s = String(v ?? '').trim()
  if (s === '') return null
  const n = Number(s)
  if (!Number.isFinite(n) || !Number.isInteger(n)) return NaN
  return n
}

export async function updateDeliveryReturnPolicyAction(formData: FormData): Promise<void> {
  const returnUrl = '/brand-admin/settings'

  const dispatchLead = parseOptionalInt(formData.get('dispatch_lead_days'))
  const returnAccepted = parseTri(formData.get('return_accepted'))
  const returnDays = parseOptionalInt(formData.get('return_days'))
  const exchangeAccepted = parseTri(formData.get('exchange_accepted'))
  const noteRaw = String(formData.get('return_policy_note') ?? '').trim()
  const note = noteRaw.length > 0 ? noteRaw.slice(0, 1000) : null
  // Phase 4-A / Migration 167: 購入者都合返品の送料負担者。 空文字 = 未選択 = null。
  const bearerRaw = String(formData.get('return_shipping_cost_bearer') ?? '').trim()
  const bearer: 'buyer' | 'seller' | null =
    bearerRaw === 'buyer' ? 'buyer' :
    bearerRaw === 'seller' ? 'seller' : null

  // ─── validation ───
  if (Number.isNaN(dispatchLead)) redirect(`${returnUrl}?err=invalid_dispatch_lead_days`)
  if (Number.isNaN(returnDays))   redirect(`${returnUrl}?err=invalid_return_days`)
  if (dispatchLead !== null && (dispatchLead as number) !== null
      && ((dispatchLead as number) < 1 || (dispatchLead as number) > 90)) {
    redirect(`${returnUrl}?err=invalid_dispatch_lead_days`)
  }
  if (returnDays !== null
      && ((returnDays as number) < 1 || (returnDays as number) > 365)) {
    redirect(`${returnUrl}?err=invalid_return_days`)
  }
  // return_accepted と return_days の整合性チェック (Migration 155 の DB CHECK と RPC を先取り)。
  //   true  + null → return_days_required_when_accepted
  //   false + 非null → return_days_only_when_accepted (silent normalize 禁止、要件通り拒否)
  //   null  + 非null → return_days_only_when_accepted
  // DB CHECK / RPC 側でも同じルールを検証する 3 段防御。
  if (returnAccepted === true && returnDays === null) {
    redirect(`${returnUrl}?err=return_days_required_when_accepted`)
  }
  if (returnAccepted !== true && returnDays !== null) {
    redirect(`${returnUrl}?err=return_days_only_when_accepted`)
  }
  // Phase 4-A: 送料負担者の整合性検証。
  //   ・raw が非空かつ whitelist 外 → invalid
  //   ・return_accepted=true + bearer null → required
  //   ・return_accepted != true + bearer 非null → only_when_accepted
  if (bearerRaw.length > 0 && bearer === null) {
    redirect(`${returnUrl}?err=invalid_return_shipping_cost_bearer`)
  }
  if (returnAccepted === true && bearer === null) {
    redirect(`${returnUrl}?err=return_shipping_cost_bearer_required`)
  }
  if (returnAccepted !== true && bearer !== null) {
    redirect(`${returnUrl}?err=return_shipping_cost_bearer_only_when_accepted`)
  }
  if (note !== null && note.length > 1000) {
    redirect(`${returnUrl}?err=return_policy_note_too_long`)
  }

  const ctx = await getBrandAdminContext()
  const brandId = assertUUID(ctx.currentBrand.brandId)
  const supabase = await createClient()
  const { error } = await (
    supabase as unknown as {
      rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
    }
  ).rpc('shop_brand_update_delivery_return_policy', {
    p_brand_id:                     brandId,
    p_dispatch_lead_days:           dispatchLead as number | null,
    p_return_accepted:              returnAccepted,
    p_return_days:                  returnDays   as number | null,
    p_exchange_accepted:            exchangeAccepted,
    p_return_policy_note:           note,
    p_return_shipping_cost_bearer:  bearer,
  })
  if (error) {
    const msg = error.message.toLowerCase()
    let code: string = 'update_failed'
    if (msg.includes('forbidden'))                            code = 'forbidden'
    else if (msg.includes('not_authenticated'))               code = 'not_authenticated'
    else if (msg.includes('invalid_dispatch_lead_days'))      code = 'invalid_dispatch_lead_days'
    else if (msg.includes('invalid_return_days'))             code = 'invalid_return_days'
    // Migration 155 追加: return_accepted と return_days の整合性エラー。
    // 通常経路は事前 pre-validation で fire するので RPC からは来ないが、
    // 直接 RPC 叩き / 未来の別 caller からの流入 / CHECK 制約由来メッセージにも対応。
    else if (msg.includes('return_days_required'))            code = 'return_days_required_when_accepted'
    else if (msg.includes('return_days_only_when_accepted'))  code = 'return_days_only_when_accepted'
    else if (msg.includes('shop_brands_return_days_consistency'))
                                                              code = 'return_days_only_when_accepted'
    // Phase 4-A: 返品送料負担者エラー
    else if (msg.includes('invalid_return_shipping_cost_bearer'))
                                                              code = 'invalid_return_shipping_cost_bearer'
    else if (msg.includes('return_shipping_cost_bearer_required'))
                                                              code = 'return_shipping_cost_bearer_required'
    else if (msg.includes('return_shipping_cost_bearer_only_when_accepted'))
                                                              code = 'return_shipping_cost_bearer_only_when_accepted'
    else if (msg.includes('shop_brands_return_shipping_cost_bearer_consistency'))
                                                              code = 'return_shipping_cost_bearer_only_when_accepted'
    else if (msg.includes('shop_brands_return_shipping_cost_bearer_value'))
                                                              code = 'invalid_return_shipping_cost_bearer'
    else if (msg.includes('return_policy_note_too_long'))     code = 'return_policy_note_too_long'
    else if (msg.includes('brand_not_found'))                 code = 'brand_not_found'
    console.error('[brand-admin/settings] rpc policy update failed', error)
    redirect(`${returnUrl}?err=${encodeURIComponent(code)}`)
  }

  revalidatePath(returnUrl)
  redirect(`${returnUrl}?saved=policy`)
}
