// =============================================================================
// /api/auth/hype-invite-confirm
//
// HYPE Owner 招待メールの着地点。
// Invite / Magic Link 両テンプレートから直接ここに来る (SSR PKCE-friendly)。
//
//   新規 user (Invite template):
//     ?token_hash=X&type=invite&next=/brand-admin/invite/setup?token=OPAQUE
//   既存 user (Magic Link template):
//     ?token_hash=X&type=email&next=/brand-admin/invite/accept?token=OPAQUE
//
// verifyOtp で session を確立し、safeNext(next) にリダイレクト。
// type は invite / email / magiclink のみ許可 (allowlist)。
// 既存 /api/auth/confirm (通常 signup 用) の挙動には影響しない。
// =============================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

// HYPE Owner 招待 flow で許容する OTP type だけを絞る (悪意ある type を弾く)
const ALLOWED_TYPES: ReadonlySet<EmailOtpType> = new Set(['invite', 'email', 'magiclink'])

// next はローカル絶対パスのみ許可 (open redirect 防止)
function safeNext(raw: string | null): string {
  if (!raw) return '/brand-admin/login?err=invite_missing_token'
  if (!raw.startsWith('/')) return '/brand-admin/login?err=invite_invalid_next'
  if (raw.startsWith('//')) return '/brand-admin/login?err=invite_invalid_next'
  if (raw.includes('\\')) return '/brand-admin/login?err=invite_invalid_next'
  if (raw.startsWith('/brand-admin/invite/setup')) return raw
  if (raw.startsWith('/brand-admin/invite/accept')) return raw
  return '/brand-admin/login?err=invite_invalid_next'
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const typeRaw    = searchParams.get('type')
  const nextPath   = safeNext(searchParams.get('next'))

  if (!token_hash || !typeRaw) {
    return NextResponse.redirect(`${origin}/brand-admin/login?err=invite_invalid_link`)
  }
  const type = typeRaw as EmailOtpType
  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.redirect(`${origin}/brand-admin/login?err=invite_invalid_link`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ token_hash, type })

  if (error) {
    // raw token を出さない、error message のみ
    console.error('[hype-invite-confirm] verifyOtp failed:', error.message)
    return NextResponse.redirect(`${origin}/brand-admin/login?err=invite_verify_failed`)
  }

  return NextResponse.redirect(`${origin}${nextPath}`)
}
