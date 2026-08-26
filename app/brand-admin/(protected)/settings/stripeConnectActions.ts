// =============================================================================
// app/brand-admin/(protected)/settings/stripeConnectActions.ts
//                                                (Phase 4-C.3 / Migration 170-171)
//
// Brand Admin から Stripe Connect Onboarding を起動 / 状態を同期する Server Action。
//
// 【設計】
//   ・auth.uid + active owner membership を server 側でも検証 (RPC 側でも再検証)
//   ・brand_id は cookie ベースの getBrandAdminContext から取得 = client 入力を信用しない
//   ・stripe_connect_account_id を client から受け取らない
//   ・Edge Function への呼出しは Supabase client の functions.invoke (JWT 経路)
//   ・onboarding link URL は DB に保存せず、redirect にのみ使用 (Stripe 一時 URL)
//   ・return_url 到達 (別 route handler) だけでは active 判定しない
// =============================================================================

'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getBrandAdminContext } from '@/lib/brandAdmin'
import { createClient } from '@/lib/supabase/server'

const RETURN_URL = '/brand-admin/settings'

/**
 * owner のみ起動可能。 Edge Function stripe-connect-onboarding-link を叩き、
 * (account 未作成なら作成 + Account Link 生成) → 返却された Stripe hosted onboarding
 * URL に redirect する。 accept_url / cancel_url 相当は Edge Function 側で env 指定。
 */
export async function startStripeConnectOnboardingAction(_formData: FormData): Promise<void> {
  const ctx = await getBrandAdminContext()
  if (ctx.currentBrand.role !== 'owner') {
    redirect(`${RETURN_URL}?err=stripe_connect_owner_only`)
  }

  const supabase = await createClient()
  const { data, error } = await (
    supabase as unknown as {
      functions: {
        invoke: (fn: string, opts: { body: Record<string, unknown> }) => Promise<{
          data: { url?: string; account_id?: string; created_now?: boolean } | null
          error: { message: string } | null
        }>
      }
    }
  ).functions.invoke('stripe-connect-onboarding-link', {
    body: { brand_id: ctx.currentBrand.brandId },
  })

  if (error) {
    const msg = error.message.toLowerCase()
    let code = 'stripe_connect_onboarding_failed'
    if (msg.includes('forbidden_owner_only'))                         code = 'stripe_connect_owner_only'
    else if (msg.includes('invalid_jwt') || msg.includes('missing_jwt')) code = 'not_authenticated'
    else if (msg.includes('brand_not_found'))                         code = 'brand_not_found'
    else if (msg.includes('stripe_key_env_mismatch'))                 code = 'stripe_key_env_mismatch'
    else if (msg.includes('stripe_account_create_failed'))            code = 'stripe_account_create_failed'
    else if (msg.includes('stripe_account_link_create_failed'))       code = 'stripe_account_link_create_failed'
    else if (msg.includes('connect_urls_not_configured'))             code = 'stripe_connect_urls_not_configured'
    console.error('[stripeConnectActions] onboarding link invoke failed', error)
    redirect(`${RETURN_URL}?err=${encodeURIComponent(code)}`)
  }

  const url = data?.url
  if (!url) {
    console.error('[stripeConnectActions] onboarding link missing url', data)
    redirect(`${RETURN_URL}?err=stripe_connect_link_url_missing`)
  }

  // Stripe hosted onboarding へ redirect (絶対 URL)
  redirect(url)
}

/**
 * owner / admin / staff から呼出可 (状態閲覧目的、link 生成は不可)。
 * Edge Function stripe-connect-account-sync を叩き、DB cache を最新化して
 * /brand-admin/settings へ戻る。
 */
export async function syncStripeConnectStatusAction(_formData: FormData): Promise<void> {
  const ctx = await getBrandAdminContext()

  const supabase = await createClient()
  const { data, error } = await (
    supabase as unknown as {
      functions: {
        invoke: (fn: string, opts: { body: Record<string, unknown> }) => Promise<{
          data: { state?: string; transfers_capability_status?: string | null } | null
          error: { message: string } | null
        }>
      }
    }
  ).functions.invoke('stripe-connect-account-sync', {
    body: { brand_id: ctx.currentBrand.brandId },
  })

  if (error) {
    const msg = error.message.toLowerCase()
    let code = 'stripe_connect_sync_failed'
    if (msg.includes('forbidden_not_member'))            code = 'stripe_connect_forbidden'
    else if (msg.includes('brand_has_no_connect_account')) code = 'stripe_connect_not_started'
    else if (msg.includes('stripe_account_get_failed'))    code = 'stripe_connect_sync_stripe_error'
    else if (msg.includes('stripe_key_env_mismatch'))      code = 'stripe_key_env_mismatch'
    console.error('[stripeConnectActions] sync invoke failed', error)
    redirect(`${RETURN_URL}?err=${encodeURIComponent(code)}`)
  }

  revalidatePath(RETURN_URL)
  redirect(`${RETURN_URL}?saved=stripe_connect_sync&state=${encodeURIComponent(data?.state ?? '')}`)
}
