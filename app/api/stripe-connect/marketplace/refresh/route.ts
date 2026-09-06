// =============================================================================
// app/api/stripe-connect/marketplace/refresh/route.ts   (PHASE 4 Marketplace)
//
// Marketplace 個人 seller の Stripe hosted onboarding 一時 URL が期限切れ / 既使用 /
// 事前クロール等で無効になった場合の refresh_url handler。
// Stripe が connected account を refresh_url にリダイレクトするので、新しい Account
// Link を発行し Stripe hosted URL に redirect し直す。
//
// フロー:
//   1. ログインユーザーを確認 (Cosmohype 一般 user、brand admin ではない)
//   2. Edge Function `marketplace-create-connect-account` を叩いて新規 Account Link 生成
//   3. 返却された onboarding_url に 303 redirect
//
// Shop 用 `/api/stripe-connect/refresh` は brand admin (owner 判定 + brand_id 引数)
// のため絶対に流用しない。
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

  const { data, error } = await (
    supabase as unknown as {
      functions: {
        invoke: (
          fn: string,
          opts?: { body?: Record<string, unknown> },
        ) => Promise<{
          data: { onboarding_url?: string; stripe_account_id?: string } | null
          error: { message: string } | null
        }>
      }
    }
  ).functions.invoke('marketplace-create-connect-account', { body: {} })

  if (error) {
    console.error('[api/stripe-connect/marketplace/refresh] onboarding link failed', error)
    return NextResponse.redirect(
      new URL(`${BACK}?err=marketplace_connect_onboarding_failed`, origin),
      { status: 303 },
    )
  }
  const url = data?.onboarding_url
  if (!url || !url.startsWith('https://')) {
    console.error('[api/stripe-connect/marketplace/refresh] invalid onboarding url', url)
    return NextResponse.redirect(
      new URL(`${BACK}?err=marketplace_connect_link_url_missing`, origin),
      { status: 303 },
    )
  }
  return NextResponse.redirect(url, { status: 303 })
}
