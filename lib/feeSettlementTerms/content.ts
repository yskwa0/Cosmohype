// =============================================================================
// lib/feeSettlementTerms/content.ts  (Phase 4-C.7 / Migration 175)
//
// Fee Settlement Terms (料金・精算条件書) の canonical structured content。
// 実データは同ディレクトリの `content.json` に置き、TS 側は型付きで import する
// (public / Brand Admin 同意 modal / hash 計算 / Migration seed 相当の唯一の SoT)。
//
// 本文を実質変更した場合は以下を必ずセットで行うこと:
//   1. content.json を編集
//   2. version を上げる (v1 → v2 等)
//   3. 新しいハッシュを再計算 (lib/feeSettlementTerms/hash.ts の
//      computeFeeSettlementTermsHash を通す)
//   4. shop_brand_fee_settlement_terms row (per brand) の terms_version + terms_hash
//      を更新する (accept RPC は passed version/hash が row の値と一致することを
//      再検証する)
//
// Merchant Agreement とは独立した SoT。 内容が独立して変更されうる (料率変更等)
// ため、hash / version も独立管理する。
//
// ★ Phase 4-C.7 privacy 方針: canonical content (operator 情報は含まないが、
//   将来的な変更で PII が混入する可能性、および Merchant Agreement と対称な
//   設計を維持するため) を Client Component から誤って import しないよう、
//   `import 'server-only'` guard を追加。 Client Component からは `import type`
//   で FeeTermsDocument 型のみを import すること。
// =============================================================================

import 'server-only'
import contentJson from './content.json'

export type FeeTermsParagraph =
  | { kind: 'text';      text: string }
  | { kind: 'ordered';   items: string[] }
  | { kind: 'unordered'; items: string[] }

export interface FeeTermsSection {
  number: number
  title: string
  paragraphs: FeeTermsParagraph[]
}

export interface FeeTermsDocument {
  version:      string
  createdAt:    string   // ISO date "YYYY-MM-DD"
  title:        string
  operatorLine: string
  preamble:     FeeTermsParagraph[]
  sections:     FeeTermsSection[]
}

export const FEE_SETTLEMENT_TERMS_V1: FeeTermsDocument = contentJson as FeeTermsDocument
