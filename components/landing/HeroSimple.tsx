'use client'

// =============================================================================
// HeroSimple
//
// ホームトップの Hero。「Fashion meets your universe.」を主役に。
//
// v12 (Hero 冒頭に image.copy.PNG マークを配置):
//   ・Hero 内の順序: image.copy.PNG → "Fashion meets" → "your universe." → 既存の説明文 / CTA
//   ・冗長になる "COSMOHYPE — FASHION SNS" eyebrow は撤去 (画像自体が Cosmohype ロゴ)
//   ・py と mb を調整して Hero の縦方向が不自然に伸びないようにする
// v11 (メインコピー 2 行 + fadeUp 停止):
//   ・"Fashion meets" / "your universe." を display:block で 2 行に確定
//   ・white-space:nowrap は廃止 (収まらない環境でも安全に折返し)
//   ・font-size clamp(28px, 8.6vw, 88px)、line-height 1.08 で存在感を保持
//   ・h1 から hero-anim (fadeUp) クラスを外し、動きなしの静的表示に
//   ・Hero 内の説明カードは「STYLE IDとは？」1 枚のみ (診断機能の概要)
//   ・8 キャラクターの紹介は独立セクション `StyleIdShowcase` で大きく扱う
// =============================================================================

import Link from 'next/link'
import Image from 'next/image'

type Props = {
  appStoreUrl: string
  fontDisplay: string   // "Fashion meets your universe." に使う font-family
  fontJa: string        // 日本語補足に使う font-family
  fontBody: string      // 本文/ボタンに使う font-family
}

// Cosmohype の ink 色 (#17131F) の alpha 版
const INK_70 = 'rgba(23, 19, 31, 0.72)'
const INK_55 = 'rgba(23, 19, 31, 0.60)'

export function HeroSimple({ appStoreUrl, fontDisplay, fontJa, fontBody }: Props) {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: '#FFFFFF' }}
      aria-label="Hero"
    >
      {/* Hero 内アニメーション: CSS keyframes のみ。SSR/JS 未実行でも最終状態で表示される。 */}
      <style>{`
        @keyframes hero_fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-anim {
          animation: hero_fadeUp 900ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-anim { animation: none !important; }
        }
      `}</style>

      {/* 淡い装飾 (小さい radial glow を 1 つだけ) */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full"
          style={{
            background:
              'radial-gradient(closest-side, rgba(255,106,42,0.10), transparent 70%)',
            filter: 'blur(2px)',
          }}
        />
      </div>

      <div className="relative min-h-[calc(100vh-64px)] sm:min-h-[calc(100vh-72px)] w-full max-w-full overflow-x-hidden flex flex-col items-center justify-center px-4 sm:px-10 py-20 sm:py-24">
        {/* 1. Cosmohype マーク (public/cosmohype-mark.png = "image.copy.PNG"、シンボル+文字)。
             Hero の最上段に配置し、ページ上部の主役として大きく表示する。
             ・幅: clamp(240px, 80vw, 600px)
                 - 320px 幅 → 256px
                 - 390px 幅 → 312px (画面幅の 80%)
                 - 1280px 幅 → 600px (上限)
             ・Image は width={1024} height={1024} を明示して CLS 防止。
             ・親 div で幅を制御し、Image は w-full h-auto で追従。 */}
        <div
          className="mb-8 sm:mb-10"
          style={{ width: 'clamp(240px, 80vw, 600px)' }}
        >
          <Image
            src="/cosmohype-mark.png"
            alt="Cosmohype"
            width={1024}
            height={1024}
            priority
            sizes="(min-width: 768px) 600px, 80vw"
            className="w-full h-auto"
            style={{ objectFit: 'contain', background: 'transparent' }}
          />
        </div>

        {/* 2〜3. Main copy — 2 行表示に固定 ("Fashion meets" / "your universe.")。
             ・white-space: nowrap は使わない (収まらないとき自然な折返しでも安全)
             ・display: block で 2 行を確定
             ・hero-anim (fadeUp animation) は付けない → 動きなしの静的表示
               (以前は fadeUp が原因で「動いていた」ため、意図的に外している) */}
        <div className="w-full flex justify-center">
          <h1
            className="text-center text-[#17131F]"
            style={{
              fontFamily: fontDisplay,
              // clamp min は 320px 幅の iPhone SE 相当でも "Fashion meets" と
              // "your universe." がそれぞれ 1 行に収まる値。
              // (「Fashion meets」= 13 文字 × 約 0.65em = ~9em、
              //  320-32padding=288px 内に収めるため font-size ≤ 32px)
              fontSize: 'clamp(28px, 8.6vw, 88px)',
              lineHeight: 1.08,
              letterSpacing: '-0.035em',
            }}
          >
            <span style={{ fontWeight: 800, display: 'block' }}>Fashion meets</span>
            <span
              style={{
                fontWeight: 500,
                display: 'block',
                background: 'linear-gradient(135deg, #FF6A2A 0%, #EC4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              your universe.
            </span>
          </h1>
        </div>

        {/* 小さい日本語補足 */}
        <p
          className="hero-anim mt-8 sm:mt-10 text-[13px] sm:text-[15px] leading-[2] text-center max-w-md"
          style={{
            fontFamily: fontJa,
            fontWeight: 400,
            color: INK_70,
            animationDelay: '260ms',
          }}
        >
          好きな服が、誰かの日常。
        </p>

        {/* CTA */}
        <div
          className="hero-anim mt-10 sm:mt-12 flex flex-col sm:flex-row gap-3 justify-center"
          style={{ animationDelay: '380ms' }}
        >
          <Link
            href="/style-id"
            className="inline-flex items-center justify-center gap-2 rounded-full h-12 sm:h-13 px-7 text-white text-[14px]"
            style={{
              background: 'linear-gradient(135deg, #FF6A2A 0%, #F04E00 100%)',
              boxShadow: '0 10px 24px rgba(240, 78, 0, 0.26)',
              fontFamily: fontBody,
              fontWeight: 700,
              transition: 'transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            STYLE IDを診断する
          </Link>
          {appStoreUrl ? (
            <a
              href={appStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full h-12 sm:h-13 px-6 text-[14px] border"
              style={{
                color: '#17131F',
                background: '#FFFFFF',
                borderColor: 'rgba(23, 19, 31, 0.12)',
                fontFamily: fontBody,
                fontWeight: 600,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.05 12.53a4.19 4.19 0 0 1 2-3.52 4.28 4.28 0 0 0-3.38-1.83c-1.42-.15-2.79.84-3.51.84-.74 0-1.85-.82-3.05-.8a4.5 4.5 0 0 0-3.79 2.3c-1.63 2.82-.42 7 1.16 9.29.77 1.12 1.68 2.38 2.87 2.34 1.15-.05 1.59-.74 2.98-.74 1.39 0 1.79.74 3.01.72 1.24-.02 2.03-1.14 2.79-2.27a10.1 10.1 0 0 0 1.27-2.6 4.06 4.06 0 0 1-2.35-3.73zM14.7 5.32a4.11 4.11 0 0 0 .93-2.95 4.19 4.19 0 0 0-2.72 1.41 3.92 3.92 0 0 0-.95 2.86 3.46 3.46 0 0 0 2.74-1.32z" />
              </svg>
              App Storeで見る
            </a>
          ) : null}
        </div>

        {/* 「STYLE IDとは？」の短い説明カード (診断機能の概要のみ)。
             キャラクター紹介はここに詰め込まず、Hero 直下の独立セクション
             `StyleIdShowcase` で大きく扱う。 */}
        <div
          className="hero-anim mt-8 sm:mt-10 mx-auto text-left"
          style={{
            animationDelay: '520ms',
            width: 'min(36rem, calc(100vw - 32px))',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="rounded-2xl px-4 sm:px-5 py-4"
            style={{
              background: 'rgba(255, 106, 42, 0.05)',
              border: '1px solid rgba(255, 106, 42, 0.14)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                aria-hidden
                className="inline-block rounded-full"
                style={{ width: '8px', height: '8px', background: '#FF6A2A' }}
              />
              <p
                className="text-[12px] tracking-[0.06em]"
                style={{
                  fontFamily: fontBody,
                  fontWeight: 700,
                  color: '#F04E00',
                }}
              >
                STYLE IDとは？
              </p>
            </div>
            <p
              className="text-[12.5px] sm:text-[13.5px] leading-[1.85]"
              style={{
                fontFamily: fontJa,
                fontWeight: 400,
                color: INK_70,
              }}
            >
              STYLE IDは、20問の診断からあなたのファッションタイプを8つの中から見つける機能です。
              診断結果はプロフィールや投稿でも使用できます。
            </p>
          </div>
        </div>

        {/* Scroll hint (アニメーションは wrapper で行い、中身は muted color 固定) */}
        <div
          className="hero-anim absolute bottom-8 sm:bottom-10 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{ animationDelay: '900ms' }}
          aria-hidden
        >
          <div className="flex flex-col items-center gap-2" style={{ color: INK_55 }}>
            <span
              className="text-[10px] tracking-[0.24em]"
              style={{ fontFamily: fontBody, fontWeight: 600 }}
            >
              SCROLL
            </span>
            <div className="w-px h-6" style={{ background: INK_55 }} />
          </div>
        </div>
      </div>
    </section>
  )
}
