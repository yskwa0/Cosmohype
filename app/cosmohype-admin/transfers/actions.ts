'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCosmohypeAdminContext } from '@/lib/cosmohypeAdmin'

/**
 * `/cosmohype-admin/transfers/[orderGroupId]` の Server Actions。
 *
 * Migration 173 で追加した shop_admin_resolve_transfer_reversal_failed RPC を呼び、
 * reversal_status='failed_persistent' の group に対して retry または abandon を実行する。
 *
 * どちらも Server Action 側 + RPC 側の 2 段 admin gate。
 * 理由 (reason) は必須 (client 側 required + server 側 length check)。
 */

function assertUUID(v: unknown): string {
  const s = String(v ?? '')
  if (!/^[0-9a-fA-F-]{36}$/.test(s)) throw new Error('invalid_uuid')
  return s
}

function trimRequiredReason(v: FormDataEntryValue | null): string {
  const s = String(v ?? '').trim()
  if (s.length === 0) throw new Error('reason_required')
  return s.slice(0, 200)
}

function joinParam(back: string, key: string, value: string): string {
  const sep = back.includes('?') ? '&' : '?'
  return `${back}${sep}${key}=${encodeURIComponent(value)}`
}

function mapRpcError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('not_authenticated')) return 'not_authenticated'
  if (m.includes('forbidden'))         return 'forbidden'
  if (m.includes('order_group_not_found')) return 'order_group_not_found'
  if (m.includes('group_not_connect_settlement_mode')) return 'not_connect_mode'
  if (m.includes('group_reversal_not_failed_persistent')) return 'not_failed_persistent'
  if (m.includes('invalid_action'))    return 'invalid_action'
  if (m.includes('reason_too_long'))   return 'reason_too_long'
  return 'rpc_failed'
}

/**
 * Reversal を retry させる (failed_persistent → pending)。
 * worker が次の tick で拾って Stripe /v1/transfers/{id}/reversals を再発行。
 */
export async function retryReversalAction(formData: FormData): Promise<void> {
  await getCosmohypeAdminContext()

  const orderGroupId = assertUUID(formData.get('order_group_id'))
  const back = `/cosmohype-admin/transfers/${orderGroupId}`

  let reason: string
  try {
    reason = trimRequiredReason(formData.get('reason'))
  } catch {
    redirect(joinParam(back, 'err', 'reason_required'))
  }

  const supabase = await createClient()
  const { error } = await (
    supabase as unknown as {
      rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
    }
  ).rpc('shop_admin_resolve_transfer_reversal_failed', {
    p_order_group_id: orderGroupId,
    p_action:         'retry',
    p_reason:         reason,
  })

  if (error) {
    console.error('[cosmohype-admin/transfers] retry rpc failed', error)
    redirect(joinParam(back, 'err', mapRpcError(error.message)))
  }

  revalidatePath(`/cosmohype-admin/transfers/${orderGroupId}`)
  revalidatePath('/cosmohype-admin/transfers')
  redirect(joinParam(back, 'saved', 'retry'))
}

/**
 * Reversal を放棄する (failed_persistent → abandoned)。
 * Stripe API 呼出なし = Cosmohype 側の損失計上として運営が確定させる操作。
 * 非常に重要な操作なので client 側で二段確認 (window.confirm 2 回) を実施。
 */
export async function abandonReversalAction(formData: FormData): Promise<void> {
  await getCosmohypeAdminContext()

  const orderGroupId = assertUUID(formData.get('order_group_id'))
  const back = `/cosmohype-admin/transfers/${orderGroupId}`

  let reason: string
  try {
    reason = trimRequiredReason(formData.get('reason'))
  } catch {
    redirect(joinParam(back, 'err', 'reason_required'))
  }

  const supabase = await createClient()
  const { error } = await (
    supabase as unknown as {
      rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
    }
  ).rpc('shop_admin_resolve_transfer_reversal_failed', {
    p_order_group_id: orderGroupId,
    p_action:         'abandon',
    p_reason:         reason,
  })

  if (error) {
    console.error('[cosmohype-admin/transfers] abandon rpc failed', error)
    redirect(joinParam(back, 'err', mapRpcError(error.message)))
  }

  revalidatePath(`/cosmohype-admin/transfers/${orderGroupId}`)
  revalidatePath('/cosmohype-admin/transfers')
  redirect(joinParam(back, 'saved', 'abandon'))
}
