// =============================================================================
// app/api/stripe-connect/refresh/route.ts   (Phase 4-C.3)
//
// Stripe hosted onboarding の一時 URL が期限切れ / 既使用 / 事前クロール等で無効
// となった場合、Stripe が connected account を refresh_url にリダイレクトする。
// 本 handler は 新しい Account Link を発行し Stripe hosted URL に redirect し直す。
//
// フロー:
//   1. getBrandAdminContext() で現在の owner を確認 (owner のみ許可)
//   2. Edge Function stripe-connect-onboarding-link を叩いて新規 Account Link 生成
//   3. 新しい URL に 303 redirect
// =============================================================================

import { NextResponse } from 'next/server'
import { getBrandAdminContext } from '@/lib/brandAdmin'
import { createClient } from '@/lib/supabase/server'

const BACK = '/brand-admin/settings'

export async function GET(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin
  const ctx = await getBrandAdminContext()  // 未認証なら /brand-admin/login へ redirect (throw)

  if (ctx.currentBrand.role !== 'owner') {
    return NextResponse.redirect(
      new URL(`${BACK}?err=stripe_connect_owner_only`, origin),
      { status: 303 }
    )
  }

  const supabase = await createClient()
  const { data, error } = await (
    supabase as unknown as {
      functions: {
        invoke: (fn: string, opts: { body: Record<string, unknown> }) => Promise<{
          data: { url?: string } | null
          error: { message: string } | null
        }>
      }
    }
  ).functions.invoke('stripe-connect-onboarding-link', {
    body: { brand_id: ctx.currentBrand.brandId },
  })

  if (error) {
    console.error('[api/stripe-connect/refresh] onboarding link failed', error)
    return NextResponse.redirect(
      new URL(`${BACK}?err=stripe_connect_onboarding_failed`, origin),
      { status: 303 }
    )
  }
  const url = data?.url
  if (!url) {
    console.error('[api/stripe-connect/refresh] no url returned')
    return NextResponse.redirect(
      new URL(`${BACK}?err=stripe_connect_link_url_missing`, origin),
      { status: 303 }
    )
  }
  return NextResponse.redirect(url, { status: 303 })
}
