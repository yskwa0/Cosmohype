export type StyleId =
  | 'COSMIC_REBEL'
  | 'SOFT_DREAMER'
  | 'URBAN_EDGE'
  | 'CLASSIC_ELITE'
  | 'FREE_SPIRIT'
  | 'DARK_POET'
  | 'RETRO_WAVE'
  | 'MINIMAL_SOUL'

export interface StyleType {
  id: StyleId
  name: string
  subtitle: string
  description: string
  traits: string[]
  keywords: string[]
  palette: string[]
  emoji: string
  gradient: string
}

export interface Question {
  id: string
  text: string
  options: Option[]
}

export interface Option {
  text: string
  scores: Partial<Record<StyleId, number>>
}

export interface QuizAnswer {
  questionId: string
  optionIndex: number
}

export interface DiagnosisResult {
  primaryStyle: StyleId
  secondaryStyle: StyleId
  scores: Record<StyleId, number>
  percentage: number
  isNeutral?: boolean
}

export interface CompatibilityResult {
  styleA: StyleId
  styleB: StyleId
  score: number
  label: string
  description: string
}
