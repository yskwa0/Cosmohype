'use server'

// =============================================================================
// Brand Admin Orders — Server Actions (Phase 2)
//
// 3 種のステータス遷移を扱う:
//   - startFulfillmentAction: unfulfilled → preparing
//   - markShippedAction:      preparing   → shipped   (carrier + tracking 必須)
//   - markDeliveredAction:    shipped     → delivered (集計 trigger 起動)
//
// 実行経路:
//   * 通常: user session で shop_brand_*_ RPC (Migration 124) を呼ぶ
//   * Dev Bypass: session が無いため service_role admin client で
//     - 直接 shop_order_groups を UPDATE (brand_id 制約 & status 制約付き)
//     - 続けて _shop_recalc_order_fulfillment(order_id) を admin.rpc で呼ぶ
//   Dev Bypass 経路は isBrandAdminDevBypassEnabled() の三重条件を満たす場合のみ
//   到達する = Production では絶対に走らない。
// =============================================================================

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isBrandAdminDevBypassEnabled, getBrandAdminContext } from '@/lib/brandAdmin'

// Dev Bypass 撤去済 (Production Supabase 一本運用)。
// `isBrandAdminDevBypassEnabled` は lib 側で常に false を返すよう neutralize 済のため、
// 以下 `if (bypass) { ... }` ブランチは dead code (runtime 実行 = 0)。
// DEV_BYPASS_BRAND_ID / createAdminClient は dead branch 内でのみ参照される (未使用扱い)。
const DEV_BYPASS_BRAND_ID = '11111111-1111-4111-8111-111111111111'

type LooseAdmin = {
  from: (t: string) => {
    select: (s: string) => {
      eq: (c: string, v: string) => {
        eq: (c: string, v: string) => {
          maybeSingle: () => Promise<{ data: { order_id: string; fulfillment_status: string; brand_id: string } | null; error: unknown }>
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

/** Dev Bypass 経路: 直接 UPDATE + recalc RPC。brand_id / from-status を必ずクエリ制約に含める */
async function bypassGroupTransition(
  groupId: string,
  fromStatus: string,
  patch: Record<string, unknown>
): Promise<{ orderId: string | null; error: string | null }> {
  const admin = createAdminClient() as unknown as LooseAdmin
  // まず現在の row を lookup (order_id を取るため + brand_id ガード)
  const cur = await admin
    .from('shop_order_groups')
    .select('order_id, fulfillment_status, brand_id')
    .eq('id', groupId)
    .eq('brand_id', DEV_BYPASS_BRAND_ID)
    .maybeSingle()
  if (cur.error) return { orderId: null, error: 'lookup_failed' }
  if (!cur.data) return { orderId: null, error: 'order_group_not_found' }
  if (cur.data.fulfillment_status !== fromStatus) {
    return { orderId: null, error: `invalid_status_transition from=${cur.data.fulfillment_status}` }
  }
  const orderId = cur.data.order_id
  // 親 order 状態 (cancel/failed 系) チェック
  const orderCur = await (admin as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          maybeSingle: () => Promise<{ data: { status: string } | null; error: unknown }>
        }
      }
    }
  })
    .from('shop_orders')
    .select('status')
    .eq('id', orderId)
    .maybeSingle()
  if (orderCur.error) return { orderId: null, error: 'lookup_failed' }
  const ostatus = orderCur.data?.status ?? ''
  if (
    ostatus === 'cancelled' ||
    ostatus === 'cancel_requested' ||
    ostatus === 'refund_required' ||
    ostatus === 'failed'
  ) {
    return { orderId: null, error: 'order_not_shippable' }
  }

  const upd = await admin
    .from('shop_order_groups')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', groupId)
    .eq('brand_id', DEV_BYPASS_BRAND_ID)
    .eq('fulfillment_status', fromStatus)
  if (upd.error) return { orderId: null, error: 'update_failed' }

  // 親 order を集計 (fulfilled 遷移で 121 trigger が receipt_status=ready を書く)
  const recalc = await admin.rpc('_shop_recalc_order_fulfillment', { p_order_id: orderId })
  if (recalc.error) return { orderId, error: 'recalc_failed' }
  return { orderId, error: null }
}

function assertGroupId(v: unknown): string {
  const s = String(v ?? '')
  if (!/^[0-9a-fA-F-]{36}$/.test(s)) {
    throw new Error('invalid_order_group_id')
  }
  return s
}

// -----------------------------------------------------------------------------
// startFulfillmentAction : unfulfilled → preparing
// -----------------------------------------------------------------------------
export async function startFulfillmentAction(formData: FormData) {
  const groupId = assertGroupId(formData.get('order_group_id'))
  const bypass = isBrandAdminDevBypassEnabled()
  if (bypass) {
    const r = await bypassGroupTransition(groupId, 'unfulfilled', {
      fulfillment_status: 'preparing',
    })
    if (r.error) redirect(`/brand-admin/orders/${groupId}?err=${encodeURIComponent(r.error)}`)
  } else {
    await getBrandAdminContext() // guard, redirects if not auth/member
    const supabase = await createClient()
    const { error } = await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }> }).rpc('shop_brand_start_fulfillment', {
      p_order_group_id: groupId,
    })
    if (error) {
      redirect(`/brand-admin/orders/${groupId}?err=${encodeURIComponent(error.message.slice(0, 80))}`)
    }
  }
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
  const bypass = isBrandAdminDevBypassEnabled()
  if (bypass) {
    const r = await bypassGroupTransition(groupId, 'preparing', {
      fulfillment_status: 'shipped',
      tracking_carrier: carrier,
      tracking_number: tracking,
      shipped_at: new Date().toISOString(),
    })
    if (r.error) redirect(`/brand-admin/orders/${groupId}?err=${encodeURIComponent(r.error)}`)
  } else {
    await getBrandAdminContext()
    const supabase = await createClient()
    const { error } = await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }> }).rpc('shop_brand_mark_shipped', {
      p_order_group_id: groupId,
      p_carrier: carrier,
      p_tracking_number: tracking,
    })
    if (error) {
      redirect(`/brand-admin/orders/${groupId}?err=${encodeURIComponent(error.message.slice(0, 80))}`)
    }
  }
  revalidatePath(`/brand-admin/orders`)
  revalidatePath(`/brand-admin/orders/${groupId}`)
  redirect(`/brand-admin/orders/${groupId}`)
}

// -----------------------------------------------------------------------------
// markDeliveredAction : shipped → delivered (集計 trigger で receipt_status=ready 遷移)
// -----------------------------------------------------------------------------
export async function markDeliveredAction(formData: FormData) {
  const groupId = assertGroupId(formData.get('order_group_id'))
  const bypass = isBrandAdminDevBypassEnabled()
  if (bypass) {
    const r = await bypassGroupTransition(groupId, 'shipped', {
      fulfillment_status: 'delivered',
      delivered_at: new Date().toISOString(),
    })
    if (r.error) redirect(`/brand-admin/orders/${groupId}?err=${encodeURIComponent(r.error)}`)
  } else {
    await getBrandAdminContext()
    const supabase = await createClient()
    const { error } = await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }> }).rpc('shop_brand_mark_delivered', {
      p_order_group_id: groupId,
    })
    if (error) {
      redirect(`/brand-admin/orders/${groupId}?err=${encodeURIComponent(error.message.slice(0, 80))}`)
    }
  }
  revalidatePath(`/brand-admin/orders`)
  revalidatePath(`/brand-admin/orders/${groupId}`)
  redirect(`/brand-admin/orders/${groupId}`)
}
