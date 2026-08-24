'use server'

// =============================================================================
// Brand Admin Issues — Server Actions
//
// 4 種の遷移を扱う:
//   - startIssueReviewAction:  submitted           → under_review
//   - approveIssueAction:      under_review        → approved
//   - initiateIssueRefundAction: return_in_progress → (Edge Function 経由で返金起票)
//   - rejectIssueAction:       under_review        → rejected
//
// Dev Bypass 撤去済 (Production Supabase 一本運用)。
// 常に user session + shop_brand_*_ RPC (SECURITY DEFINER) 経由。
// 返金は Edge Function `shop-brand-refund-issue` を user access token で invoke。
// =============================================================================

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBrandAdminContext } from '@/lib/brandAdmin'

const REJECTION_REASONS = [
  'defect_not_confirmed',
  'matches_order',
  'customer_preference',
  'insufficient_evidence',
  'other',
] as const

function assertUUID(v: unknown): string {
  const s = String(v ?? '')
  if (!/^[0-9a-fA-F-]{36}$/.test(s)) throw new Error('invalid_uuid')
  return s
}

/** 共通 RPC 呼出 helper。 auth guard + Loose rpc type + error redirect を集約。 */
async function callIssueRpc(
  issueId: string,
  rpc: string,
  params: Record<string, unknown>,
): Promise<void> {
  await getBrandAdminContext()
  const supabase = await createClient()
  const { error } = await (supabase as unknown as {
    rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
  }).rpc(rpc, params)
  if (error) {
    redirect(`/brand-admin/issues/${issueId}?err=${encodeURIComponent(error.message.slice(0, 80))}`)
  }
}

// -----------------------------------------------------------------------------
export async function startIssueReviewAction(formData: FormData) {
  const issueId = assertUUID(formData.get('issue_id'))
  await callIssueRpc(issueId, 'shop_brand_start_issue_review', { p_issue_id: issueId })
  revalidatePath('/brand-admin/issues')
  revalidatePath(`/brand-admin/issues/${issueId}`)
  redirect(`/brand-admin/issues/${issueId}`)
}

// -----------------------------------------------------------------------------
export async function approveIssueAction(formData: FormData) {
  const issueId = assertUUID(formData.get('issue_id'))
  const note = String(formData.get('resolution_note') ?? '').trim().slice(0, 1000)
  await callIssueRpc(issueId, 'shop_brand_approve_issue', {
    p_issue_id: issueId,
    p_resolution_note: note.length > 0 ? note : null,
  })
  revalidatePath('/brand-admin/issues')
  revalidatePath(`/brand-admin/issues/${issueId}`)
  redirect(`/brand-admin/issues/${issueId}`)
}

// -----------------------------------------------------------------------------
// brand が「返品商品を受領して返金へ進む」— shop-brand-refund-issue Edge Function
// を user access token で invoke する。 confirm_return_received + Stripe refund 起票 +
// DB 記録を Edge Function 内で 1 発で行う。
export async function initiateIssueRefundAction(formData: FormData) {
  const issueId = assertUUID(formData.get('issue_id'))
  const confirmed = formData.get('confirmed') === 'true'
  if (!confirmed) redirect(`/brand-admin/issues/${issueId}?err=receipt_not_confirmed`)

  await getBrandAdminContext()
  const supabase = await createClient()
  // Edge Function 経由で確定
  const { data: sess } = await supabase.auth.getSession()
  const accessToken = sess.session?.access_token ?? ''
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const res = await fetch(`${supabaseUrl}/functions/v1/shop-brand-refund-issue`, {
    method: 'POST',
    headers: {
      'apikey': anon,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ issue_id: issueId }),
  })
  if (!res.ok) {
    const bodyText = await res.text()
    console.error('[brand-admin/issues] refund invoke failed', res.status, bodyText.slice(0, 300))
    let code = `http_${res.status}`
    try {
      const parsed = JSON.parse(bodyText) as { error?: string }
      if (parsed.error) code = parsed.error
    } catch { /* ignore */ }
    redirect(`/brand-admin/issues/${issueId}?err=${encodeURIComponent(code)}`)
  }
  revalidatePath('/brand-admin/issues')
  revalidatePath(`/brand-admin/issues/${issueId}`)
  redirect(`/brand-admin/issues/${issueId}`)
}

// -----------------------------------------------------------------------------
export async function rejectIssueAction(formData: FormData) {
  const issueId = assertUUID(formData.get('issue_id'))
  const reason = String(formData.get('rejection_reason') ?? '').trim()
  const note = String(formData.get('resolution_note') ?? '').trim().slice(0, 1000)
  if (!(REJECTION_REASONS as readonly string[]).includes(reason)) {
    redirect(`/brand-admin/issues/${issueId}?err=invalid_rejection_reason`)
  }
  await callIssueRpc(issueId, 'shop_brand_reject_issue', {
    p_issue_id: issueId,
    p_rejection_reason: reason,
    p_resolution_note: note.length > 0 ? note : null,
  })
  revalidatePath('/brand-admin/issues')
  revalidatePath(`/brand-admin/issues/${issueId}`)
  redirect(`/brand-admin/issues/${issueId}`)
}
