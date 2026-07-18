'use client'

// =============================================================================
// FeatureRow
//
// FEED / COSMO / HYPE の 3 機能を紹介する共通行コンポーネント。
// - PC: スマホと説明を左右に配置、`imageOnRight` で左右を切替
// - Mobile: 縦並び (スマホ→説明)
// - スマホ画像は `screenSrc` prop で差し替え可能。未指定時は淡いプレースホルダー
//
// v7 (モバイル白画面対策):
//   ・SSR で opacity: 0 → JS で 1 という mount 依存の実装を撤廃。
//   ・SSR 時点で content は完全に visible (opacity: 1)。
//   ・IntersectionObserver は「軽い追加演出」として translateY(8px→0) 程度の
//     動きを付けるだけ。JS が失敗しても content は必ず見える。
//   ・prefers-reduced-motion:reduce では transition も無効化して即静的表示。
// =============================================================================

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

type Props = {
  eyebrow: string          // 見出し上の小さい label ("FEED" 等)
  title: string            // 見出し
  description: string      // 短い説明
  imageOnRight?: boolean   // true でスマホを右、説明を左
  screenSrc?: string       // スマホ内に表示する画面画像 (未指定でプレースホルダー)
  screenAlt?: string       // 画面画像の alt
  fontHeading?: string     // CSS variable / font-family (見出し)
  fontBody?: string        // CSS variable / font-family (本文)
  fontEyebrow?: string     // CSS variable / font-family (eyebrow)
}

export function FeatureRow({
  eyebrow,
  title,
  description,
  imageOnRight = false,
  screenSrc,
  screenAlt,
  fontHeading,
  fontBody,
  fontEyebrow,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  // 初期状態は「登場前 (少し下)」だが、opacity は常に 1 → 白画面にはならない。
  // JS が動く場合、IntersectionObserver 検出 or マウント直後に above-fold なら triggered=true にして
  // translateY を 0 へアニメート。
  const [triggered, setTriggered] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const setRm = () => setReducedMotion(m.matches)
    setRm()
    m.addEventListener?.('change', setRm)

    const el = rootRef.current
    if (!el) return () => m.removeEventListener?.('change', setRm)

    // マウント時に既に viewport 内なら即 triggered (above-fold 対策)。
    const rectAtMount = el.getBoundingClientRect()
    if (rectAtMount.top < window.innerHeight * 0.9) {
      setTriggered(true)
    }

    // Fallback タイマー: 何らかの理由で observer が発火しなくても 2 秒で triggered 化
    // (translateY(8px) が残る白画面ではないが、静止状態としても違和感がないため保険)。
    // IntersectionObserver 非対応環境ではこの fallback だけが triggered へ動かす。
    const fallback = window.setTimeout(() => setTriggered(true), 2000)

    // 非対応環境の場合は observer をセットアップせず fallback タイマーに任せる
    if (typeof IntersectionObserver === 'undefined') {
      return () => {
        window.clearTimeout(fallback)
        m.removeEventListener?.('change', setRm)
      }
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setTriggered(true)
            io.disconnect()
            window.clearTimeout(fallback)
            break
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      window.clearTimeout(fallback)
      m.removeEventListener?.('change', setRm)
    }
  }, [])

  // opacity は常に 1 (白画面対策)。triggered で translateY のみ動かす。
  const translateY = reducedMotion || triggered ? '0px' : '8px'
  const trans = reducedMotion
    ? 'none'
    : 'transform 780ms cubic-bezier(0.22, 0.61, 0.36, 1)'

  return (
    <div
      ref={rootRef}
      className={`grid items-center ${
        imageOnRight ? 'md:grid-cols-[1fr_auto]' : 'md:grid-cols-[auto_1fr]'
      }`}
      style={{
        // モバイル (1 カラム / 縦積み): 同一セクション内のスマホ↔説明文の余白。
        // (セクション間の大きな余白は親 FeatureSections 側で管理する)
        //   clamp(40px, 8vw, 56px) → 390px 幅で 40px、大画面で 56px。
        rowGap: 'clamp(40px, 8vw, 56px)',
        // PC (2 カラム / 横並び): 左右の要素間の余白。
        columnGap: 'clamp(24px, 6vw, 80px)',
      }}
    >
      {/* Phone (PC: imageOnRight で左右順切替、Mobile: 常に上) */}
      <div
        className={`flex justify-center ${imageOnRight ? 'order-1 md:order-2' : 'order-1 md:order-1'}`}
        style={{
          transform: `translateY(${translateY})`,
          transition: reducedMotion ? 'none' : `${trans} 60ms`,
          willChange: 'transform',
        }}
      >
        <PhoneMockup screenSrc={screenSrc} screenAlt={screenAlt} label={eyebrow} />
      </div>

      {/* Text */}
      <div
        className={`${imageOnRight ? 'order-2 md:order-1' : 'order-2 md:order-2'} md:max-w-md`}
        style={{
          transform: `translateY(${translateY})`,
          transition: reducedMotion ? 'none' : `${trans} 220ms`,
          willChange: 'transform',
        }}
      >
        <p
          className="text-[11px] tracking-[0.28em] mb-4"
          style={{
            fontFamily: fontEyebrow,
            fontWeight: 700,
            color: 'rgba(23, 19, 31, 0.55)',
          }}
        >
          {eyebrow}
        </p>
        <h3
          className="text-[24px] sm:text-[30px] md:text-[36px] leading-[1.4] tracking-[-0.005em] text-[#17131F]"
          style={{ fontFamily: fontHeading, fontWeight: 700 }}
        >
          {title}
        </h3>
        <p
          className="mt-5 text-[14px] sm:text-[15px] leading-[2]"
          style={{
            fontFamily: fontBody,
            fontWeight: 400,
            color: 'rgba(23, 19, 31, 0.72)',
          }}
        >
          {description}
        </p>
      </div>
    </div>
  )
}

// ---------- PhoneMockup ----------

// iPhone の端末フレーム (黒ベゼル + 内側の画面領域) を模した枠。
// 正式スクリーンショット (public/images/screens/*.png、941×2048) は
// iOS ステータスバー / Dynamic Island / タブバーを含んだ完成画像なので、
// この枠側では **Dynamic Island の cutout を重ねない** ことで
// "二重の端末表現" を回避する。ベゼル (外周の黒枠) は残して端末らしさを保つ。
//
// スクリーンショット未指定 (`screenSrc` = undefined) の場合は、内側画面に
// 淡いプレースホルダー (ドットパターン + label) をフォールバックとして表示。
//
// 実装ポイント:
//   ・外側 <div>  : 黒ベゼル + 外周角丸 40px + サイズ制限 (mx-auto で中央寄せ)
//   ・内側 <div>  : inset[6px]、角丸 34px、overflow:hidden で画面領域だけをクリップ
//   ・<Image>     : fill + object-fit: cover で画面をぴったり埋める
//                   (aspect 差からくる白隙間を出さない)
//   ・アスペクト  : スクリーンショット原本 (941/2048) をそのまま採用
//                   → cover と contain が実質同じになり切り取り最小

const SCREEN_W = 941
const SCREEN_H = 2048

export function PhoneMockup({
  screenSrc,
  screenAlt,
  label,
}: {
  screenSrc?: string
  screenAlt?: string
  label?: string
}) {
  // モバイル: 画面幅の 55% (両端に十分な余白)、上限 220px。
  // PC: 上限 220px。説明文とスマホが 1 画面にひとまとまりで見えるサイズ。
  // (旧 min(72vw, 280px) → 現行、約 76% に縮小、FEED/COSMO/HYPE すべて同じサイズ)
  // 390px 幅で実測 214px (55% ≒ 目安 45〜58% 帯の中央)、
  // 320px iPhone SE 幅で 176px (可読性を保ったまま説明文と同時視認)。
  const frameStyle: React.CSSProperties = {
    width: 'min(55vw, 220px)',
    aspectRatio: `${SCREEN_W} / ${SCREEN_H}`,
    background: '#0A0910',       // 黒ベゼル
    borderRadius: '40px',        // 外周角丸
    overflow: 'hidden',
    // 控えめな影 (地の色から浮かせる程度)
    boxShadow:
      '0 24px 48px rgba(23, 19, 31, 0.12), 0 6px 16px rgba(23, 19, 31, 0.05)',
    position: 'relative',
  }

  // 内側の画面領域。ベゼル分 (6px) を inset で削り、角丸 34px でクリップ。
  const screenStyle: React.CSSProperties = {
    position: 'absolute',
    inset: '6px',
    borderRadius: '34px',
    overflow: 'hidden',
    background: '#000000',      // スクリーンショット読込前の下地
  }

  return (
    <div className="mx-auto" style={frameStyle}>
      <div style={screenStyle}>
        {screenSrc ? (
          <Image
            src={screenSrc}
            alt={screenAlt ?? ''}
            fill
            sizes="(min-width: 768px) 220px, 55vw"
            // 端末画面全体を自然に埋める。原本アスペクトが枠アスペクトと
            // ほぼ一致するため cover による切り取り量は最小。
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <PhonePlaceholder label={label} />
        )}
      </div>
    </div>
  )
}

function PhonePlaceholder({ label }: { label?: string }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: '#FFFFFF',
        backgroundImage:
          'radial-gradient(rgba(23,19,31,0.06) 1px, transparent 1px)',
        backgroundSize: '14px 14px',
      }}
      aria-hidden
    >
      {label ? (
        <p
          className="text-[10px] tracking-[0.28em] font-bold"
          style={{ color: 'rgba(23,19,31,0.28)', fontFamily: 'inherit' }}
        >
          {label}
        </p>
      ) : null}
    </div>
  )
}
