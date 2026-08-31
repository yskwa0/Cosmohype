'use server'

// =============================================================================
// /brand-admin/invite/setup の Server Action。
//
// 招待受諾 flow:
//   1. auth session 確認 (hype-invite-confirm 経由で verifyOtp 済のはず)
//   2. パスワード設定 (supabase.auth.updateUser)
//   3. shop_accept_owner_invitation RPC 呼出 (opaque_token を hash 化)
//      - RPC 内で email 一致 / not_expired / not_used / not_revoked を検証
//   4. 成功 → /brand-admin へ redirect
// =============================================================================

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hashOpaqueToken } from '@/lib/hype/tokens'

export async function setPasswordAndAcceptInvitationAction(formData: FormData): Promise<void> {
  const rawToken = String(formData.get('token') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const pwConfirm = String(formData.get('password_confirm') ?? '')

  const err = (code: string): never => {
    redirect(`/brand-admin/invite/setup?token=${encodeURIComponent(rawToken)}&err=${encodeURIComponent(code)}`)
  }

  if (!rawToken) return err('invitation_missing_token')
  if (password.length < 8) return err('password_too_short')
  if (password !== pwConfirm) return err('password_mismatch')

  const supabase = await createClient()

  // 1. session 確認
  const { data: userRes } = await supabase.auth.getUser()
  if (!userRes?.user) {
    redirect(`/brand-admin/login?err=invite_session_missing`)
  }

  // 2. パスワード設定
  const { error: pwErr } = await supabase.auth.updateUser({ password })
  if (pwErr) {
    console.error('[invite/setup] updateUser failed', pwErr)
    return err('password_update_failed')
  }

  // 3. accept invitation RPC (raw token を hash して照合)
  const tokenHash = hashOpaqueToken(rawToken)
  const rpcRes = await (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: Array<{ brand_id: string; brand_name: string }> | null; error: { message: string } | null }>
  }).rpc('shop_accept_owner_invitation', { p_token_hash: tokenHash })

  if (rpcRes.error) {
    const msg = rpcRes.error.message.toLowerCase()
    let code = 'setup_failed'
    if (msg.includes('invitation_not_found'))         code = 'setup_failed'
    else if (msg.includes('invitation_already_accepted')) code = 'invitation_already_accepted'
    else if (msg.includes('invitation_revoked'))     code = 'invitation_revoked'
    else if (msg.includes('invitation_expired'))     code = 'invitation_expired'
    else if (msg.includes('invitation_email_mismatch')) code = 'invitation_email_mismatch'
    else if (msg.includes('brand_already_has_owner')) code = 'brand_already_has_owner'
    console.error('[invite/setup] accept rpc failed', rpcRes.error)
    return err(code)
  }

  redirect('/brand-admin')
}
