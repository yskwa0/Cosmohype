'use client'

// =============================================================================
// StyleIdShowcase
//
// ホームページ内で 8 つの STYLE ID キャラクターを主役として紹介するセクション。
// Hero 直下、FEED/COSMO/HYPE の前に配置する。
//
// 設計:
//   - キャラクター画像は `lib/style-id/character-image.ts` の Z 系 (公式アセット) のみ使用。
//     架空画像・仮画像・外部画像は使わない。
//   - 8 タイプの表示情報 (name / tagline / accent color) は下の `CHARACTERS` 配列で
//     完結。変更が必要な場合はこの配列を編集するだけ。
//   - Mobile: 1 枚ずつ大きく表示する scroll-snap 横スワイプカルーセル。
//     ・次のキャラクターが端から少しだけ覗く (peek)
//     ・下にページインジケーター (dots)、active は伸びる + accent color
//     ・active カラーに応じてセクション背景の radial glow が緩やかに切り替わる
//   - Desktop: 4 列 × 2 段のグリッド。各カードは十分に大きく、画像 3:4、
//     name + tagline + accent bar を配置。
//   - スクロール演出: CSS keyframes のみ (JS 依存無し、SSR 時点で見える)。
// =============================================================================

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

// STYLE ID 識別子 (ランディング内で自己完結的に管理)。
// 診断ロジック側 (`lib/style-id/*`) とは別軸で、ランディング表示専用に
// 必要な最小限の型と画像パス対応表をここで持つ。
type StyleId =
  | 'URBAN_EDGE'
  | 'COSMIC_REBEL'
  | 'SOFT_DREAMER'
  | 'CLASSIC_ELITE'
  | 'FREE_SPIRIT'
  | 'DARK_POET'
  | 'RETRO_WAVE'
  | 'MINIMAL_SOUL'

// ランディング紹介セクション用のキャラクター画像パス (Z 系、iOS アプリと共通素材)。
// `public/style-id-chars/z*.jpg` に配置済み。
const LANDING_CHARACTER_IMAGE: Record<StyleId, string> = {
  URBAN_EDGE:    '/style-id-chars/zurban.jpg',
  COSMIC_REBEL:  '/style-id-chars/zcosmic.jpg',
  SOFT_DREAMER:  '/style-id-chars/zsoft.jpg',
  CLASSIC_ELITE: '/style-id-chars/zclassic.jpg',
  FREE_SPIRIT:   '/style-id-chars/zfree.jpg',
  DARK_POET:     '/style-id-chars/zdark.jpg',
  RETRO_WAVE:    '/style-id-chars/zretro.jpg',
  MINIMAL_SOUL:  '/style-id-chars/zminimal.jpg',
}

function landingCharacterImageFor(id: StyleId): string {
  return LANDING_CHARACTER_IMAGE[id]
}

// -----------------------------------------------------------------------------
// SSR safety:
//   ・セクション全体を SSR 時点で opacity: 1 / transform: none で表示。
//   ・fadeUp は CSS `@keyframes` + `animation-fill-mode: both` の完全 CSS 実装。
//     JS 未 hydrate / IntersectionObserver 非対応 / JS 無効化 のいずれでも
//     少なくとも「1 枚目のキャラクター画像 + 見出し + 8 タイプの全カード」は
//     必ず可視の状態で SSR 出力される。
//   ・`prefers-reduced-motion:reduce` では animation を !important で無効化。
//   ・IntersectionObserver は使わず、モバイル active state はスクロール位置のみ。
//   ・1 枚目 (Urban Edge) と Desktop の 1 段目 4 枚は `priority` で eager 読込。
// -----------------------------------------------------------------------------

type ShowcaseChar = {
  id: StyleId          // lib/style-id で共通の識別子 (画像 lookup キー)
  name: string         // 表示名 (英字、Unbounded 用)
  tagline: string      // 1 行の短い特徴 (仮コピー、差し替え可)
  accent: string       // アクセントカラー (見出し / インジケーター / bar)
  accentSoft: string   // アクセントの淡色 (画像下地 / 背景 glow)
}

// 8 タイプ (仕様書の並び順: Urban Edge → Cosmic Rebel → … → Retro Wave)。
// タグラインは差し替え可能な仮コピー。アクセントは各 STYLE ID の palette から
// 一番読みやすい 1 色を選択している。
const CHARACTERS: ShowcaseChar[] = [
  {
    id: 'URBAN_EDGE',
    name: 'Urban Edge',
    tagline: '都会的でエッジの効いたストリートスタイル',
    accent: '#EF4444',
    accentSoft: 'rgba(239, 68, 68, 0.10)',
  },
  {
    id: 'COSMIC_REBEL',
    name: 'Cosmic Rebel',
    tagline: '個性と未来感を楽しむ自由なスタイル',
    accent: '#7C3AED',
    accentSoft: 'rgba(124, 58, 237, 0.10)',
  },
  {
    id: 'SOFT_DREAMER',
    name: 'Soft Dreamer',
    tagline: '柔らかく幻想的なガーリースタイル',
    accent: '#EC4899',
    accentSoft: 'rgba(236, 72, 153, 0.10)',
  },
  {
    id: 'CLASSIC_ELITE',
    name: 'Classic Elite',
    tagline: '上品さと洗練を大切にするスタイル',
    accent: '#4C1D95',
    accentSoft: 'rgba(76, 29, 149, 0.10)',
  },
  {
    id: 'FREE_SPIRIT',
    name: 'Free Spirit',
    tagline: '自然体で自由なミックススタイル',
    accent: '#92400E',
    accentSoft: 'rgba(146, 64, 14, 0.10)',
  },
  {
    id: 'DARK_POET',
    name: 'Dark Poet',
    tagline: 'ダークで繊細なムードを持つスタイル',
    accent: '#1F2937',
    accentSoft: 'rgba(31, 41, 55, 0.10)',
  },
  {
    id: 'MINIMAL_SOUL',
    name: 'Minimal Soul',
    tagline: '無駄を削ぎ落とした静かなスタイル',
    accent: '#6B7280',
    accentSoft: 'rgba(107, 114, 128, 0.10)',
  },
  {
    id: 'RETRO_WAVE',
    name: 'Retro Wave',
    tagline: '懐かしさと新しさを混ぜたスタイル',
    accent: '#F59E0B',
    accentSoft: 'rgba(245, 158, 11, 0.12)',
  },
]

type Props = {
  fontHeading: string
  fontDisplay: string
  fontBody: string
}

export function StyleIdShowcase({ fontHeading, fontDisplay, fontBody }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  // ---- STYLE ID 進捗 (activeIndex) の同期 -------------------------------------
  //
  // 最小構成: 実際にユーザーが指で横スワイプする 1 つの要素 (`.chars-track`) の
  // `scrollLeft` のみを基準に active index を計算する。
  //
  //   ・scroll 検知は `addEventListener('scroll')` を useEffect でアタッチ。
  //     (React 19 の JSX `onScroll` prop は、この特定の div で
  //      scroll イベントに反応しないため、native listener に確定)
  //   ・比較は track の `scrollLeft + clientWidth/2` と
  //     各カードの `offsetLeft + offsetWidth/2` (同じ track scroll 座標系)。
  //   ・`.chars-track` を `position: relative` にして、
  //     カードの offsetParent = track に固定 → offsetLeft が track 座標と一致。
  //   ・IntersectionObserver / pointermove / scrollend / orientationchange は
  //     一切使わない。scroll 単一で確実に動作させる。

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const handleScroll = () => {
      const cards = track.querySelectorAll<HTMLDivElement>('[data-char-idx]')
      if (cards.length === 0) return
      const trackCenter = track.scrollLeft + track.clientWidth / 2
      let bestIdx = 0
      let bestDist = Infinity
      cards.forEach((c, i) => {
        const cardCenter = c.offsetLeft + c.offsetWidth / 2
        const d = Math.abs(cardCenter - trackCenter)
        if (d < bestDist) {
          bestDist = d
          bestIdx = i
        }
      })
      setActive(bestIdx)
    }

    track.addEventListener('scroll', handleScroll, { passive: true })
    return () => track.removeEventListener('scroll', handleScroll)
  }, [])

  // インジケーター tap 用: 対応カードを scroll 中央に移動。
  // active 計算と同じ offsetLeft ベースで delta を求めるので齟齬なし。
  const scrollToIdx = (i: number) => {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelectorAll<HTMLDivElement>('[data-char-idx]')[i]
    if (!card) return
    const target = card.offsetLeft + card.offsetWidth / 2 - track.clientWidth / 2
    track.scrollTo({ left: target, behavior: 'smooth' })
  }

  const activeChar = CHARACTERS[active]

  return (
    <section
      id="style-id-characters"
      className="relative overflow-hidden py-24 sm:py-32"
      style={{ background: '#FFFFFF' }}
      aria-label="8つのSTYLE IDキャラクター"
    >
      <style>{`
        /* CSS-only fadeUp。SSR / JS 未 hydrate / prefers-reduced-motion:reduce
           のいずれでも「最終的に見える」状態を保つ:
             - animation-fill-mode: both で終端 (opacity:1, translateY:0) を保持
             - 既定 style も opacity:1 / transform:none にしておき、animation が
               走らなくても白抜けしない
             - prefers-reduced-motion:reduce では animation を完全に無効化 */
        @keyframes chars_fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .chars-anim {
          opacity: 1;
          transform: translateY(0);
          animation: chars_fadeUp 700ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
        }
        .chars-anim-delay-1 { animation-delay: 120ms; }
        .chars-anim-delay-2 { animation-delay: 240ms; }
        @media (prefers-reduced-motion: reduce) {
          .chars-anim, .chars-anim-delay-1, .chars-anim-delay-2 {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }

        /* モバイルカルーセル (scroll-snap)
           - position: relative を必ず付与:
               子カードの offsetParent = track にして、
               card.offsetLeft が track の scroll 座標系と一致するようにする
               (これで scrollLeft ベースの中央距離判定が確実に成立)。
           - touch-action: pan-x で iOS Safari に横スクロール専用と明示。 */
        .chars-track {
          position: relative;
          overflow-x: auto;
          overscroll-behavior-x: contain;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          scroll-padding-inline: 24px;
          touch-action: pan-x;
        }
        .chars-track::-webkit-scrollbar { display: none; }
        .chars-track > [data-char-idx] {
          scroll-snap-align: center;
        }
      `}</style>

      {/* active のアクセントカラーに緩やかに追従する背景 glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(closest-side at 50% 55%, ${activeChar.accentSoft}, transparent 65%)`,
          transition: 'background 900ms cubic-bezier(0.22, 0.61, 0.36, 1)',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6 sm:px-10">
        {/* Section header (SSR で見える: opacity 起点 1、CSS animation で fadeUp) */}
        <div className="chars-anim text-center mb-12 sm:mb-16">
          <p
            className="text-[11px] tracking-[0.28em] mb-4"
            style={{ fontFamily: fontBody, fontWeight: 700, color: 'rgba(23, 19, 31, 0.55)' }}
          >
            STYLE ID CHARACTERS
          </p>
          <h2
            className="text-[30px] sm:text-[42px] md:text-[52px] leading-[1.15] tracking-[-0.02em] text-[#17131F]"
            style={{ fontFamily: fontDisplay, fontWeight: 700 }}
          >
            8つのSTYLE ID
          </h2>
          <p
            className="mt-6 text-[14px] sm:text-[15px] leading-[2] mx-auto max-w-md"
            style={{
              fontFamily: fontHeading,
              fontWeight: 400,
              color: 'rgba(23, 19, 31, 0.72)',
            }}
          >
            診断結果から、あなたのファッションの世界観を表すキャラクターが決まります。
          </p>
        </div>

        {/* Mobile: 横スワイプカルーセル (SSR 時点で 1 枚目が見える) */}
        <div className="chars-anim chars-anim-delay-1 md:hidden">
          <div
            ref={trackRef}
            className="chars-track flex gap-4 -mx-6 px-6 pb-2"
            aria-label="キャラクターカルーセル"
          >
            {CHARACTERS.map((c, i) => (
              <MobileCard
                key={c.id}
                idx={i}
                char={c}
                fontHeading={fontHeading}
                fontDisplay={fontDisplay}
                fontBody={fontBody}
                priority={i === 0}
              />
            ))}
            {/* 最終カードの後ろに空白を足して、末尾でも peek と snap が自然に見えるように */}
            <div aria-hidden className="shrink-0" style={{ width: '8px' }} />
          </div>

          {/* ページインジケーター (active は伸びる bar) */}
          <div
            className="mt-8 flex items-center justify-center gap-2"
            role="tablist"
            aria-label="STYLE ID 選択"
          >
            {CHARACTERS.map((c, i) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={active === i}
                aria-label={c.name}
                onClick={() => scrollToIdx(i)}
                className="rounded-full"
                style={{
                  width: active === i ? '22px' : '6px',
                  height: '6px',
                  background: active === i ? activeChar.accent : 'rgba(23, 19, 31, 0.16)',
                  transition: 'width 260ms ease, background 260ms ease',
                  padding: 0,
                  border: 'none',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>

        {/* Desktop: 4 × 2 グリッド (SSR 時点で全キャラクター見える) */}
        <div
          className="chars-anim chars-anim-delay-1 hidden md:grid"
          style={{
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '20px',
          }}
        >
          {CHARACTERS.map((c, i) => (
            <DesktopCard
              key={c.id}
              char={c}
              fontHeading={fontHeading}
              fontDisplay={fontDisplay}
              fontBody={fontBody}
              priority={i < 4}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

// -----------------------------------------------------------------------------
// Mobile card — 1 枚を大きく (幅 78vw、上限 320px)、画像 4:5、name + tagline
// -----------------------------------------------------------------------------

function MobileCard({
  idx,
  char,
  fontHeading,
  fontDisplay,
  fontBody,
  priority,
}: {
  idx: number
  char: ShowcaseChar
  fontHeading: string
  fontDisplay: string
  fontBody: string
  priority?: boolean
}) {
  const src = landingCharacterImageFor(char.id)
  return (
    <div
      data-char-idx={idx}
      className="shrink-0 rounded-3xl overflow-hidden"
      style={{
        width: 'min(78vw, 320px)',
        background: '#FFFFFF',
        border: '1px solid rgba(23, 19, 31, 0.06)',
        boxShadow: '0 24px 60px rgba(23, 19, 31, 0.08), 0 6px 16px rgba(23, 19, 31, 0.04)',
      }}
    >
      {/* 画像コンテナ: aspect-ratio 4/5 で高さを保証。
          Safari < 15 (aspect-ratio 未対応) の保険として minHeight も設定。
          fill モード → 親要素は position: relative + 有効な高さが必須。 */}
      <div
        className="relative w-full"
        style={{
          aspectRatio: '4 / 5',
          minHeight: '260px',
          background: char.accentSoft,
        }}
      >
        <Image
          src={src}
          alt={char.name}
          fill
          sizes="78vw"
          style={{ objectFit: 'cover' }}
          priority={priority}
        />
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span
            aria-hidden
            className="inline-block"
            style={{ width: '18px', height: '2px', background: char.accent }}
          />
          <p
            className="text-[10.5px] tracking-[0.24em]"
            style={{ fontFamily: fontBody, fontWeight: 700, color: char.accent }}
          >
            STYLE ID
          </p>
        </div>
        <h3
          className="text-[22px] leading-[1.2] tracking-[-0.01em] text-[#17131F]"
          style={{ fontFamily: fontDisplay, fontWeight: 700 }}
        >
          {char.name}
        </h3>
        <p
          className="mt-3 text-[13.5px] leading-[1.85]"
          style={{ fontFamily: fontHeading, fontWeight: 400, color: 'rgba(23, 19, 31, 0.72)' }}
        >
          {char.tagline}
        </p>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Desktop card — 4 × 2 グリッド用、画像 3:4、name + tagline
// -----------------------------------------------------------------------------

function DesktopCard({
  char,
  fontHeading,
  fontDisplay,
  fontBody,
  priority,
}: {
  char: ShowcaseChar
  fontHeading: string
  fontDisplay: string
  fontBody: string
  priority?: boolean
}) {
  const src = landingCharacterImageFor(char.id)
  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(23, 19, 31, 0.06)',
        boxShadow: '0 20px 48px rgba(23, 19, 31, 0.08), 0 4px 12px rgba(23, 19, 31, 0.04)',
        transition: 'transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 320ms ease',
      }}
    >
      <div
        className="relative w-full"
        style={{
          aspectRatio: '3 / 4',
          minHeight: '260px',
          background: char.accentSoft,
        }}
      >
        <Image
          src={src}
          alt={char.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          style={{ objectFit: 'cover' }}
          priority={priority}
        />
      </div>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <span
            aria-hidden
            className="inline-block"
            style={{ width: '18px', height: '2px', background: char.accent }}
          />
          <p
            className="text-[10.5px] tracking-[0.24em]"
            style={{ fontFamily: fontBody, fontWeight: 700, color: char.accent }}
          >
            STYLE ID
          </p>
        </div>
        <h3
          className="text-[22px] lg:text-[24px] leading-[1.2] tracking-[-0.01em] text-[#17131F]"
          style={{ fontFamily: fontDisplay, fontWeight: 700 }}
        >
          {char.name}
        </h3>
        <p
          className="mt-3 text-[13.5px] lg:text-[14px] leading-[1.85]"
          style={{ fontFamily: fontHeading, fontWeight: 400, color: 'rgba(23, 19, 31, 0.72)' }}
        >
          {char.tagline}
        </p>
      </div>
    </div>
  )
}
