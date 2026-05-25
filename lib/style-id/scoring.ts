import type { StyleId, QuizAnswer, DiagnosisResult } from './types'
import { QUESTIONS } from './questions'
import { STYLE_TYPES } from './styleTypes'

const ALL_STYLE_IDS = Object.keys(STYLE_TYPES) as StyleId[]

export function calculateResult(answers: QuizAnswer[]): DiagnosisResult {
  const scores = Object.fromEntries(ALL_STYLE_IDS.map(id => [id, 0])) as Record<StyleId, number>

  for (const answer of answers) {
    const question = QUESTIONS.find(q => q.id === answer.questionId)
    if (!question) continue
    const option = question.options[answer.optionIndex]
    if (!option) continue

    const entries = Object.entries(option.scores) as [StyleId, number][]
    if (entries.length === 0) {
      // 「当てはまらない」: 全スタイルに均等1点（中立な分布として扱う）
      ALL_STYLE_IDS.forEach(id => { scores[id] += 1 })
    } else {
      for (const [styleId, points] of entries) {
        scores[styleId] += points
      }
    }
  }

  const sorted = (Object.entries(scores) as [StyleId, number][]).sort((a, b) => b[1] - a[1])
  const total = sorted.reduce((sum, [, s]) => sum + s, 0)

  // 全スタイルが同点（全問「当てはまらない」など）の場合は中立スタイルを返す
  const maxScore = sorted[0][1]
  const minScore = sorted[sorted.length - 1][1]
  if (maxScore === minScore) {
    return {
      primaryStyle: 'FREE_SPIRIT',
      secondaryStyle: 'MINIMAL_SOUL',
      scores,
      percentage: Math.round(100 / ALL_STYLE_IDS.length),
      isNeutral: true,
    }
  }

  const [primaryStyle, primaryScore] = sorted[0]
  const [secondaryStyle] = sorted[1]
  const percentage = Math.round((primaryScore / total) * 100)

  return { primaryStyle, secondaryStyle, scores, percentage }
}

export function encodeResult(result: DiagnosisResult): string {
  const payload = JSON.stringify({ p: result.primaryStyle, s: result.secondaryStyle, pct: result.percentage, ...(result.isNeutral ? { n: true } : {}) })
  return btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

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
