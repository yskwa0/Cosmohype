// =============================================================================
// /api/auth/hype-invite-confirm
//
// HYPE Owner 招待メールの着地点 (Supabase invite の redirectTo に指定される)。
//
// - Supabase Auth invite email → このルート (`?token_hash=X&type=invite&next=/brand-admin/invite/setup?token=OPAQUE`)
// - verifyOtp で session を確立
// - `next` (opaque token 付き brand-admin invite ページ) にリダイレクト
//
// 既存 /api/auth/confirm の挙動は完全に独立させる (プロフィール確認等はここでは行わない)。
// =============================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

// next はローカル絶対パスのみ許可 (open redirect 防止)
function safeNext(raw: string | null): string {
  if (!raw) return '/brand-admin/login?err=invite_missing_token'
  if (!raw.startsWith('/brand-admin/invite/setup')) return '/brand-admin/login?err=invite_invalid_next'
  return raw
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type') as EmailOtpType | null
  const nextPath   = safeNext(searchParams.get('next'))

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/brand-admin/login?err=invite_invalid_link`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ token_hash, type })

  if (error) {
    console.error('[hype-invite-confirm] verifyOtp failed', error)
    return NextResponse.redirect(`${origin}/brand-admin/login?err=invite_verify_failed`)
  }

  return NextResponse.redirect(`${origin}${nextPath}`)
}
