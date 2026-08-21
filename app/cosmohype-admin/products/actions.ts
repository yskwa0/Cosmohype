'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCosmohypeAdminContext } from '@/lib/cosmohypeAdmin'

/**
 * `/cosmohype-admin/products` から発火する Server Actions。
 *
 * 通常経路:
 *   getCosmohypeAdminContext() が SSR 側で admin gate 発火
 *   → shop_admin_force_unpublish_product RPC を呼ぶ (SECURITY DEFINER + admin 再検証)
 *
 * Dev Bypass 経路は使わない (Cosmohype 運営操作は本番のみ想定)。
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

/**
 * 商品を強制販売停止 (status='archived' 相当) にする。
 * 表示・検索・Checkout から即時除外 (RLS + shop_prepare_checkout の brand/status ガード)。
 */
export async function forceUnpublishProductAction(formData: FormData): Promise<void> {
  // SSR 側でも admin gate を再発火 (layout の gate に加え Server Action 自体でも守る)。
  await getCosmohypeAdminContext()

  const backUrl = '/cosmohype-admin/products'
  const productId = assertUUID(formData.get('product_id'))
  const reason = trimReason(formData.get('reason'))
  const searchQ = String(formData.get('q') ?? '').trim()

  const backWithQ = searchQ.length > 0
    ? `${backUrl}?q=${encodeURIComponent(searchQ)}`
    : backUrl

  const supabase = await createClient()
  const { error } = await (
    supabase as unknown as {
      rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
    }
  ).rpc('shop_admin_force_unpublish_product', {
    p_product_id: productId,
    p_reason: reason,
  })

  if (error) {
    const msg = error.message.toLowerCase()
    let code = 'update_failed'
    if (msg.includes('forbidden'))          code = 'forbidden'
    else if (msg.includes('not_authenticated')) code = 'not_authenticated'
    else if (msg.includes('product_not_found')) code = 'product_not_found'
    else if (msg.includes('reason_too_long'))   code = 'reason_too_long'
    // eslint-disable-next-line no-console
    console.error('[cosmohype-admin/products] rpc force_unpublish failed', error)
    redirect(`${backWithQ}${searchQ ? '&' : '?'}err=${encodeURIComponent(code)}`)
  }

  revalidatePath(backUrl)
  redirect(`${backWithQ}${searchQ ? '&' : '?'}saved=unpublished`)
}

/**
 * 商品の運営停止を解除する (admin_suspended_at を null に戻す)。
 * status は archived のまま — ブランドが以後、通常フローで revert-to-draft → publish する。
 * 対象が admin_suspended でない (すでに解除済) 場合は RPC 側で拒否される。
 */
export async function reopenProductAction(formData: FormData): Promise<void> {
  await getCosmohypeAdminContext()

  const backUrl = '/cosmohype-admin/products'
  const productId = assertUUID(formData.get('product_id'))
  const reason = trimReason(formData.get('reason'))
  const searchQ = String(formData.get('q') ?? '').trim()

  const backWithQ = searchQ.length > 0
    ? `${backUrl}?q=${encodeURIComponent(searchQ)}`
    : backUrl

  const supabase = await createClient()
  const { error } = await (
    supabase as unknown as {
      rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
    }
  ).rpc('shop_admin_reopen_product', {
    p_product_id: productId,
    p_reason: reason,
  })

  if (error) {
    const msg = error.message.toLowerCase()
    let code = 'update_failed'
    if (msg.includes('forbidden'))                    code = 'forbidden'
    else if (msg.includes('not_authenticated'))       code = 'not_authenticated'
    else if (msg.includes('product_not_found'))       code = 'product_not_found'
    else if (msg.includes('product_not_admin_suspended')) code = 'product_not_admin_suspended'
    else if (msg.includes('reason_too_long'))         code = 'reason_too_long'
    // eslint-disable-next-line no-console
    console.error('[cosmohype-admin/products] rpc reopen failed', error)
    redirect(`${backWithQ}${searchQ ? '&' : '?'}err=${encodeURIComponent(code)}`)
  }

  revalidatePath(backUrl)
  redirect(`${backWithQ}${searchQ ? '&' : '?'}saved=reopened`)
}
