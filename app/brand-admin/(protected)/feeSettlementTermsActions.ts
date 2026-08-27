// =============================================================================
// app/brand-admin/(protected)/feeSettlementTermsActions.ts
//                                             (Phase 4-C.7 / Migration 175)
//
// Fee Settlement Terms (料金・精算条件書) への同意記録 Server Action。
// Brand Admin settings ページ内の clickwrap panel から呼ばれる。
//
// フロー:
//   1. getBrandAdminContext() で auth 済 user + 現在 brand を確定
//   2. role が 'owner' でなければ redirect (`?err=fee_terms_owner_only`)
//   3. サーバ側で SoT の (version, hash) を取得 (FEE_SETTLEMENT_TERMS_CURRENT_*)
//   4. form data から p_term_id (対象 fee_term row の id) を受け取る
//   5. shop_brand_fee_settlement_terms_accept(term_id, version, hash) RPC を叩く
//   6. 成功 → /brand-admin/settings?saved=fee_terms へ redirect
//
// version/hash は client 側から受け取らない = 「任意 version への同意を偽装」できない構造。
// term_id のみは client 側から受け取るが、RPC が owner 検証 + version/hash 突合を再検証。
// =============================================================================

'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getBrandAdminContext } from '@/lib/brandAdmin'
import { createClient } from '@/lib/supabase/server'
import {
  FEE_SETTLEMENT_TERMS_CURRENT_VERSION,
  FEE_SETTLEMENT_TERMS_CURRENT_HASH,
} from '@/lib/feeSettlementTerms/version'

function assertUUID(v: unknown): string {
  const s = String(v ?? '')
  if (!/^[0-9a-fA-F-]{36}$/.test(s)) throw new Error('invalid_uuid')
  return s
}

export async function acceptFeeSettlementTermsAction(formData: FormData): Promise<void> {
  const returnUrl = '/brand-admin/settings'
  const ctx = await getBrandAdminContext()

  // 二重防御: RPC 側でも owner を再検証するが、UI 経路も server 側で先に弾く
  if (ctx.currentBrand.role !== 'owner') {
    redirect(`${returnUrl}?err=fee_terms_owner_only`)
  }

  let termId: string
  try {
    termId = assertUUID(formData.get('term_id'))
  } catch {
    redirect(`${returnUrl}?err=fee_terms_invalid_term_id`)
  }

  const supabase = await createClient()
  const { error } = await (
    supabase as unknown as {
      rpc: (
        fn: string,
        params: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>
    }
  ).rpc('shop_brand_fee_settlement_terms_accept', {
    p_term_id: termId,
    p_version: FEE_SETTLEMENT_TERMS_CURRENT_VERSION,
    p_hash:    FEE_SETTLEMENT_TERMS_CURRENT_HASH,
  })

  if (error) {
    const msg = error.message.toLowerCase()
    let code = 'fee_terms_accept_failed'
    if (msg.includes('not_authenticated'))              code = 'not_authenticated'
    else if (msg.includes('forbidden_owner_only'))      code = 'fee_terms_owner_only'
    else if (msg.includes('fee_terms_version_mismatch'))
                                                        code = 'fee_terms_version_mismatch'
    else if (msg.includes('fee_terms_hash_mismatch'))   code = 'fee_terms_hash_mismatch'
    else if (msg.includes('fee_terms_hash_invalid_length'))
                                                        code = 'fee_terms_hash_invalid_length'
    else if (msg.includes('fee_terms_version_required'))
                                                        code = 'fee_terms_version_required'
    else if (msg.includes('fee_terms_not_current'))     code = 'fee_terms_not_current'
    else if (msg.includes('fee_term_not_found'))        code = 'fee_term_not_found'
    console.error('[brand-admin/fee-settlement-terms] accept failed', error)
    redirect(`${returnUrl}?err=${encodeURIComponent(code)}`)
  }

  revalidatePath('/brand-admin')
  revalidatePath('/brand-admin/settings')
  redirect(`${returnUrl}?saved=fee_terms`)
}
