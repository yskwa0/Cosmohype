'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCosmohypeAdminContext } from '@/lib/cosmohypeAdmin'

/**
 * `/cosmohype-admin/brands` の Server Actions。
 * suspend / reactivate は別 RPC (Migration 158)。
 * どちらも Server Action 側 + RPC 側の 2 段 admin gate。
 */

function assertUUID(v: unknown): string {
  const s = String(v ?? '')
  if (!/^[0-9a-fA-F-]{36}$/.test(s)) throw new Error('invalid_uuid')
  return s
}

function trimReason(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? '').trim()
  if (s.length === 0) return null
  return s.slice(0, 1000)
}

function backWithQuery(searchQ: string): string {
  const base = '/cosmohype-admin/brands'
  return searchQ.length > 0 ? `${base}?q=${encodeURIComponent(searchQ)}` : base
}

function joinParam(back: string, key: string, value: string): string {
  const sep = back.includes('?') ? '&' : '?'
  return `${back}${sep}${key}=${encodeURIComponent(value)}`
}

/** ブランド停止 (active → suspended)。archived は RPC 側で拒否される。 */
export async function suspendBrandAction(formData: FormData): Promise<void> {
  await getCosmohypeAdminContext()

  const brandId = assertUUID(formData.get('brand_id'))
  const reason = trimReason(formData.get('reason'))
  const searchQ = String(formData.get('q') ?? '').trim()
  const back = backWithQuery(searchQ)

  const supabase = await createClient()
  const { error } = await (
    supabase as unknown as {
      rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
    }
  ).rpc('shop_admin_suspend_brand', {
    p_brand_id: brandId,
    p_reason: reason,
  })

  if (error) {
    const msg = error.message.toLowerCase()
    let code = 'update_failed'
    if (msg.includes('forbidden'))          code = 'forbidden'
    else if (msg.includes('not_authenticated')) code = 'not_authenticated'
    else if (msg.includes('brand_not_found'))   code = 'brand_not_found'
    else if (msg.includes('brand_archived'))    code = 'brand_archived'
    else if (msg.includes('reason_too_long'))   code = 'reason_too_long'
    // eslint-disable-next-line no-console
    console.error('[cosmohype-admin/brands] rpc suspend failed', error)
    redirect(joinParam(back, 'err', code))
  }

  revalidatePath('/cosmohype-admin/brands')
  redirect(joinParam(back, 'saved', 'suspended'))
}

/** ブランド再開 (suspended → active のみ)。 draft / archived は RPC 側で拒否。 */
export async function reactivateBrandAction(formData: FormData): Promise<void> {
  await getCosmohypeAdminContext()

  const brandId = assertUUID(formData.get('brand_id'))
  const reason = trimReason(formData.get('reason'))
  const searchQ = String(formData.get('q') ?? '').trim()
  const back = backWithQuery(searchQ)

  const supabase = await createClient()
  const { error } = await (
    supabase as unknown as {
      rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
    }
  ).rpc('shop_admin_reactivate_brand', {
    p_brand_id: brandId,
    p_reason: reason,
  })

  if (error) {
    const msg = error.message.toLowerCase()
    let code = 'update_failed'
    if (msg.includes('forbidden'))          code = 'forbidden'
    else if (msg.includes('not_authenticated')) code = 'not_authenticated'
    else if (msg.includes('brand_not_found'))   code = 'brand_not_found'
    else if (msg.includes('not_suspended'))     code = 'not_suspended'
    else if (msg.includes('reason_too_long'))   code = 'reason_too_long'
    // eslint-disable-next-line no-console
    console.error('[cosmohype-admin/brands] rpc reactivate failed', error)
    redirect(joinParam(back, 'err', code))
  }

  revalidatePath('/cosmohype-admin/brands')
  redirect(joinParam(back, 'saved', 'reactivated'))
}
