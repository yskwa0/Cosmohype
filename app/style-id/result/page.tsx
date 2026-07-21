// =============================================================================
// /style-id/result  (公開ルート、未認証で利用可能)
//
// クエリ ?a=<encoded answers> を受け取って、サーバー側で:
//   1. decodeAnswersV2 で validate (壊れていたら redirect)
//   2. computeScoresV2 + topStyleV2 で結果算出 (表示用)
//   3. STYLE ID 情報を HTML として描画
//
// UI 刷新 (2026-07): オレンジ×白のブランド感 + Z 系キャラクター画像で
//   結果の「当たり感」を強化。
// =============================================================================

import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import { computeScoresV2, topStyleV2 } from '@/lib/style-id/quiz-v2'
import { decodeAnswersV2 } from '@/lib/style-id/quiz-v2-url'
import { resultCharacterImageFor } from '@/lib/style-id/character-image'

export const metadata = {
  title: 'STYLE ID 診断結果 | Cosmohype',
  description: 'あなたの STYLE ID 診断結果です。',
}

const ORANGE = '#FF6A2A'
const ORANGE_DEEP = '#F04E00'
const TEXT_MAIN = '#17131F'
const TEXT_SUB = '#6B6475'
const TEXT_MUTED = '#9B97B2'
const CARD_BG = '#FFFFFF'
const CARD_BORDER = 'rgba(23,19,31,0.08)'

export default async function ResultPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string }>
}) {
  const { a } = await searchParams
  const answers = decodeAnswersV2(a)
  if (!answers || answers.length === 0) {
    redirect('/style-id')
  }

  const scores = computeScoresV2(answers)
  const { styleId, isNeutral } = topStyleV2(scores, answers)
  const style = STYLE_TYPES[styleId]

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      <Header />

      {isNeutral ? (
        <NeutralResultBlock />
      ) : (
        <>
          {/* HERO: Z キャラクター + オレンジのハロー */}
          <div className="max-w-md mx-auto px-5 pt-6 pb-4">
            <div
              className="relative rounded-[32px] overflow-hidden"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 20%, rgba(255,106,42,0.16) 0%, rgba(255,255,255,0) 65%), #FAFAFC',
                border: `1px solid ${CARD_BORDER}`,
              }}
            >
              <div className="flex flex-col items-center gap-3 pt-8 pb-5 px-6 text-center">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.20em]"
                  style={{
                    color: ORANGE_DEEP,
                    background: 'rgba(255,106,42,0.10)',
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: ORANGE }}
                  />
                  YOUR STYLE ID
                </span>

                {/* Z 系キャラクター (大サイズ、正方形) */}
                <div
                  className="w-56 h-56 rounded-3xl overflow-hidden mt-1"
                  style={{
                    background: '#FFFFFF',
                    boxShadow:
                      '0 4px 20px rgba(23,19,31,0.06), 0 12px 32px rgba(255,106,42,0.15)',
                  }}
                >
                  {/* unoptimized: Vercel Image Optimization quota (HTTP 402) を回避し、
                      public 配下の元 JPG をそのまま配信。画像サイズは 448×448 固定で
                      optimizer の恩恵はほぼないため、恒久的に unoptimized で運用する。 */}
                  <Image
                    src={resultCharacterImageFor(styleId)}
                    alt={style.name}
                    width={448}
                    height={448}
                    className="w-full h-full object-cover"
                    priority
                    unoptimized
                  />
                </div>

                <div className="mt-2">
                  <h1
                    className="text-[32px] font-black leading-[1.05] tracking-tight"
                    style={{ color: TEXT_MAIN }}
                  >
                    {style.name}
                  </h1>
                  <p
                    className="text-[14px] font-semibold mt-1"
                    style={{ color: ORANGE_DEEP }}
                  >
                    {style.subtitle}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-md mx-auto px-5 pb-10 flex flex-col gap-5">
            {/* Description */}
            <div
              className="rounded-3xl p-6"
              style={{
                background: CARD_BG,
                border: `1px solid ${CARD_BORDER}`,
              }}
            >
              <p
                className="text-[10px] font-bold tracking-[0.22em]"
                style={{ color: ORANGE_DEEP }}
              >
                ABOUT
              </p>
              <p
                className="text-[14px] leading-[1.85] mt-2"
                style={{ color: TEXT_SUB }}
              >
                {style.description}
              </p>
            </div>

            {/* Traits */}
            <div>
              <p
                className="text-[10px] font-bold tracking-[0.22em] mb-3 px-1"
                style={{ color: TEXT_MUTED }}
              >
                CHARACTER
              </p>
              <div className="flex flex-wrap gap-2">
                {style.traits.map((t) => (
                  <span
                    key={t}
                    className="text-[12px] font-semibold px-3.5 py-1.5 rounded-full"
                    style={{
                      background: 'rgba(255,106,42,0.10)',
                      color: ORANGE_DEEP,
                      border: '1px solid rgba(255,106,42,0.20)',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Keywords */}
            <div>
              <p
                className="text-[10px] font-bold tracking-[0.22em] mb-3 px-1"
                style={{ color: TEXT_MUTED }}
              >
                KEYWORDS
              </p>
              <div className="flex flex-wrap gap-2">
                {style.keywords.map((k) => (
                  <span
                    key={k}
                    className="text-[12px] font-medium px-3.5 py-1.5 rounded-full"
                    style={{
                      background: '#FAFAFC',
                      color: TEXT_SUB,
                      border: `1px solid ${CARD_BORDER}`,
                    }}
                  >
                    # {k}
                  </span>
                ))}
              </div>
            </div>

            {/* Retry */}
            <RetryButton />
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------

function Header() {
  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: '#FFFFFF',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        borderBottom: '1px solid rgba(23,19,31,0.05)',
      }}
    >
      <div className="max-w-md mx-auto flex items-center justify-center h-14 px-5">
        <h1
          className="text-[14px] font-bold tracking-[0.16em]"
          style={{ color: TEXT_MAIN }}
        >
          STYLE ID RESULT
        </h1>
      </div>
    </header>
  )
}

function NeutralResultBlock() {
  return (
    <div className="max-w-md mx-auto px-5 pt-10 pb-12 flex flex-col gap-5">
      <div
        className="rounded-3xl p-8 flex flex-col items-center gap-5 text-center"
        style={{
          background: CARD_BG,
          border: `1px solid ${CARD_BORDER}`,
        }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,106,42,0.10)' }}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-8 h-8"
            fill="none"
            stroke={ORANGE_DEEP}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <div className="flex flex-col gap-2">
          <h2
            className="text-[20px] font-bold"
            style={{ color: TEXT_MAIN }}
          >
            STYLE ID が決まりませんでした
          </h2>
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: TEXT_SUB }}
          >
            もう少し直感で答えてみると、より正確な結果が出ます。
          </p>
        </div>
      </div>
      <RetryButton />
    </div>
  )
}

function RetryButton() {
  return (
    <Link
      href="/style-id/quiz"
      replace
      className="w-full h-12 rounded-2xl flex items-center justify-center text-[13px] font-semibold transition-transform duration-100 active:scale-[0.98]"
      style={{
        background: '#FAFAFC',
        border: `1px solid ${CARD_BORDER}`,
        color: TEXT_SUB,
      }}
    >
      もう一度診断する
    </Link>
  )
}
