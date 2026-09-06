// =============================================================================
// app/api/stripe-connect/marketplace/return/route.ts   (PHASE 4 Marketplace)
//
// Marketplace 個人 seller の Stripe hosted onboarding return_url handler。
// Stripe 公式仕様上、return_url 到達は「onboarding UI に入って出た」ことしか保証しない
// = active 判定に使ってはいけない。
//
// 本 handler は:
//   1. ログインユーザーを確認 (Cosmohype 一般 user、brand admin ではない)
//   2. Edge Function `marketplace-connect-status` を叩いて Stripe 最新状態を DB cache
//      (marketplace_seller_accounts) に反映
//   3. `/marketplace/connect/complete` へ redirect (state をクエリで渡す)
//
// GET のみ受付 (Stripe が return_url にアクセスする際は GET)。
// Shop 用 `/api/stripe-connect/return` は brand admin flow 専用のため絶対に流用しない。
// =============================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BACK = '/marketplace/connect/complete'

export async function GET(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin

  const supabase = await createClient()
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) {
    return NextResponse.redirect(
      new URL(`${BACK}?err=unauthorized`, origin),
      { status: 303 },
    )
  }

  // Edge Function は user JWT (cookie 経由の supabase-js が自動付与) で叩く
  const { data, error } = await (
    supabase as unknown as {
      functions: {
        invoke: (
          fn: string,
          opts?: { body?: Record<string, unknown> },
        ) => Promise<{
          data: {
            exists?: boolean
            transfers_enabled?: boolean
            disabled_reason?: string | null
          } | null
          error: { message: string } | null
        }>
      }
    }
  ).functions.invoke('marketplace-connect-status', { body: {} })

  if (error) {
    console.error('[api/stripe-connect/marketplace/return] sync failed', error)
    const msg = String(error.message ?? '').toLowerCase()
    let code = 'marketplace_connect_sync_failed'
    if (msg.includes('stripe_key_env_mismatch')) code = 'stripe_key_env_mismatch'
    return NextResponse.redirect(
      new URL(`${BACK}?err=${encodeURIComponent(code)}`, origin),
      { status: 303 },
    )
  }

  const stateParam = data?.transfers_enabled
    ? '&state=active'
    : data?.disabled_reason
      ? `&state=restricted&reason=${encodeURIComponent(String(data.disabled_reason).slice(0, 100))}`
      : '&state=pending'

  return NextResponse.redirect(
    new URL(`${BACK}?saved=marketplace_connect_sync${stateParam}`, origin),
    { status: 303 },
  )
}
