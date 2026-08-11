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
