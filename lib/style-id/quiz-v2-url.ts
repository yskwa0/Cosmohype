// =============================================================================
// quiz-v2-url.ts
//
// 20 問 quiz-v2 の answers を URL クエリ用の文字列に往復変換する。
//
// 【フォーマット】
//   answers = [{qi:0, oi:0}, {qi:1, oi:4}, ...] を
//   "0.0-1.4-..." のようなハイフン区切り文字列にする。
//
// 【なぜエンコード?】
//   quiz→result 遷移時にクエリで運ぶだけの用途。
//   Phase 3 は transfer 未実装なので、URL 改竄で任意の STYLE ID を表示できる。
//   ただし DB 書き込みは一切発生しない (Phase 4 以降で transfer 経由 = 改竄不可 に置き換える)。
//
// 【検証】
//   decodeAnswersV2 は範囲外 / 不正形式を全て null に丸めるので、
//   result page 側は null → redirect('/style-id') で安全に fallback できる。
// =============================================================================

import { QUIZ_V2_QUESTIONS, type QuizV2Answer } from './quiz-v2'

const MAX_ENCODED_LEN = 256

export function encodeAnswersV2(answers: readonly QuizV2Answer[]): string {
  return answers.map((a) => `${a.qi}.${a.oi}`).join('-')
}

export function decodeAnswersV2(raw: unknown): QuizV2Answer[] | null {
  if (typeof raw !== 'string') return null
  if (raw.length === 0 || raw.length > MAX_ENCODED_LEN) return null

  const parts = raw.split('-')
  if (parts.length === 0 || parts.length > QUIZ_V2_QUESTIONS.length) return null

  const answers: QuizV2Answer[] = []
  for (const p of parts) {
    const m = p.match(/^(\d{1,2})\.(\d{1,2})$/)
    if (!m) return null
    const qi = Number(m[1])
    const oi = Number(m[2])
    if (!Number.isInteger(qi) || !Number.isInteger(oi)) return null
    if (qi < 0 || qi >= QUIZ_V2_QUESTIONS.length) return null
    const opts = QUIZ_V2_QUESTIONS[qi].options
    if (oi < 0 || oi >= opts.length) return null
    answers.push({ qi, oi })
  }
  return answers
}
