// =============================================================================
// scoring.ts (legacy)
//
// 旧 15 問診断 (廃止) が生成した URL 引き渡し用エンコード結果の decodeResult のみ残す。
// 現行 20 問診断は quiz-v2.ts / quiz-v2-url.ts を使用。
//
// 残置理由:
//   ・過去に生成された `?r=<base64>` 形式の共有 URL / body-type 遷移URL が
//     まだ有効なうちに切ると、既存の share リンク / body-type 導線が壊れる。
//   ・decodeResult は quiz 質問データに依存せず、純粋な base64 デコードのみ。
//     15 問データ (questions.ts) を削除しても影響なし。
//
// 消費者:
//   - app/(main)/body-type/page.tsx  (URL ?r= から STYLE ID を復元)
//   - app/(main)/style-id/card/[encoded]/page.tsx  (共有カード表示)
//
// 15 問 quiz UI と calculateResult / encodeResult は Phase 4 で削除済み。
// =============================================================================

import type { StyleId, DiagnosisResult } from './types'
import { STYLE_TYPES } from './styleTypes'

const ALL_STYLE_IDS = Object.keys(STYLE_TYPES) as StyleId[]

export function decodeResult(encoded: string): DiagnosisResult | null {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
    const payload = JSON.parse(atob(padded))
    const primaryStyle: StyleId = payload.p
    const secondaryStyle: StyleId = payload.s
    if (!STYLE_TYPES[primaryStyle] || !STYLE_TYPES[secondaryStyle]) return null
    const scores = Object.fromEntries(ALL_STYLE_IDS.map(id => [id, 0])) as Record<StyleId, number>
    scores[primaryStyle] = payload.pct ?? 0
    return { primaryStyle, secondaryStyle, scores, percentage: payload.pct ?? 0, isNeutral: payload.n === true }
  } catch {
    return null
  }
}
