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
