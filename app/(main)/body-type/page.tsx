'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────────────────

type BodyType = 'straight' | 'wave' | 'natural'

type Choice = {
  label: string
  type: BodyType
}

type Question = {
  question: string
  choices: [Choice, Choice, Choice]
}

type BodyTypeInfo = {
  name: string
  subtitle: string
  description: string
  emoji: string
  gradient: string
  items: string[]
  silhouette: string[]
  materials: string[]
  avoid: string[]
}

// ── Body type result data ──────────────────────────────────────────────────

const BODY_TYPE_DATA: Record<BodyType, BodyTypeInfo> = {
  straight: {
    name: 'ストレート',
    subtitle: 'シンプルが一番似合う、上質派',
    description:
      '体にハリと弾力があり、筋肉質でメリハリのあるボディライン。シンプルで上質な素材ほど洗練されて見えます。装飾を足すより引き算のコーデが得意です。',
    emoji: '💎',
    gradient: 'linear-gradient(135deg, #1C0030 0%, #4C1D95 50%, #7C3AED 100%)',
    items: [
      'Vネックトップス',
      'テーラードジャケット',
      'ストレートデニム',
      'タートルネック',
      'トレンチコート',
      'セットアップ',
    ],
    silhouette: ['Iライン', 'Yライン', 'タイトシルエット'],
    materials: ['コットン', 'シルク', 'カシミア', 'ウール'],
    avoid: [
      'フリルやギャザーの多いデザイン',
      'ゆるすぎるオーバーサイズ',
      '過剰な装飾・ビジュー',
    ],
  },
  wave: {
    name: 'ウェーブ',
    subtitle: '曲線美を活かす、フェミニン派',
    description:
      '柔らかく曲線的なボディラインが魅力。ウエストをマークすることで全身のバランスが整います。上半身に視線を集めるデザインや、ふんわりした素材との相性が抜群です。',
    emoji: '🌊',
    gradient: 'linear-gradient(135deg, #1C0010 0%, #831843 50%, #EC4899 100%)',
    items: [
      'フィットトップス',
      'ハイウエストボトムス',
      'フレアスカート',
      'ショートジャケット',
      'Aラインワンピース',
      'リボンブラウス',
    ],
    silhouette: ['Aライン', 'Xライン', 'ウエストマーク'],
    materials: ['シフォン', 'レース', 'サテン', 'ニット'],
    avoid: [
      'ローウエスト・ドロップウエスト',
      'ビッグシルエット全体',
      '重くかさばるアウター',
    ],
  },
  natural: {
    name: 'ナチュラル',
    subtitle: '骨格の存在感を活かす、こなれ派',
    description:
      '骨格がしっかりしていてフレーム感があり、関節が目立ちやすいのが特徴。オーバーサイズやレイヤードが自然に決まり、カジュアルからモードまで幅広く着こなせます。',
    emoji: '🌿',
    gradient: 'linear-gradient(135deg, #0C1A10 0%, #14532D 50%, #16A34A 100%)',
    items: [
      'オーバーサイズトップス',
      'ワイドパンツ',
      'ロングカーディガン',
      'デニムジャケット',
      'マキシ丈スカート',
      'ビッグシャツ',
    ],
    silhouette: ['Oライン', 'ビッグシルエット', 'レイヤード'],
    materials: ['デニム', 'リネン', 'コーデュロイ', 'チェック'],
    avoid: [
      'タイトすぎるシルエット',
      '光沢素材（サテン・シルクなど）',
      '小花柄など細かいプリント',
    ],
  },
}

// ── Questions ──────────────────────────────────────────────────────────────

const QUESTIONS: Question[] = [
  {
    question: '体全体のラインはどれに近いですか？',
    choices: [
      { label: '上半身が発達していて、メリハリがある', type: 'straight' },
      { label: '曲線的でやわらかく、丸みがある', type: 'wave' },
      { label: '骨や筋が目立ち、フレーム感がある', type: 'natural' },
    ],
  },
  {
    question: '肩の形はどれに近いですか？',
    choices: [
      { label: 'なで肩で丸みがある', type: 'wave' },
      { label: 'しっかりとした肩で体を支えている感じ', type: 'straight' },
      { label: '肩の骨が張り出していて目立つ', type: 'natural' },
    ],
  },
  {
    question: '鎖骨の見え方はどれに近いですか？',
    choices: [
      { label: 'はっきり見えて、骨が大きい', type: 'natural' },
      { label: 'あまり目立たない', type: 'straight' },
      { label: 'やや目立つが小ぶり', type: 'wave' },
    ],
  },
  {
    question: '体の厚みはどれに近いですか？',
    choices: [
      { label: '胸板が厚く、立体的', type: 'straight' },
      { label: '薄めで平らな印象', type: 'wave' },
      { label: '骨のフレームが目立つ', type: 'natural' },
    ],
  },
  {
    question: 'ウエストの位置はどれに近いですか？',
    choices: [
      { label: 'ウエストとヒップの差が少ない', type: 'natural' },
      { label: 'ウエストはあるが高め', type: 'straight' },
      { label: 'ウエストが低く、ヒップが目立つ', type: 'wave' },
    ],
  },
  {
    question: 'ヒップの形はどれに近いですか？',
    choices: [
      { label: '丸くてしっかりしている', type: 'straight' },
      { label: '横に広がりやすい', type: 'wave' },
      { label: '平らで横張りしにくい', type: 'natural' },
    ],
  },
  {
    question: '手の印象はどれに近いですか？',
    choices: [
      { label: 'やわらかくふっくらしている', type: 'wave' },
      { label: '筋肉質でハリがある', type: 'straight' },
      { label: '骨張っていて指が長め', type: 'natural' },
    ],
  },
  {
    question: '手首の形はどれに近いですか？',
    choices: [
      { label: '太くてしっかりしている', type: 'straight' },
      { label: '関節が目立って骨ばっている', type: 'natural' },
      { label: '細くて華奢', type: 'wave' },
    ],
  },
  {
    question: '膝の形はどれに近いですか？',
    choices: [
      { label: 'コンパクトで目立たない', type: 'straight' },
      { label: '小さくて丸い', type: 'wave' },
      { label: '大きく骨ばっている', type: 'natural' },
    ],
  },
  {
    question: '脚の印象はどれに近いですか？',
    choices: [
      { label: '細長く骨感がある', type: 'natural' },
      { label: '筋肉質でしっかりしている', type: 'straight' },
      { label: '丸くやわらかい', type: 'wave' },
    ],
  },
  {
    question: '肌の質感はどれに近いですか？',
    choices: [
      { label: 'やわらかくてふわっとしている', type: 'wave' },
      { label: 'しっかりしてさらっとしている', type: 'natural' },
      { label: 'ハリと弾力がある', type: 'straight' },
    ],
  },
  {
    question: '体全体の印象はどれに近いですか？',
    choices: [
      { label: '筋肉がつきやすく肉感的', type: 'straight' },
      { label: '骨格が大きくフレームがしっかりしている', type: 'natural' },
      { label: '脂肪がつきやすく丸みがある', type: 'wave' },
    ],
  },
]

const TOTAL = QUESTIONS.length

// ── Scoring ────────────────────────────────────────────────────────────────

function calcResult(answers: BodyType[]): BodyType {
  const scores: Record<BodyType, number> = { straight: 0, wave: 0, natural: 0 }
  for (const t of answers) scores[t]++

  // 同点時は最後に選んだタイプを優先するため後ろから走査
  const lastAnswer = [...answers].reverse().find(Boolean) ?? 'straight'
  const maxScore = Math.max(scores.straight, scores.wave, scores.natural)

  const tied = (Object.keys(scores) as BodyType[]).filter(t => scores[t] === maxScore)
  if (tied.length === 1) return tied[0]

  // 同点 → 最後に選んだタイプが tied に含まれればそちら
  return tied.includes(lastAnswer) ? lastAnswer : tied[0]
}

// ── Sub-components ─────────────────────────────────────────────────────────

function QuizBackIcon({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center w-9 h-9 rounded-full"
      style={{ color: 'var(--text)' }}
      aria-label="前の質問に戻る"
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
    </button>
  )
}

function TagRow({
  label,
  tags,
  variant = 'default',
}: {
  label: string
  tags: string[]
  variant?: 'accent' | 'muted' | 'default'
}) {
  const tagStyle =
    variant === 'accent'
      ? { background: 'var(--purple-dim)', color: 'var(--purple)', border: '1px solid var(--border)' }
      : variant === 'muted'
        ? { background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.75)', border: '1px solid rgba(239,68,68,0.15)' }
        : { background: 'var(--bg-subtle)', color: 'var(--text-sub)', border: '1px solid var(--border)' }

  return (
    <div className="px-5 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => (
          <span key={tag} className="text-xs px-2.5 py-1 rounded-full font-medium" style={tagStyle}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function BodyTypePage() {
  const [phase, setPhase] = useState<'intro' | 'quiz' | 'result'>('intro')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<BodyType[]>([])
  const [userId, setUserId] = useState<string | null | undefined>(undefined)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  function handleStart() {
    setCurrentIndex(0)
    setAnswers([])
    setPhase('quiz')
  }

  function handleSelect(type: BodyType) {
    const next = [...answers]
    next[currentIndex] = type
    setAnswers(next)
    if (currentIndex < TOTAL - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setPhase('result')
    }
  }

  function handleBack() {
    if (currentIndex === 0) {
      setPhase('intro')
    } else {
      setCurrentIndex(currentIndex - 1)
    }
  }

  function handleRetry() {
    setCurrentIndex(0)
    setAnswers([])
    setSaveStatus('idle')
    setPhase('intro')
  }

  async function handleSave(bodyType: BodyType) {
    if (!userId) return
    setSaveStatus('saving')
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ body_type: bodyType })
      .eq('id', userId)
    setSaveStatus(error ? 'error' : 'saved')
  }

  const progress = ((currentIndex + 1) / TOTAL) * 100

  // ── Intro ────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <>
        <TopBar title="骨格診断" left={<BackButton href="/search" />} />

        <div className="flex flex-col items-center px-5 pb-24">
          <div className="w-full max-w-md mt-8 mb-6 text-center">
            <div
              className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6"
              style={{ background: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 50%, #EC4899 100%)' }}
            >
              <span className="text-4xl" role="img" aria-label="body type">🪄</span>
            </div>

            <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--purple)' }}>
              BODY TYPE DIAGNOSIS
            </p>

            <h1 className="text-2xl font-black tracking-tight mb-4" style={{ color: 'var(--text)' }}>
              骨格診断
            </h1>

            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-sub)' }}>
              12問の質問に答えて、
              <br />
              あなたに似合いやすい着こなしを見つけよう
            </p>
          </div>

          <div
            className="w-full max-w-md rounded-3xl overflow-hidden mb-5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="px-5 py-5 flex flex-col gap-4">
              {[
                { step: '01', label: '12問に答える', desc: '体型・質感・関節など' },
                { step: '02', label: '骨格タイプを判定', desc: 'ストレート・ウェーブ・ナチュラル' },
                { step: '03', label: '着こなしアドバイスを受け取る', desc: '似合うアイテム・避けるアイテム' },
              ].map(({ step, label, desc }) => (
                <div key={step} className="flex items-start gap-4">
                  <div
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                    style={{ background: 'var(--purple-dim)', color: 'var(--purple)' }}
                  >
                    {step}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full max-w-md">
            <button
              onClick={handleStart}
              className="w-full py-4 rounded-2xl font-bold text-base text-white"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)' }}
            >
              診断をはじめる
            </button>

            <p className="text-center text-[11px] mt-4 leading-relaxed px-4" style={{ color: 'var(--text-muted)' }}>
              ※ この診断は医学的な診断ではなく、ファッションの参考診断です
            </p>
          </div>
        </div>
      </>
    )
  }

  // ── Result ───────────────────────────────────────────────────────────────
  if (phase === 'result') {
    const resultType = calcResult(answers)
    const info = BODY_TYPE_DATA[resultType]

    return (
      <>
        <TopBar title="診断結果" left={<BackButton href="/body-type" />} />

        {/* Hero */}
        <div
          className="relative flex flex-col items-center justify-center py-12 px-5 text-center"
          style={{ background: info.gradient }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{ background: 'radial-gradient(circle at 50% 90%, rgba(0,0,0,0.8) 0%, transparent 65%)' }}
          />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <span className="text-6xl drop-shadow-xl" role="img" aria-label={info.name}>
              {info.emoji}
            </span>
            <div>
              <p className="text-white/70 text-sm font-medium mb-1">あなたの骨格タイプは</p>
              <h1 className="text-3xl font-black text-white tracking-tight">{info.name}</h1>
              <p className="text-white/80 text-base mt-1">{info.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 px-5 py-6 pb-24">
          {/* Description */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-sub)' }}>
              {info.description}
            </p>
          </div>

          {/* Advice card */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div
              className="px-5 py-4"
              style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(236,72,153,0.10) 100%)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--purple)' }}>
                STYLE ADVICE
              </p>
              <h2 className="text-base font-black" style={{ color: 'var(--text)' }}>
                {info.name}タイプの着こなし
              </h2>
            </div>

            <div className="divide-y" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
              <TagRow label="似合いやすいアイテム" tags={info.items} variant="accent" />
              <TagRow label="得意なシルエット" tags={info.silhouette} />
              <TagRow label="得意な素材" tags={info.materials} />
              <TagRow label="避けたいポイント" tags={info.avoid} variant="muted" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-1">
            {/* Save button */}
            {userId === null ? (
              <p className="text-center text-xs py-3" style={{ color: 'var(--text-muted)' }}>
                ログインすると保存できます
              </p>
            ) : saveStatus === 'saved' ? (
              <>
                <div
                  className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold"
                  style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: 'rgb(34,197,94)' }}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  骨格タイプを保存しました
                </div>
                <Link
                  href="/style-match"
                  className="w-full py-4 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.97] flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
                    boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
                  }}
                >
                  STYLE ID × 骨格の結果を見る
                </Link>
              </>
            ) : (
              <button
                onClick={() => handleSave(resultType)}
                disabled={saveStatus === 'saving' || userId === undefined}
                className="w-full py-4 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-50"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}
              >
                {saveStatus === 'saving' ? '保存中...' : saveStatus === 'error' ? '保存に失敗しました。もう一度' : 'この骨格タイプを保存する'}
              </button>
            )}

            <button
              onClick={handleRetry}
              className="w-full py-4 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97]"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-sub)' }}
            >
              もう一度診断する
            </button>
          </div>
        </div>
      </>
    )
  }

  // ── Quiz ─────────────────────────────────────────────────────────────────
  const q = QUESTIONS[currentIndex]

  return (
    <>
      <TopBar title="骨格診断" left={<QuizBackIcon onClick={handleBack} />} />

      <div className="flex flex-col px-5 pb-24">
        {/* Progress */}
        <div className="w-full max-w-md mx-auto mt-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--purple)' }}>
              Q{currentIndex + 1}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {currentIndex + 1} / {TOTAL}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #7C3AED, #EC4899)' }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="w-full max-w-md mx-auto mb-6">
          <div
            className="rounded-3xl px-5 py-6"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--purple)' }}>
              QUESTION {currentIndex + 1}
            </p>
            <p className="text-base font-bold leading-snug" style={{ color: 'var(--text)' }}>
              {q.question}
            </p>
          </div>
        </div>

        {/* Choices */}
        <div className="w-full max-w-md mx-auto flex flex-col gap-3">
          {q.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => handleSelect(choice.type)}
              className="w-full text-left px-5 py-4 rounded-2xl font-medium text-sm transition-transform active:scale-[0.97]"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              <span
                className="inline-block text-xs font-black mr-3 w-5 h-5 rounded-full text-center leading-5 shrink-0"
                style={{ background: 'var(--purple-dim)', color: 'var(--purple)' }}
              >
                {String.fromCharCode(65 + i)}
              </span>
              {choice.label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
