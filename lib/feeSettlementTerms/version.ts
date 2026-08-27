// =============================================================================
// lib/feeSettlementTerms/version.ts  (Phase 4-C.7 / Migration 175)
//
// Server 側で使う「現行 Fee Settlement Terms バージョン / ハッシュ / ドキュメント」
// の単一 export。 client / build 経路には流出させない (`server-only` guard)。
//
// 呼び出し側:
//   - components/brand-admin/FeeSettlementTermsModal.tsx (server component wrapper)
//   - app/brand-admin/(protected)/feeSettlementTermsActions.ts (accept server action)
//   - Brand Admin settings page (Fee Terms 表示 + accept CTA)
//   - lib/brandAdmin.ts の getCurrentBrandFeeSettlementTermsStatus 相当
//
// Migration 172 で作成された shop_brand_fee_settlement_terms table は brand ごとに
// 1 行の active fee term を持つ。 その row の terms_version / terms_hash 列と、
// ここで宣言する CURRENT 値が accept 時に一致することを RPC 側で検証する。
// =============================================================================

import 'server-only'
import { FEE_SETTLEMENT_TERMS_V1, type FeeTermsDocument } from './content'
import { computeFeeSettlementTermsHash } from './hash'

export const FEE_SETTLEMENT_TERMS_CURRENT_DOC: FeeTermsDocument = FEE_SETTLEMENT_TERMS_V1
export const FEE_SETTLEMENT_TERMS_CURRENT_VERSION: string = FEE_SETTLEMENT_TERMS_V1.version
export const FEE_SETTLEMENT_TERMS_CURRENT_HASH:    string = computeFeeSettlementTermsHash(FEE_SETTLEMENT_TERMS_V1)

/**
 * Fee Terms における正式 platform fee rate (basis points)。
 * Phase 4-C.7 現行 = 1000 bps = 10%。
 * Migration 172 の shop_brand_fee_settlement_terms.platform_fee_rate_bps CHECK
 * 制約と一致する。 本文 v1 と rate は同時に決まる (v2 で rate 変更する時は
 * Fee Terms 本文の version を bump する)。
 */
export const FEE_SETTLEMENT_TERMS_CURRENT_RATE_BPS: number = 1000
