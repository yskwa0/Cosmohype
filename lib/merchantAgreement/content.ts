// =============================================================================
// lib/merchantAgreement/content.ts  (Phase 4-B / Migration 168)
//
// Merchant Agreement (ブランド出店規約) の canonical structured content。
// 実データは同ディレクトリの `content.json` に置き、TS 側は型付きで import する
// (public page / Brand Admin 同意 modal / hash 計算 / Migration seed の唯一の SoT)。
//
// 本文を実質変更した場合は以下を必ずセットで行うこと:
//   1. content.json を編集
//   2. version を上げる (v1 → v2 等)
//   3. 新しいハッシュを再計算 (lib/merchantAgreement/hash.ts の
//      computeAgreementHash を通す)
//   4. shop_merchant_agreement_versions テーブルへ新 version + hash を
//      registered = current にする Migration を追加
//
// 本文と DB registry のハッシュが乖離すると、accept RPC が「不整合」で失敗する。
//
// ★ Phase 4-C.7 privacy 方針: operator 個人情報 (氏名・住所・email) を含む
//   canonical content を Client Component から誤って import しないよう、
//   `import 'server-only'` guard を追加。 Client Component からは `import type` で
//   AgreementDocument 型のみを import すること (型は compile 時に消去され bundle
//   されない)。 runtime value (MERCHANT_AGREEMENT_V1) を client からアクセスすると
//   Next.js が build error を出す。
// =============================================================================

import 'server-only'
import contentJson from './content.json'

export type Paragraph =
  | { kind: 'text';      text: string }
  | { kind: 'ordered';   items: string[] }
  | { kind: 'unordered'; items: string[] }

export interface AgreementSection {
  number: number
  title: string
  paragraphs: Paragraph[]
}

export interface AgreementDocument {
  version:          string
  createdAt:        string   // ISO date "YYYY-MM-DD"
  title:            string
  operatorLine:     string   // 運営者情報 (現行 v1 は placeholder)
  jurisdictionLine: string   // 管轄裁判所 (現行 v1 は placeholder)
  preamble:         Paragraph[]
  sections:         AgreementSection[]
}

export const MERCHANT_AGREEMENT_V1: AgreementDocument = contentJson as AgreementDocument
