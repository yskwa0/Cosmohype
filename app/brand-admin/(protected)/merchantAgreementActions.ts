// =============================================================================
// app/brand-admin/(protected)/merchantAgreementActions.ts
//                                            (Phase 4-B / Migration 168)
//
// Merchant Agreement (ブランド出店規約) への同意記録 Server Action。
// Brand Admin 内の clickwrap modal から呼ばれる。
//
// フロー:
//   1. getBrandAdminContext() で auth 済 user + 現在 brand を確定
//   2. role が 'owner' でなければ redirect (`?err=merchant_agreement_owner_only`)
//   3. サーバ側で SoT の (version, hash) を取得
//   4. shop_brand_merchant_agreement_accept RPC を叩く
//      (RPC 側で auth.uid + owner role + DB registry current との突合を再検証)
//   5. 成功 → /brand-admin?saved=merchant_agreement へ redirect
//
// client 側から (version, hash) を受け取らない = 「任意 version への同意を偽装」
// できない構造にする。 SoT は常に server 側の version.ts + DB registry。
// =============================================================================

'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getBrandAdminContext } from '@/lib/brandAdmin'
import { createClient } from '@/lib/supabase/server'
import {
  MERCHANT_AGREEMENT_CURRENT_VERSION,
  MERCHANT_AGREEMENT_CURRENT_HASH,
} from '@/lib/merchantAgreement/version'

export async function acceptMerchantAgreementAction(_formData: FormData): Promise<void> {
  const returnUrl = '/brand-admin/settings'
  const ctx = await getBrandAdminContext()

  // 二重防御: RPC 側でも owner を再検証するが、UI 経路も server 側で先に弾く
  if (ctx.currentBrand.role !== 'owner') {
    redirect(`${returnUrl}?err=merchant_agreement_owner_only`)
  }

  const supabase = await createClient()
  const { error } = await (
    supabase as unknown as {
      rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
    }
  ).rpc('shop_brand_merchant_agreement_accept', {
    p_brand_id: ctx.currentBrand.brandId,
    p_version:  MERCHANT_AGREEMENT_CURRENT_VERSION,
    p_hash:     MERCHANT_AGREEMENT_CURRENT_HASH,
  })

  if (error) {
    const msg = error.message.toLowerCase()
    let code = 'merchant_agreement_accept_failed'
    if (msg.includes('forbidden'))                            code = 'merchant_agreement_owner_only'
    else if (msg.includes('not_authenticated'))               code = 'not_authenticated'
    else if (msg.includes('merchant_agreement_version_mismatch'))
                                                              code = 'merchant_agreement_version_mismatch'
    else if (msg.includes('merchant_agreement_hash_mismatch'))
                                                              code = 'merchant_agreement_hash_mismatch'
    else if (msg.includes('merchant_agreement_unknown_version'))
                                                              code = 'merchant_agreement_unknown_version'
    else if (msg.includes('brand_not_found'))                 code = 'brand_not_found'
    console.error('[brand-admin/merchant-agreement] accept failed', error)
    redirect(`${returnUrl}?err=${encodeURIComponent(code)}`)
  }

  revalidatePath('/brand-admin')
  revalidatePath('/brand-admin/settings')
  revalidatePath('/brand-admin/products')
  redirect(`${returnUrl}?saved=merchant_agreement`)
}
