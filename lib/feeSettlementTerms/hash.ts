// =============================================================================
// lib/feeSettlementTerms/hash.ts  (Phase 4-C.7 / Migration 175)
//
// Fee Settlement Terms canonical content の SHA-256 ハッシュ計算。
// Merchant Agreement 側 (lib/merchantAgreement/hash.ts) と完全同型の
// stableStringify pattern を採用。
//
// - キーをアルファベット順に固定して JSON 出力
// - UTF-8 でハッシュ入力
// - hex lowercase 64 文字を返す
//
// 呼び出し側は content.ts の FEE_SETTLEMENT_TERMS_V1 (AgreementDocument 相当) を
// 渡す。 Brand Admin の accept flow では、ここで計算した hash を server-side
// で shop_brand_fee_settlement_terms_accept RPC の p_hash 引数として渡す。
// =============================================================================

import 'server-only'
import { createHash } from 'crypto'
import type { FeeTermsDocument } from './content'

function stableStringify(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}'
}

/**
 * Fee Terms canonical serialization (hash 対象の bytes)。
 * Merchant Agreement の serializeCanonical と同一 pattern (stableStringify)。
 */
export function serializeFeeTermsCanonical(doc: FeeTermsDocument): string {
  return stableStringify(doc as unknown)
}

/**
 * Fee Terms canonical body の SHA-256 hex 文字列 (64 chars, lowercase)。
 * shop_brand_fee_settlement_terms.terms_hash に格納する値と、accept RPC で
 * 突合する p_hash に渡す値と一致する。
 */
export function computeFeeSettlementTermsHash(doc: FeeTermsDocument): string {
  return createHash('sha256').update(serializeFeeTermsCanonical(doc), 'utf8').digest('hex')
}
