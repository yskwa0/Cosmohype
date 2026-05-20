'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { QUESTIONS } from '@/lib/style-id/questions'
import { calculateResult, encodeResult } from '@/lib/style-id/scoring'
import type { QuizAnswer } from '@/lib/style-id/types'

const LABELS = ['A', 'B', 'C', 'D']

export default function QuizPage() {
  const router = useRouter()
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const question = QUESTIONS[currentQ]
  const isLast = currentQ === QUESTIONS.length - 1
  const progress = (currentQ / QUESTIONS.length) * 100

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function handleSelect(idx: number) {
    if (selected !== null || isFinishing) return
    setSelected(idx)

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const newAnswers = [...answers, { questionId: question.id, optionIndex: idx }]
      setAnswers(newAnswers)

      if (!isLast) {
        setCurrentQ(q => q + 1)
        setSelected(null)
      } else {
        setIsFinishing(true)
        router.push(`/style-id/result?r=${encodeResult(calculateResult(newAnswers))}`)
      }
    }, 380)
  }

  function handleBack() {
    clearTimeout(timerRef.current)
    if (currentQ === 0) {
      router.push('/style-id')
    } else {
      setSelected(null)
      setAnswers(prev => prev.slice(0, -1))
      setCurrentQ(q => q - 1)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg)' }}
    >
      {/* Sticky header */}
      <header
        className="sticky top-0 z-40 backdrop-blur-xl"
        style={{ background: 'var(--nav-bg)' }}
      >
        <div className="max-w-md mx-auto flex items-center justify-between px-5 h-14">
          <button
            onClick={handleBack}
            className="flex items-center justify-center w-9 h-9 rounded-full transition-transform duration-75 active:scale-90"
            style={{ color: 'var(--text)' }}
            aria-label="戻る"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {currentQ + 1} <span style={{ color: 'var(--border)' }}>/</span> {QUESTIONS.length}
          </span>
          <div className="w-9" />
        </div>

        {/* Progress bar */}
        <div className="h-[3px]" style={{ background: 'var(--bg-subtle)' }}>
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #7C3AED, #A855F7)',
            }}
          />
        </div>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-5 pt-10 pb-10 flex flex-col gap-8">
          {/* Question */}
          <div>
            <span
              className="inline-block text-xs font-bold tracking-widest mb-3"
              style={{ color: 'var(--purple)' }}
            >
              Q{currentQ + 1}
            </span>
            <h2 className="text-[22px] font-bold leading-snug" style={{ color: 'var(--text)' }}>
              {question.text}
            </h2>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-3">
            {question.options.map((option, idx) => {
              const isSelected = selected === idx
              const isDimmed = selected !== null && !isSelected
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={selected !== null || isFinishing}
                  className="w-full px-4 py-4 rounded-2xl text-left flex items-center gap-4 transition-all duration-200"
                  style={{
                    background: isSelected ? 'var(--purple-dim)' : 'var(--bg-elevated)',
                    border: `1.5px solid ${isSelected ? 'var(--purple)' : 'var(--border)'}`,
                    opacity: isDimmed ? 0.38 : 1,
                    transform: isSelected ? 'scale(0.99)' : 'scale(1)',
                  }}
                >
                  {/* Label circle */}
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: isSelected ? 'var(--purple-glow)' : 'var(--bg-subtle)',
                      color: isSelected ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    {isSelected ? (
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      LABELS[idx]
                    )}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: isSelected ? 'var(--purple)' : 'var(--text-sub)' }}
                  >
                    {option.text}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Finishing indicator */}
          {isFinishing && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'var(--purple-dim)' }}
              >
                <svg className="w-6 h-6 animate-spin" style={{ color: 'var(--purple)' }} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="10"/>
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                あなたのスタイルを分析中...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hint at bottom */}
      {selected === null && !isFinishing && (
        <div
          className="sticky bottom-0 text-center py-3 text-xs"
          style={{ color: 'var(--text-muted)', background: 'var(--bg)' }}
        >
          タップして選択 → 自動で次へ
        </div>
      )}
    </div>
  )
}
