'use server'

// =============================================================================
// Brand Admin Orders — Server Actions
//
// 3 種のステータス遷移を扱う:
//   - startFulfillmentAction: unfulfilled → preparing
//   - markShippedAction:      preparing   → shipped   (carrier + tracking 必須)
//   - markDeliveredAction:    shipped     → delivered (集計 trigger 起動)
//
// 実行経路: 常に user session + shop_brand_*_ RPC (Migration 124)。
// Dev Bypass 撤去済 (Production Supabase 一本運用)。
// =============================================================================

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBrandAdminContext } from '@/lib/brandAdmin'

function assertGroupId(v: unknown): string {
  const s = String(v ?? '')
  if (!/^[0-9a-fA-F-]{36}$/.test(s)) {
    throw new Error('invalid_order_group_id')
  }
  return s
}

/** 共通 RPC 呼出 helper。 auth guard + Loose rpc type + error redirect を集約。 */
async function callGroupRpc(
  groupId: string,
  rpc: string,
  params: Record<string, unknown>,
): Promise<void> {
  await getBrandAdminContext() // guard, redirects if not auth/member
  const supabase = await createClient()
  const { error } = await (supabase as unknown as {
    rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
  }).rpc(rpc, params)
  if (error) {
    redirect(`/brand-admin/orders/${groupId}?err=${encodeURIComponent(error.message.slice(0, 80))}`)
  }
}

// -----------------------------------------------------------------------------
// startFulfillmentAction : unfulfilled → preparing
// -----------------------------------------------------------------------------
export async function startFulfillmentAction(formData: FormData) {
  const groupId = assertGroupId(formData.get('order_group_id'))
  await callGroupRpc(groupId, 'shop_brand_start_fulfillment', {
    p_order_group_id: groupId,
  })
  revalidatePath(`/brand-admin/orders`)
  revalidatePath(`/brand-admin/orders/${groupId}`)
  redirect(`/brand-admin/orders/${groupId}`)
}

// -----------------------------------------------------------------------------
// markShippedAction : preparing → shipped + carrier + tracking
// -----------------------------------------------------------------------------
export async function markShippedAction(formData: FormData) {
  const groupId = assertGroupId(formData.get('order_group_id'))
  const carrier = String(formData.get('carrier') ?? '').trim().toLowerCase()
  const tracking = String(formData.get('tracking_number') ?? '').trim()
  if (!['yamato', 'sagawa', 'japan_post', 'other'].includes(carrier)) {
    redirect(`/brand-admin/orders/${groupId}?err=invalid_carrier`)
  }
  if (tracking.length < 1 || tracking.length > 60) {
    redirect(`/brand-admin/orders/${groupId}?err=tracking_number_required`)
  }
  await callGroupRpc(groupId, 'shop_brand_mark_shipped', {
    p_order_group_id: groupId,
    p_carrier: carrier,
    p_tracking_number: tracking,
  })
  revalidatePath(`/brand-admin/orders`)
  revalidatePath(`/brand-admin/orders/${groupId}`)
  redirect(`/brand-admin/orders/${groupId}`)
}

// -----------------------------------------------------------------------------
// markDeliveredAction : shipped → delivered (集計 trigger で receipt_status=ready 遷移)
// -----------------------------------------------------------------------------
export async function markDeliveredAction(formData: FormData) {
  const groupId = assertGroupId(formData.get('order_group_id'))
  await callGroupRpc(groupId, 'shop_brand_mark_delivered', {
    p_order_group_id: groupId,
  })
  revalidatePath(`/brand-admin/orders`)
  revalidatePath(`/brand-admin/orders/${groupId}`)
  redirect(`/brand-admin/orders/${groupId}`)
}
