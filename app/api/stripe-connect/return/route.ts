// =============================================================================
// app/api/stripe-connect/return/route.ts   (Phase 4-C.3)
//
// Stripe hosted onboarding からユーザーが戻ってくる return_url handler。
// Stripe 公式仕様上、return_url 到達は「onboarding UI に入って出た」ことしか
// 保証しない = active 判定に使ってはいけない。
//
// 本 handler は:
//   1. getBrandAdminContext() で現在の owner を確認 (session ベース、query 入力なし)
//   2. Edge Function stripe-connect-account-sync を叩いて Stripe API の最新
//      Account 状態を DB cache に反映
//   3. /brand-admin/settings に redirect (?saved=stripe_connect_sync&state=...
//      or ?err=... を付与、Brand Admin UI 側で banner 表示)
//
// GET のみ受付 (Stripe が return_url にアクセスする際は GET)。
// =============================================================================

import { NextResponse } from 'next/server'
import { getBrandAdminContext } from '@/lib/brandAdmin'
import { createClient } from '@/lib/supabase/server'

const BACK = '/brand-admin/settings'

export async function GET(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin
  const ctx = await getBrandAdminContext()  // 未認証なら /brand-admin/login へ redirect (throw)

  const supabase = await createClient()
  const { data, error } = await (
    supabase as unknown as {
      functions: {
        invoke: (fn: string, opts: { body: Record<string, unknown> }) => Promise<{
          data: { state?: string } | null
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
    if (msg.includes('brand_has_no_connect_account')) code = 'stripe_connect_not_started'
    else if (msg.includes('stripe_account_get_failed')) code = 'stripe_connect_sync_stripe_error'
    else if (msg.includes('stripe_key_env_mismatch'))   code = 'stripe_key_env_mismatch'
    console.error('[api/stripe-connect/return] sync failed', error)
    return NextResponse.redirect(new URL(`${BACK}?err=${encodeURIComponent(code)}`, origin), { status: 303 })
  }

  const stateParam = data?.state ? `&state=${encodeURIComponent(data.state)}` : ''
  return NextResponse.redirect(
    new URL(`${BACK}?saved=stripe_connect_sync${stateParam}`, origin),
    { status: 303 }
  )
}
