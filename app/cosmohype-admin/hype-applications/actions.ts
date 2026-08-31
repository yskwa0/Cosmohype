'use server'

// =============================================================================
// /cosmohype-admin/hype-applications の Server Actions。
//
// - approve: shop_hype_admin_approve_application RPC → Supabase invite 発行
// - reject:  shop_hype_admin_reject_application RPC
// - resend:  shop_hype_admin_resend_owner_invitation RPC → 招待再発行
//
// 2 段 admin gate: Server Action 側 + RPC 側 (_assert_cosmohype_admin())。
// =============================================================================

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCosmohypeAdminContext } from '@/lib/cosmohypeAdmin'
import { generateOpaqueToken, hashOpaqueToken } from '@/lib/hype/tokens'
import { issueOwnerInvitation } from '@/lib/hype/inviteEmail'

// Invitation 有効期限 (7 日)
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

function assertUUID(v: unknown): string {
  const s = String(v ?? '')
  if (!/^[0-9a-fA-F-]{36}$/.test(s)) throw new Error('invalid_uuid')
  return s
}
function trimStr(v: FormDataEntryValue | null, max: number): string | null {
  const s = String(v ?? '').trim()
  if (s.length === 0) return null
  return s.slice(0, max)
}
function backTo(id: string, params: Record<string, string> = {}): string {
  const qs = new URLSearchParams(params).toString()
  return `/cosmohype-admin/hype-applications/${id}${qs ? `?${qs}` : ''}`
}

/** 承認: shop_brands + invitation 作成 → Supabase Auth invite 発行。 */
export async function approveHypeApplicationAction(formData: FormData): Promise<void> {
  await getCosmohypeAdminContext()

  const appId = assertUUID(formData.get('application_id'))

  const rawToken = generateOpaqueToken()
  const tokenHash = hashOpaqueToken(rawToken)
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS).toISOString()

  const supabase = await createClient()
  const rpcRes = await (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: Array<{ brand_id: string; invitation_id: string; email: string; brand_name: string }> | null; error: { message: string } | null }>
  }).rpc('shop_hype_admin_approve_application', {
    p_application_id: appId,
    p_token_hash:     tokenHash,
    p_expires_at:     expiresAt,
  })

  if (rpcRes.error) {
    const msg = rpcRes.error.message.toLowerCase()
    let code = 'approve_failed'
    if (msg.includes('forbidden'))                          code = 'forbidden'
    else if (msg.includes('not_authenticated'))             code = 'not_authenticated'
    else if (msg.includes('application_not_found'))         code = 'application_not_found'
    else if (msg.includes('application_status_not_pending')) code = 'application_status_not_pending'
    // raw token は log しない (rawToken 変数は関数ローカルのみ)
    console.error('[cosmohype-admin/hype-applications] approve rpc failed', rpcRes.error)
    redirect(backTo(appId, { err: code }))
  }

  const row = rpcRes.data?.[0]
  if (!row) {
    console.error('[cosmohype-admin/hype-applications] approve rpc returned empty row')
    redirect(backTo(appId, { err: 'approve_failed' }))
  }

  // Supabase Auth invite 発行 (raw token は redirectTo に埋め込むためだけに使用)
  try {
    await issueOwnerInvitation({
      email:     row!.email,
      rawToken:  rawToken,
      brandName: row!.brand_name,
    })
  } catch (e) {
    // 発行失敗時は application を pending に戻せない (RPC 側で既に approved)。
    // 運営は "再送" ボタンで新 invitation を発行できる。
    console.error('[cosmohype-admin/hype-applications] auth invite failed (approve committed, resend needed)', e)
    revalidatePath('/cosmohype-admin/hype-applications')
    redirect(backTo(appId, { err: 'invite_send_failed' }))
  }

  revalidatePath('/cosmohype-admin/hype-applications')
  redirect(backTo(appId, { saved: 'approved' }))
}

/** 却下: application を rejected に。 shop_brands は作成しない。 */
export async function rejectHypeApplicationAction(formData: FormData): Promise<void> {
  await getCosmohypeAdminContext()

  const appId = assertUUID(formData.get('application_id'))
  const reason = trimStr(formData.get('reason'), 500)

  const supabase = await createClient()
  const { error } = await (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
  }).rpc('shop_hype_admin_reject_application', {
    p_application_id: appId,
    p_reason:         reason,
  })

  if (error) {
    const msg = error.message.toLowerCase()
    let code = 'reject_failed'
    if (msg.includes('forbidden'))                          code = 'forbidden'
    else if (msg.includes('not_authenticated'))             code = 'not_authenticated'
    else if (msg.includes('application_not_found'))         code = 'application_not_found'
    else if (msg.includes('application_status_not_pending')) code = 'application_status_not_pending'
    console.error('[cosmohype-admin/hype-applications] reject rpc failed', error)
    redirect(backTo(appId, { err: code }))
  }

  revalidatePath('/cosmohype-admin/hype-applications')
  redirect(backTo(appId, { saved: 'rejected' }))
}

/** 招待再送: 現行 invitation を revoke + 新 token で発行 + invite 再送信。 */
export async function resendOwnerInvitationAction(formData: FormData): Promise<void> {
  await getCosmohypeAdminContext()

  const appId   = assertUUID(formData.get('application_id'))
  const brandId = assertUUID(formData.get('brand_id'))

  const rawToken = generateOpaqueToken()
  const tokenHash = hashOpaqueToken(rawToken)
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS).toISOString()

  const supabase = await createClient()
  const rpcRes = await (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: Array<{ invitation_id: string; email: string; brand_name: string }> | null; error: { message: string } | null }>
  }).rpc('shop_hype_admin_resend_owner_invitation', {
    p_brand_id:       brandId,
    p_new_token_hash: tokenHash,
    p_new_expires_at: expiresAt,
  })

  if (rpcRes.error) {
    const msg = rpcRes.error.message.toLowerCase()
    let code = 'resend_failed'
    if (msg.includes('forbidden'))                     code = 'forbidden'
    else if (msg.includes('brand_not_found'))          code = 'brand_not_found'
    else if (msg.includes('active_invitation_not_found')) code = 'active_invitation_not_found'
    else if (msg.includes('resend_limit_exceeded'))    code = 'resend_limit_exceeded'
    console.error('[cosmohype-admin/hype-applications] resend rpc failed', rpcRes.error)
    redirect(backTo(appId, { err: code }))
  }

  const row = rpcRes.data?.[0]
  if (!row) {
    redirect(backTo(appId, { err: 'resend_failed' }))
  }

  try {
    await issueOwnerInvitation({
      email:     row!.email,
      rawToken:  rawToken,
      brandName: row!.brand_name,
    })
  } catch (e) {
    console.error('[cosmohype-admin/hype-applications] auth invite resend failed', e)
    redirect(backTo(appId, { err: 'invite_send_failed' }))
  }

  revalidatePath('/cosmohype-admin/hype-applications')
  redirect(backTo(appId, { saved: 'resent' }))
}
