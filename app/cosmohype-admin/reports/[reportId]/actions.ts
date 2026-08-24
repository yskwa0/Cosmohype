'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCosmohypeAdminContext } from '@/lib/cosmohypeAdmin'

/**
 * `/cosmohype-admin/reports/[reportId]` の Server Action。
 * status 更新のみ (open / reviewing / resolved / dismissed)。
 * 実処理は SECURITY DEFINER RPC `shop_admin_update_product_report_status`。
 */

function assertUUID(v: unknown): string {
  const s = String(v ?? '')
  if (!/^[0-9a-fA-F-]{36}$/.test(s)) throw new Error('invalid_uuid')
  return s
}

const ALLOWED_STATUS = new Set(['open', 'reviewing', 'resolved', 'dismissed'])

function joinParam(base: string, key: string, value: string): string {
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}${key}=${encodeURIComponent(value)}`
}

export async function updateReportStatusAction(formData: FormData): Promise<void> {
  await getCosmohypeAdminContext()

  const reportId = assertUUID(formData.get('report_id'))
  const nextStatus = String(formData.get('next_status') ?? '')
  if (!ALLOWED_STATUS.has(nextStatus)) {
    throw new Error('invalid_status')
  }

  const back = `/cosmohype-admin/reports/${reportId}`

  const supabase = await createClient()
  const { error } = await (
    supabase as unknown as {
      rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
    }
  ).rpc('shop_admin_update_product_report_status', {
    p_report_id: reportId,
    p_status:    nextStatus,
  })

  if (error) {
    const msg = error.message.toLowerCase()
    let code = 'update_failed'
    if (msg.includes('forbidden'))          code = 'forbidden'
    else if (msg.includes('not_authenticated')) code = 'not_authenticated'
    else if (msg.includes('report_not_found'))  code = 'report_not_found'
    else if (msg.includes('invalid_status'))    code = 'invalid_status'
    // eslint-disable-next-line no-console
    console.error('[cosmohype-admin/reports] update status failed', error)
    redirect(joinParam(back, 'err', code))
  }

  revalidatePath('/cosmohype-admin/reports')
  revalidatePath(back)
  redirect(joinParam(back, 'saved', nextStatus))
}
