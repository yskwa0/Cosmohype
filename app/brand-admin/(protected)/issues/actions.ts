'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isBrandAdminDevBypassEnabled, getBrandAdminContext } from '@/lib/brandAdmin'

const DEV_BYPASS_BRAND_ID = '11111111-1111-4111-8111-111111111111'

const REJECTION_REASONS = [
  'defect_not_confirmed',
  'matches_order',
  'customer_preference',
  'insufficient_evidence',
  'other',
] as const

type LooseSupabase = {
  from: (t: string) => {
    select: (s: string) => {
      eq: (c: string, v: string) => {
        eq: (c: string, v: string) => {
          maybeSingle: () => Promise<{
            data: { id: string; status: string; brand_id: string; order_id: string } | null
            error: unknown
          }>
        }
      }
    }
    update: (patch: Record<string, unknown>) => {
      eq: (c: string, v: string) => {
        eq: (c: string, v: string) => {
          eq: (c: string, v: string) => Promise<{ error: unknown }>
        }
      }
    }
  }
  rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: unknown }>
}

function assertUUID(v: unknown): string {
  const s = String(v ?? '')
  if (!/^[0-9a-fA-F-]{36}$/.test(s)) throw new Error('invalid_uuid')
  return s
}

/** Dev Bypass 経路: brand_id + from-status を必ずクエリ制約に含めた UPDATE + receipt reset RPC */
async function bypassIssueTransition(
  issueId: string,
  fromStatus: string,
  patch: Record<string, unknown>,
  callResetForOrderId?: string | null
): Promise<{ error: string | null }> {
  const admin = createAdminClient() as unknown as LooseSupabase
  const cur = await admin
    .from('shop_order_issues')
    .select('id, status, brand_id, order_id')
    .eq('id', issueId)
    .eq('brand_id', DEV_BYPASS_BRAND_ID)
    .maybeSingle()
  if (cur.error) return { error: 'lookup_failed' }
  if (!cur.data) return { error: 'issue_not_found' }
  if (cur.data.status !== fromStatus) {
    return { error: `invalid_status_transition from=${cur.data.status}` }
  }
  const upd = await admin
    .from('shop_order_issues')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', issueId)
    .eq('brand_id', DEV_BYPASS_BRAND_ID)
    .eq('status', fromStatus)
  if (upd.error) return { error: 'update_failed' }
  if (callResetForOrderId) {
    const r = await admin.rpc('_shop_maybe_reset_receipt_after_issue_decision', {
      p_order_id: callResetForOrderId,
    })
    if (r.error) return { error: 'receipt_reset_failed' }
  }
  return { error: null }
}

// -----------------------------------------------------------------------------
export async function startIssueReviewAction(formData: FormData) {
  const issueId = assertUUID(formData.get('issue_id'))
  const bypass = isBrandAdminDevBypassEnabled()
  if (bypass) {
    const r = await bypassIssueTransition(issueId, 'submitted', { status: 'under_review' })
    if (r.error) redirect(`/brand-admin/issues/${issueId}?err=${encodeURIComponent(r.error)}`)
  } else {
    await getBrandAdminContext()
    const supabase = await createClient()
    const { error } = await (
      supabase as unknown as {
        rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
      }
    ).rpc('shop_brand_start_issue_review', { p_issue_id: issueId })
    if (error) {
      redirect(`/brand-admin/issues/${issueId}?err=${encodeURIComponent(error.message.slice(0, 80))}`)
    }
  }
  revalidatePath('/brand-admin/issues')
  revalidatePath(`/brand-admin/issues/${issueId}`)
  redirect(`/brand-admin/issues/${issueId}`)
}

// -----------------------------------------------------------------------------
export async function approveIssueAction(formData: FormData) {
  const issueId = assertUUID(formData.get('issue_id'))
  const note = String(formData.get('resolution_note') ?? '').trim().slice(0, 1000)
  const bypass = isBrandAdminDevBypassEnabled()
  if (bypass) {
    const r = await bypassIssueTransition(issueId, 'under_review', {
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      resolution_note: note.length > 0 ? note : null,
      // reviewed_by は dev bypass では null 固定 (auth session なし)
    })
    if (r.error) redirect(`/brand-admin/issues/${issueId}?err=${encodeURIComponent(r.error)}`)
  } else {
    await getBrandAdminContext()
    const supabase = await createClient()
    const { error } = await (
      supabase as unknown as {
        rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
      }
    ).rpc('shop_brand_approve_issue', {
      p_issue_id: issueId,
      p_resolution_note: note.length > 0 ? note : null,
    })
    if (error) {
      redirect(`/brand-admin/issues/${issueId}?err=${encodeURIComponent(error.message.slice(0, 80))}`)
    }
  }
  revalidatePath('/brand-admin/issues')
  revalidatePath(`/brand-admin/issues/${issueId}`)
  redirect(`/brand-admin/issues/${issueId}`)
}

// -----------------------------------------------------------------------------
// Phase 4: brand が「返品商品を受領して返金へ進む」— shop-brand-refund-issue Edge Function
// 呼び出し。confirm_return_received + Stripe refund 起票 + DB 記録を一発で行う。
// Dev Bypass 時は auth session が無いため service_role + admin RPC 経由で実行。
export async function initiateIssueRefundAction(formData: FormData) {
  const issueId = assertUUID(formData.get('issue_id'))
  const confirmed = formData.get('confirmed') === 'true'
  if (!confirmed) redirect(`/brand-admin/issues/${issueId}?err=receipt_not_confirmed`)

  const bypass = isBrandAdminDevBypassEnabled()
  if (bypass) {
    // Dev Bypass: server-only admin 経路で confirm_return_received (受領 timestamp のみ) +
    // Stripe refund は shop-brand-refund-issue Edge Function を service_role で invoke
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      redirect(`/brand-admin/issues/${issueId}?err=service_role_missing`)
    }
    const admin = createAdminClient() as unknown as LooseSupabase
    // brand_id + status 制約で他 brand を拒否
    const cur = await admin
      .from('shop_order_issues')
      .select('id, status, brand_id, order_id')
      .eq('id', issueId)
      .eq('brand_id', DEV_BYPASS_BRAND_ID)
      .maybeSingle()
    if (cur.error || !cur.data) redirect(`/brand-admin/issues/${issueId}?err=issue_not_found`)
    if (cur.data!.status !== 'return_in_progress') {
      redirect(`/brand-admin/issues/${issueId}?err=invalid_status_transition`)
    }
    // 受領 timestamp を直接 admin から書く (auth.uid() は null、reviewed_by/received_by は空)
    const now = new Date().toISOString()
    const recvUpd = await admin
      .from('shop_order_issues')
      .update({ return_received_at: now, updated_at: now })
      .eq('id', issueId)
      .eq('brand_id', DEV_BYPASS_BRAND_ID)
      .eq('status', 'return_in_progress')
    if (recvUpd.error) redirect(`/brand-admin/issues/${issueId}?err=receipt_update_failed`)

    // Stripe refund 起票は Edge Function 経由 (metadata + Idempotency-Key 一元管理)
    // Dev Bypass 時は service_role Bearer で Function を叩く
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    const res = await fetch(`${supabaseUrl}/functions/v1/shop-brand-refund-issue`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ issue_id: issueId }),
    })
    // Function 内の auth.getUser(token) は service_role では null が返るはず
    // → Dev Bypass では返金 API 起票のみを service_role で直接コールする代替経路が必要。
    // 現状 confirm は上で済ませたので、Stripe 呼出だけ手動で管理:
    if (!res.ok) {
      const bodyText = await res.text()
      console.error('[brand-admin/issues] dev bypass refund invoke failed', res.status, bodyText.slice(0, 300))
      // service_role では JWT 検証が通らない可能性が高い。fallback として直接 Stripe API を呼ぶ経路は
      // Edge Function 側の secret 分離を壊すため実装しない。scope_conflict と同様に手動対応記録。
      redirect(`/brand-admin/issues/${issueId}?err=dev_bypass_refund_unsupported`)
    }
  } else {
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
  const bypass = isBrandAdminDevBypassEnabled()
  if (bypass) {
    // reject の場合は order_id を取得して receipt reset を発火
    const admin = createAdminClient() as unknown as LooseSupabase
    const cur = await admin
      .from('shop_order_issues')
      .select('id, status, brand_id, order_id')
      .eq('id', issueId)
      .eq('brand_id', DEV_BYPASS_BRAND_ID)
      .maybeSingle()
    if (cur.error || !cur.data) {
      redirect(`/brand-admin/issues/${issueId}?err=issue_not_found`)
    }
    const r = await bypassIssueTransition(
      issueId,
      'under_review',
      {
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason,
        resolution_note: note.length > 0 ? note : null,
      },
      cur.data!.order_id
    )
    if (r.error) redirect(`/brand-admin/issues/${issueId}?err=${encodeURIComponent(r.error)}`)
  } else {
    await getBrandAdminContext()
    const supabase = await createClient()
    const { error } = await (
      supabase as unknown as {
        rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
      }
    ).rpc('shop_brand_reject_issue', {
      p_issue_id: issueId,
      p_rejection_reason: reason,
      p_resolution_note: note.length > 0 ? note : null,
    })
    if (error) {
      redirect(`/brand-admin/issues/${issueId}?err=${encodeURIComponent(error.message.slice(0, 80))}`)
    }
  }
  revalidatePath('/brand-admin/issues')
  revalidatePath(`/brand-admin/issues/${issueId}`)
  redirect(`/brand-admin/issues/${issueId}`)
}
