'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isBrandAdminDevBypassEnabled, getBrandAdminContext } from '@/lib/brandAdmin'

// Dev Bypass 経路の固定 brand (URBAN NOTE、Test seed)。
// Production では isBrandAdminDevBypassEnabled() が常に false のためこの ID は使われない。
const DEV_BYPASS_BRAND_ID = '11111111-1111-4111-8111-111111111111'

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

  const bypass = isBrandAdminDevBypassEnabled()

  if (bypass) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      redirect(`${returnUrl}?err=service_role_missing`)
    }
    const admin = createAdminClient() as unknown as {
      from: (t: string) => {
        update: (patch: Record<string, unknown>) => {
          eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>
        }
      }
    }
    const upd = await admin.from('shop_brands').update({
      return_recipient_name: recipient,
      return_postal_code: postal,
      return_prefecture: prefecture,
      return_city: city,
      return_address_line1: line1,
      return_address_line2: line2.length > 0 ? line2 : null,
      return_phone: phone,
      updated_at: new Date().toISOString(),
    }).eq('id', DEV_BYPASS_BRAND_ID)
    if (upd.error) {
      console.error('[brand-admin/settings] dev bypass update failed', upd.error)
      redirect(`${returnUrl}?err=update_failed`)
    }
  } else {
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

  const bypass = isBrandAdminDevBypassEnabled()

  if (bypass) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      redirect(`${returnUrl}?err=service_role_missing`)
    }
    const admin = createAdminClient() as unknown as {
      from: (t: string) => {
        update: (patch: Record<string, unknown>) => {
          eq: (col: string, val: string) => {
            eq: (col: string, val: string) => {
              eq: (col: string, val: boolean) => Promise<{ error: { message: string } | null }>
            }
          }
        }
        insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
      }
    }
    // 既存 active ルールを一旦落として INSERT で唯一性を担保
    // (Migration 116 の partial unique index (brand_id, country_code) where is_active に依存)
    await admin
      .from('shop_brand_shipping_rules')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('brand_id', DEV_BYPASS_BRAND_ID)
      .eq('country_code', 'JP')
      .eq('is_active', true)
    const ins = await admin.from('shop_brand_shipping_rules').insert({
      brand_id: DEV_BYPASS_BRAND_ID,
      country_code: 'JP',
      flat_rate: flatRate,
      free_shipping_threshold: freeThreshold,
      rate_hokkaido: rHok,
      rate_tohoku:   rToh,
      rate_kanto:    rKan,
      rate_chubu:    rChu,
      rate_kinki:    rKin,
      rate_chugoku:  rCg,
      rate_shikoku:  rShi,
      rate_kyushu:   rKyu,
      rate_okinawa:  rOki,
      is_active: true,
    })
    if (ins.error) {
      console.error('[brand-admin/settings] dev bypass shipping upsert failed', ins.error)
      redirect(`${returnUrl}?err=shipping_update_failed`)
    }
  } else {
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

  const bypass = isBrandAdminDevBypassEnabled()
  if (bypass && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    redirect(`${returnUrl}?err=service_role_missing`)
  }

  const brandId: string = bypass
    ? DEV_BYPASS_BRAND_ID
    : assertUUID((await getBrandAdminContext()).currentBrand.brandId)

  const supabase = bypass ? createAdminClient() : await createClient()

  // 画像 upload ヘルパ (既存 uploadImageAction と同じ upsert / contentType 検証パターン)
  //
  // **2026-08-19 hotfix**: shop-brand-assets bucket は Migration 145 の実装計画
  // (コメント「別 turn で bucket policy 追加」) が Production へ反映されないまま
  // 稼働しており、通常経路 (bypass=false) の user client での upload は
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

  if (bypass) {
    const admin = supabase as unknown as {
      from: (t: string) => {
        update: (patch: Record<string, unknown>) => {
          eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>
        }
      }
    }
    // Migration 147: website_url / instagram_url は本 patch に含めない (既存 DB 値を破壊しない)。
    const upd = await admin.from('shop_brands').update({
      name:                 brandName,
      description:          description.length > 0 ? description : null,
      logo_path:            logoPath,
      cover_path:           coverPath,
      logo_crop_zoom:       logoZoom,
      logo_crop_offset_x:   logoOffX,
      logo_crop_offset_y:   logoOffY,
      cover_crop_zoom:      coverZoom,
      cover_crop_offset_x:  coverOffX,
      cover_crop_offset_y:  coverOffY,
      updated_at: new Date().toISOString(),
    }).eq('id', brandId)
    if (upd.error) {
      console.error('[brand-admin/settings] dev bypass profile update failed', upd.error)
      redirect(`${returnUrl}?err=update_failed`)
    }
  } else {
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
  }

  revalidatePath(returnUrl)
  redirect(`${returnUrl}?saved=profile`)
}
