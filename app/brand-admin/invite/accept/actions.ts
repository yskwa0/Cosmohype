'use server'

// =============================================================================
// /brand-admin/invite/accept の Server Action。
//
// 既存 Cosmohype user 向けの Owner 招待受諾。 password は変更しない。
//
// 前提:
//   * 呼出前に Magic Link callback (/api/auth/hype-invite-confirm?type=email)
//     で verifyOtp 済み → session cookie 確立済
//   * shop_accept_owner_invitation RPC が SQL 側で最終的に
//     lower(invitation.email) == lower(auth.users.email) を強制
//
// エラー時:
//   raw token は URL query に残る (再表示のため) が、log には出さない。
// =============================================================================

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hashOpaqueToken } from '@/lib/hype/tokens'

export async function acceptExistingUserInvitationAction(formData: FormData): Promise<void> {
  const rawToken = String(formData.get('token') ?? '').trim()

  const err = (code: string): never => {
    redirect(`/brand-admin/invite/accept?token=${encodeURIComponent(rawToken)}&err=${encodeURIComponent(code)}`)
  }

  if (!rawToken) return err('invitation_missing_token')

  const supabase = await createClient()

  // 1. session 確認 (invite-confirm callback を経由していれば cookie に session がある)
  const { data: userRes } = await supabase.auth.getUser()
  if (!userRes?.user) {
    redirect(`/brand-admin/login?redirect=/brand-admin/invite/accept?token=${encodeURIComponent(rawToken)}`)
  }

  // 2. accept invitation RPC (raw token を hash して照合)
  const tokenHash = hashOpaqueToken(rawToken)
  const rpcRes = await (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{
      data: Array<{ out_brand_id: string; out_brand_name: string }> | null
      error: { message: string } | null
    }>
  }).rpc('shop_accept_owner_invitation', { p_token_hash: tokenHash })

  if (rpcRes.error) {
    const msg = rpcRes.error.message.toLowerCase()
    let code = 'accept_failed'
    if (msg.includes('invitation_not_found'))             code = 'accept_failed'
    else if (msg.includes('invitation_already_accepted')) code = 'invitation_already_accepted'
    else if (msg.includes('invitation_revoked'))          code = 'invitation_revoked'
    else if (msg.includes('invitation_expired'))          code = 'invitation_expired'
    else if (msg.includes('invitation_email_mismatch'))   code = 'invitation_email_mismatch'
    else if (msg.includes('brand_already_has_owner'))     code = 'brand_already_has_owner'
    console.error('[invite/accept] accept rpc failed:', rpcRes.error.message)
    return err(code)
  }

  redirect('/brand-admin')
}
