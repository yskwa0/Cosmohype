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
// updateBrandProfileAction  (Migration 145: ブランドプロフィール編集)
//
// フォーム入力: description / website_url / instagram_url + 任意の logo_file / cover_file
// (name はスコープ外、`shop_brand_update_profile` RPC が p_name 引数を持たない。
//  ブランド名変更には別途 migration 146 で RPC 拡張が必要。 今回は read-only 表示)
//
// 画像は `shop-brand-assets` bucket に `<brand_id>/logo.<ext>` / `<brand_id>/cover.<ext>` の
// 固定 path で upsert=true。 既存 shop_brands.logo_path / cover_path を上書きする際、
// 前回の path と一致すれば storage 上の実 file も置換される。 拡張子が変わる場合は
// 旧 file が残る (別 file として) が、DB path は新 file に更新されるため表示影響なし。
//
// Dev Bypass 経路: URBAN NOTE 固定 brand_id + admin client で直接 storage upload +
// shop_brands direct update (auth 越えなし)。
// 通常経路: getBrandAdminContext() 経由で自 brand_id 解決 + shop_brand_update_profile RPC
// (owner/admin gate は RPC 内で担保、staff 拒否)。
// =============================================================================
export async function updateBrandProfileAction(formData: FormData): Promise<void> {
  const returnUrl = '/brand-admin/settings'

  // Migration 146: ブランド名 (name) 必須 + 100 文字上限 (server 側 RPC でも再検証)
  const brandName = trimOrEmpty(formData.get('name'), 100)
  if (brandName.length === 0) {
    redirect(`${returnUrl}?err=name_required`)
  }
  const description = trimOrEmpty(formData.get('description'), 2000)
  const websiteRaw   = trimOrEmpty(formData.get('website_url'), 500)
  const instagramRaw = trimOrEmpty(formData.get('instagram_url'), 500)
  const existingLogoPath  = trimOrEmpty(formData.get('existing_logo_path'), 500)
  const existingCoverPath = trimOrEmpty(formData.get('existing_cover_path'), 500)

  // URL 妥当性 (空欄可、値がある場合のみ http(s):// 前提)
  function normalizeURL(v: string): { ok: true; value: string | null } | { ok: false } {
    if (v.length === 0) return { ok: true, value: null }
    try {
      const u = new URL(v)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false }
      return { ok: true, value: u.toString() }
    } catch { return { ok: false } }
  }
  const websiteN = normalizeURL(websiteRaw)
  if (!websiteN.ok) redirect(`${returnUrl}?err=invalid_website_url`)
  const instagramN = normalizeURL(instagramRaw)
  if (!instagramN.ok) redirect(`${returnUrl}?err=invalid_instagram_url`)

  const bypass = isBrandAdminDevBypassEnabled()
  if (bypass && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    redirect(`${returnUrl}?err=service_role_missing`)
  }

  const brandId: string = bypass
    ? DEV_BYPASS_BRAND_ID
    : assertUUID((await getBrandAdminContext()).currentBrand.brandId)

  const supabase = bypass ? createAdminClient() : await createClient()

  // 画像 upload ヘルパ (既存 uploadImageAction と同じ upsert / contentType 検証パターン)
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
    const loose = supabase as unknown as {
      storage: { from: (b: string) => {
        upload: (p: string, f: File, o: { contentType: string; upsert: boolean }) =>
          Promise<{ error: { message: string } | null }>
      } }
    }
    const up = await loose.storage.from('shop-brand-assets').upload(path, f, {
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
    const upd = await admin.from('shop_brands').update({
      name:          brandName,   // Migration 146
      description:   description.length > 0 ? description : null,
      logo_path:     logoPath,
      cover_path:    coverPath,
      website_url:   websiteN.value,
      instagram_url: instagramN.value,
      updated_at: new Date().toISOString(),
    }).eq('id', brandId)
    if (upd.error) {
      console.error('[brand-admin/settings] dev bypass profile update failed', upd.error)
      redirect(`${returnUrl}?err=update_failed`)
    }
  } else {
    const { error } = await (
      supabase as unknown as {
        rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
      }
    ).rpc('shop_brand_update_profile', {
      p_brand_id:      brandId,
      p_name:          brandName,   // Migration 146 で追加された引数
      p_description:   description.length > 0 ? description : null,
      p_logo_path:     logoPath,
      p_cover_path:    coverPath,
      p_website_url:   websiteN.value,
      p_instagram_url: instagramN.value,
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
