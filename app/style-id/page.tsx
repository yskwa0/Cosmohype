// =============================================================================
// /style-id  (公開ルート、未認証で利用可能)
//
// 診断ランディング。オレンジ×白の Cosmohype ブランド感で刷新。
// 20 問診断のロジック / STYLE ID / API / 引き継ぎ機能は一切変更しない。
// =============================================================================

import Link from 'next/link'
import Image from 'next/image'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import { SourceCookieSetter } from '@/components/style-id/SourceCookieSetter'
import { characterImageFor } from '@/lib/style-id/character-image'
import type { StyleId } from '@/lib/style-id/types'

export const metadata = {
  title: 'STYLE ID 診断 | Cosmohype',
  description: '20 の質問であなたの STYLE ID を診断します。',
}

// 表示順 (iOS quiz-v2 の STYLE_ID_ORDER_V2 と同順、視覚バランスも考慮)
const STYLE_ID_GRID: StyleId[] = [
  'URBAN_EDGE', 'COSMIC_REBEL', 'SOFT_DREAMER', 'CLASSIC_ELITE',
  'FREE_SPIRIT', 'DARK_POET', 'RETRO_WAVE', 'MINIMAL_SOUL',
]

// Cosmohype ブランドオレンジ (診断 UI 用アクセント)
const BRAND_ORANGE = '#FF6A2A'
const BRAND_ORANGE_DEEP = '#F04E00'

export default function StyleIdLandingPage() {
  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>
      <SourceCookieSetter />

      {/* 上部: ブランドタグ + タイトル */}
      <div className="max-w-md mx-auto px-6 pt-12 pb-6 text-center flex flex-col items-center gap-3">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.16em]"
          style={{
            color: BRAND_ORANGE_DEEP,
            background: 'rgba(255, 106, 42, 0.10)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: BRAND_ORANGE }}
          />
          COSMOHYPE STYLE ID
        </span>
        <h1
          className="text-[34px] leading-[1.1] font-black tracking-tight"
          style={{ color: '#17131F' }}
        >
          FIND YOUR
          <br />
          <span style={{ color: BRAND_ORANGE }}>STYLE ID.</span>
        </h1>
        <p
          className="text-[14px] leading-relaxed"
          style={{ color: '#6B6475' }}
        >
          20 の質問で、あなたのスタイルがわかる。
        </p>
      </div>

      {/* キャラクターグリッド (2×4)、オレンジのハロー背景で存在感を強める */}
      <div className="max-w-md mx-auto px-5 pb-8">
        <div
          className="relative rounded-[28px] p-4 overflow-hidden"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(255,106,42,0.14) 0%, rgba(255,255,255,0) 65%), #FAFAFC',
            border: '1px solid rgba(23,19,31,0.06)',
          }}
        >
          <div className="grid grid-cols-4 gap-3">
            {STYLE_ID_GRID.map((id) => {
              const style = STYLE_TYPES[id]
              return (
                <div
                  key={id}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div
                    className="w-full aspect-square rounded-2xl overflow-hidden"
                    style={{
                      background: '#FFFFFF',
                      boxShadow:
                        '0 1px 2px rgba(23,19,31,0.05), 0 6px 16px rgba(255,106,42,0.06)',
                    }}
                  >
                    {/* unoptimized: Vercel Image Optimization quota (HTTP 402) を回避。
                        キャラサムネイルは 160×160 固定で optimizer の恩恵は少ない。 */}
                    <Image
                      src={characterImageFor(id)}
                      alt={style.name}
                      width={160}
                      height={160}
                      className="w-full h-full object-cover"
                      priority={id === 'URBAN_EDGE'}
                      unoptimized
                    />
                  </div>
                  <p
                    className="text-[9px] font-semibold tracking-tight leading-tight text-center"
                    style={{ color: '#17131F' }}
                  >
                    {style.name}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 数字パネル: 20 QUESTIONS / 8 TYPES */}
      <div className="max-w-md mx-auto px-5 pb-8">
        <div
          className="rounded-2xl grid grid-cols-2 divide-x"
          style={{
            background: '#FAFAFC',
            border: '1px solid rgba(23,19,31,0.06)',
            borderColor: 'rgba(23,19,31,0.06)',
          }}
        >
          <div className="px-4 py-4 text-center">
            <div
              className="text-[24px] font-black leading-none"
              style={{ color: BRAND_ORANGE }}
            >
              20
            </div>
            <div
              className="text-[10px] font-semibold tracking-widest mt-1"
              style={{ color: '#9B97B2' }}
            >
              QUESTIONS
            </div>
          </div>
          <div
            className="px-4 py-4 text-center"
            style={{ borderColor: 'rgba(23,19,31,0.06)' }}
          >
            <div
              className="text-[24px] font-black leading-none"
              style={{ color: BRAND_ORANGE }}
            >
              8
            </div>
            <div
              className="text-[10px] font-semibold tracking-widest mt-1"
              style={{ color: '#9B97B2' }}
            >
              STYLE TYPES
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA (safe-area 対応) */}
      <div
        className="max-w-md mx-auto px-5 pb-8"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
      >
        <Link
          href="/style-id/quiz"
          className="w-full h-14 rounded-2xl flex items-center justify-center text-[16px] font-bold text-white transition-transform duration-100 active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${BRAND_ORANGE} 0%, ${BRAND_ORANGE_DEEP} 100%)`,
            boxShadow: '0 8px 24px rgba(255,106,42,0.35)',
          }}
        >
          診断スタート
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 ml-2"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
        <p
          className="text-[11px] text-center mt-4"
          style={{ color: '#9B97B2' }}
        >
          所要 約 2 分 ・ 会員登録不要
        </p>
      </div>
    </div>
  )
}
