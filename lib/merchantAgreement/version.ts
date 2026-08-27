// =============================================================================
// lib/merchantAgreement/version.ts  (Phase 4-B / Migration 168)
//
// Server 側で使う「現行 Merchant Agreement バージョン / ハッシュ / ドキュメント」の
// 単一 export。 client / build 経路には流出させない (`server-only` guard)。
//
// 呼び出し側:
//   - components/brand-admin/MerchantAgreementModal.tsx (server component wrapper)
//   - app/brand-admin/(protected)/merchantAgreementActions.ts (accept server action)
//   - app/brand-admin/(protected)/products/actions.ts (publish gate)
// Phase 4-C.7 privacy 方針変更で公開 /merchant-agreement route は削除済。
// operator 実値入り本文は Brand Admin 認証内のみで露出する。
//
// Migration 168 の shop_merchant_agreement_versions にも同じ (version, hash) が
// seed されており、accept RPC は DB 側の current row と一致するかを再検証する
// 二重防護になっている。 boot 時にここで計算した hash が DB seed と乖離すると
// accept RPC が失敗するため、content.json を編集したら Migration 更新も必須。
// =============================================================================

import 'server-only'
import { MERCHANT_AGREEMENT_V2, type AgreementDocument } from './content'
import { computeAgreementHash } from './hash'

export const MERCHANT_AGREEMENT_CURRENT_DOC: AgreementDocument = MERCHANT_AGREEMENT_V2
export const MERCHANT_AGREEMENT_CURRENT_VERSION: string = MERCHANT_AGREEMENT_V2.version
export const MERCHANT_AGREEMENT_CURRENT_HASH:    string = computeAgreementHash(MERCHANT_AGREEMENT_V2)
