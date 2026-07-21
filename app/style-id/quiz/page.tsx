'use client'

// =============================================================================
// /style-id/quiz  (公開 20 問診断、未認証で利用可能)
//
// iOS StyleIdQuizView と完全同期の 20 問。UI をオレンジ×白のブランド感で刷新。
// 【不変】QUIZ_V2_QUESTIONS の内容 / 質問順 / 選択肢 / 採点ロジック /
//         encodeAnswersV2 / router.replace の遷移先。
// =============================================================================

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  QUIZ_V2_QUESTIONS,
  type QuizV2Answer,
} from '@/lib/style-id/quiz-v2'
import { encodeAnswersV2 } from '@/lib/style-id/quiz-v2-url'

const BRAND_ORANGE = '#FF6A2A'
const BRAND_ORANGE_DEEP = '#F04E00'

export default function QuizV2Page() {
  const router = useRouter()
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<QuizV2Answer[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const question = QUIZ_V2_QUESTIONS[currentQ]
  const total = QUIZ_V2_QUESTIONS.length
  const isLast = currentQ === total - 1
  const progress = ((currentQ + 1) / total) * 100

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  function handleSelect(idx: number) {
    if (selected !== null || isFinishing) return
    setSelected(idx)

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const newAnswers: QuizV2Answer[] = [
        ...answers,
        { qi: currentQ, oi: idx },
      ]
      setAnswers(newAnswers)

      if (!isLast) {
        setCurrentQ((q) => q + 1)
        setSelected(null)
      } else {
        setIsFinishing(true)
        const encoded = encodeAnswersV2(newAnswers)
        router.replace(`/style-id/result?a=${encoded}`)
      }
    }, 380)
  }

  function handleBack() {
    clearTimeout(timerRef.current)
    if (currentQ === 0) {
      router.replace('/style-id')
    } else {
      setSelected(null)
      setAnswers((prev) => prev.slice(0, -1))
      setCurrentQ((q) => q - 1)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#FFFFFF' }}
    >
      {/* Sticky header (back + counter + progress bar) */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: '#FFFFFF',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          borderBottom: '1px solid rgba(23,19,31,0.06)',
        }}
      >
        <div className="max-w-md mx-auto flex items-center justify-between px-5 h-14">
          <BackButton onClick={handleBack} disabled={isFinishing} />
          <div className="flex items-baseline gap-1 tabular-nums">
            <span
              className="text-[15px] font-black"
              style={{ color: BRAND_ORANGE_DEEP }}
            >
              {currentQ + 1}
            </span>
            <span
              className="text-[12px] font-semibold"
              style={{ color: '#9B97B2' }}
            >
              / {total}
            </span>
          </div>
          <div className="w-9" />
        </div>

        {/* Progress bar */}
        <div
          className="h-[4px]"
          style={{ background: '#F5F0EA' }}
        >
          <div
            className="h-full rounded-r-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${BRAND_ORANGE} 0%, ${BRAND_ORANGE_DEEP} 100%)`,
            }}
          />
        </div>
      </header>

      {/* Question + options */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-5 pt-8 pb-16 flex flex-col gap-8">
          {/* Question */}
          <div className="flex flex-col gap-3">
            <span
              className="inline-block text-[10px] font-bold tracking-[0.22em]"
              style={{ color: BRAND_ORANGE_DEEP }}
            >
              Q {String(currentQ + 1).padStart(2, '0')}
            </span>
            <h2
              className="text-[22px] font-bold leading-[1.45]"
              style={{ color: '#17131F' }}
            >
              {question.text}
            </h2>
          </div>

          {/* Options — 4 style + 1 none */}
          <div className="flex flex-col gap-3">
            {question.options.map((option, idx) => {
              const isSelected = selected === idx
              const isDimmed = selected !== null && !isSelected
              const isNoneOption = option.typeId === null

              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={selected !== null || isFinishing}
                  className="w-full text-left rounded-2xl transition-all duration-200"
                  style={{
                    padding: '16px 18px',
                    background: isSelected
                      ? 'rgba(255,106,42,0.08)'
                      : isNoneOption
                        ? '#FAFAFC'
                        : '#FFFFFF',
                    border: `1.5px solid ${
                      isSelected
                        ? BRAND_ORANGE
                        : isNoneOption
                          ? 'rgba(23,19,31,0.06)'
                          : 'rgba(23,19,31,0.10)'
                    }`,
                    opacity: isDimmed ? 0.35 : 1,
                    transform: isSelected ? 'scale(0.995)' : 'scale(1)',
                    boxShadow: isSelected
                      ? '0 6px 18px rgba(255,106,42,0.20)'
                      : '0 1px 2px rgba(23,19,31,0.03)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        background: isSelected
                          ? BRAND_ORANGE
                          : isNoneOption
                            ? 'rgba(23,19,31,0.05)'
                            : 'rgba(23,19,31,0.05)',
                        color: isSelected ? '#FFFFFF' : '#9B97B2',
                      }}
                    >
                      {isSelected ? (
                        <svg
                          viewBox="0 0 24 24"
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12l5 5 9-11" />
                        </svg>
                      ) : (
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: '#9B97B2' }}
                        >
                          {LABELS[idx]}
                        </span>
                      )}
                    </span>
                    <span
                      className={
                        isNoneOption
                          ? 'text-[13px] font-medium'
                          : 'text-[14px] font-semibold'
                      }
                      style={{
                        color: isSelected
                          ? BRAND_ORANGE_DEEP
                          : isNoneOption
                            ? '#9B97B2'
                            : '#17131F',
                        lineHeight: 1.5,
                      }}
                    >
                      {option.text}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Finishing indicator */}
          {isFinishing && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,106,42,0.10)' }}
              >
                <svg
                  className="w-6 h-6 animate-spin"
                  style={{ color: BRAND_ORANGE_DEEP }}
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="31.4"
                    strokeDashoffset="10"
                  />
                </svg>
              </div>
              <p
                className="text-[13px] font-medium"
                style={{ color: '#9B97B2' }}
              >
                あなたのスタイルを分析中...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer hint */}
      {selected === null && !isFinishing && (
        <div
          className="sticky bottom-0 text-center py-3"
          style={{
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
            background:
              'linear-gradient(to top, #FFFFFF 60%, rgba(255,255,255,0))',
          }}
        >
          <p className="text-[11px]" style={{ color: '#9B97B2' }}>
            タップで選択 → 自動で次の質問へ
          </p>
        </div>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------

const LABELS = ['A', 'B', 'C', 'D', 'E']

function BackButton({
  onClick,
  disabled,
}: {
  onClick: () => void
  disabled: boolean
}) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      aria-label="戻る"
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'rgba(255,106,42,0.10)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        userSelect: 'none',
        transform: pressed ? 'scale(0.88)' : 'scale(1)',
        transition: pressed
          ? 'transform 70ms ease-in'
          : 'transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={18}
        height={18}
        fill="none"
        stroke="#F04E00"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  )
}
