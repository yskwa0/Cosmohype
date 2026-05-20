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
    for (const [styleId, points] of Object.entries(option.scores) as [StyleId, number][]) {
      scores[styleId] += points
    }
  }

  const sorted = (Object.entries(scores) as [StyleId, number][]).sort((a, b) => b[1] - a[1])
  const [primaryStyle, primaryScore] = sorted[0]
  const [secondaryStyle] = sorted[1]
  const total = sorted.reduce((sum, [, s]) => sum + s, 0)
  const percentage = total > 0 ? Math.round((primaryScore / total) * 100) : 0

  return { primaryStyle, secondaryStyle, scores, percentage }
}

export function encodeResult(result: DiagnosisResult): string {
  const payload = JSON.stringify({ p: result.primaryStyle, s: result.secondaryStyle, pct: result.percentage })
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
    return { primaryStyle, secondaryStyle, scores, percentage: payload.pct ?? 0 }
  } catch {
    return null
  }
}
