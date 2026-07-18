// =============================================================================
// / (公式ホームページ / 公開ランディング) — v4 Fashion meets your universe.
//
// Google / SNS 経由の未認証訪問者が最初に見るページ。
// 認証済ユーザーは従来通り /feed へ redirect (既存挙動を維持)。
//
// v6 デザイン方針:
//   ・メインコピー: 「Fashion meets your universe.」を主役 (2 種類の重みで強弱)
//   ・フォント (最大 2 種類に絞る、統一感重視、セリフ体・italic は一切使わない):
//       Unbounded         : 英字全般 (Google Fonts、モダン display sans、
//                           少し丸みがある太めのサンセリフ、若者向け、
//                           ファッションストリート/SNS 感、Playfair 系の古さゼロ)
//       Zen Maru Gothic   : 和文全般 (見出し・本文・ボタン・ナビを統一、
//                           丸みのある柔らかい Gothic、子供っぽくない)
//   ・正式ロゴ (プロジェクト内の iOS Assets からコピー):
//       /public/cosmohype-wordmark.png : 文字ロゴのみ (2172×724、iOS FeedView の "image")
//       /public/cosmohype-mark.png     : シンボル + 文字ロゴ (1024×1024、iOS Login/SignUp の "image.copy")
//     使い分け:
//       Header             → cosmohype-mark.png     (シンボル + 文字ロゴ)
//       Footer             → cosmohype-wordmark.png (横長 wordmark、フッタ幅にフィット)
//       Final CTA (アイコン) → cosmohype-mark.png     (正方形の "アプリアイコン" 用途)
//       OGP / JSON-LD logo → cosmohype-mark.png     (SNS シェア用の square)
//   ・COSMO / HYPE / FEED を 3 セクションで紹介 (空のスマホモックアップのみ)
//   ・「無料」表現は使用しない
//   ・Splash 画面はトップに限り無効化 (SplashScreenMount.tsx で pathname === '/')
// =============================================================================

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata, Viewport } from 'next'
import { Unbounded, Zen_Maru_Gothic } from 'next/font/google'

import { HeroSimple } from '@/components/landing/HeroSimple'
import { FeatureRow } from '@/components/landing/FeatureRow'
import { SiteHeader } from '@/components/landing/SiteHeader'
import { StyleIdShowcase } from '@/components/landing/StyleIdShowcase'
import { getAppStoreUrl } from '@/lib/landing/app-store-url'

// -----------------------------------------------------------------------------
// フォント (next/font/google、レイアウトシフト無しで self-host、2 種類のみ)
//   - Unbounded       : 英字全般。500/700/800 の 3 段階で「太い」と「柔らかい」の
//                       強弱を作る (weight 800 → "Fashion meets"、weight 500 → "your universe.")
//   - Zen Maru Gothic : 和文全般。400/500/700 で本文〜ボタンまで統一。
// -----------------------------------------------------------------------------

const unbounded = Unbounded({
  subsets: ['latin'],
  variable: '--font-unbounded',
  weight: ['500', '700', '800'],
  display: 'swap',
})
const zenMaru = Zen_Maru_Gothic({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-zen-maru',
  display: 'swap',
})

// 英字表示は Unbounded 優先、和文が混ざる箇所は Zen Maru 優先。
// (Zen Maru は Latin グリフを持つため、和文混在でも一貫した柔らかい印象を保つ)
const F_DISPLAY = 'var(--font-unbounded), "Zen Maru Gothic", "Hiragino Maru Gothic ProN", sans-serif'
const F_HEADING = 'var(--font-zen-maru), var(--font-unbounded), "Hiragino Maru Gothic ProN", sans-serif'
const F_BODY = 'var(--font-zen-maru), var(--font-unbounded), "Hiragino Maru Gothic ProN", sans-serif'
const F_UI = 'var(--font-zen-maru), var(--font-unbounded), "Hiragino Maru Gothic ProN", sans-serif'

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cosmohype.jp'
// App Store URL は `lib/landing/app-store-url.ts` の getAppStoreUrl() で
// 単一管理 (env 優先 → fallback で必ず非空を返す)。
// ヘッダー / フッター / Hero の App Store 誘導は全てここから受け取る。
const APP_STORE_URL = getAppStoreUrl()

const PAGE_TITLE = 'Cosmohype | Fashion meets your universe.'
const PAGE_DESC =
  'Cosmohypeは、20問の診断からあなたのファッションタイプを8つのSTYLE IDに分類するファッションSNSアプリです。好きなコーデやブランドを見つけ、同じ感性の人とつながれます。'

// トップページの viewport theme-color を layout.tsx (#FFF8F0) から白へ上書き。
// Safari モバイルの browser chrome もページ背景 (#FFFFFF) と同一色にすることで、
// ロゴ周りに「白い矩形」が浮かないよう視覚的に完全一致させる。
export const viewport: Viewport = {
  themeColor: '#FFFFFF',
}

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESC,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESC,
    url: SITE_URL,
    siteName: 'Cosmohype',
    type: 'website',
    locale: 'ja_JP',
    images: [
      { url: `${SITE_URL}/cosmohype-mark.png`, width: 1024, height: 1024, alt: 'Cosmohype' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESC,
    images: [`${SITE_URL}/cosmohype-mark.png`],
  },
  robots: { index: true, follow: true },
}

// -----------------------------------------------------------------------------
// 構造化データ
// -----------------------------------------------------------------------------

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: 'Cosmohype',
      url: SITE_URL,
      logo: `${SITE_URL}/cosmohype-mark.png`,
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}#app`,
      name: 'Cosmohype',
      operatingSystem: 'iOS',
      applicationCategory: 'LifestyleApplication',
      description: PAGE_DESC,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
      ...(APP_STORE_URL ? { url: APP_STORE_URL } : {}),
    },
  ],
}

// -----------------------------------------------------------------------------
// 3 機能 (FEED → COSMO → HYPE) セクションのコピー
//
// スマホ画面画像は準備でき次第、`SCREEN_MAP` の各 src を差し替えるだけで反映される。
// 未指定の間は淡いプレースホルダー (白 + ドットパターン + label) が表示される。
// -----------------------------------------------------------------------------

const FEATURES = [
  {
    key: 'FEED',
    eyebrow: 'FEED',
    title: '好きなファッションと、日々出会う。',
    description:
      '好きなファッションを投稿して、新しいスタイルと出会える場所。フォローしたユーザーのコーデや、同じ感性のトレンドが流れてくる。',
    imageOnRight: false,
  },
  {
    key: 'COSMO',
    eyebrow: 'COSMO',
    title: 'STYLE IDと、ファッションの世界へ。',
    description:
      'STYLE IDや、さまざまなファッションの世界と出会える場所。20問の診断から自分の好みが見つかり、同じ感性のスタイルへ広がっていく。',
    imageOnRight: true,
  },
  {
    key: 'HYPE',
    eyebrow: 'HYPE',
    title: '「好き」を、気軽にシェア。',
    description:
      'みんなの感覚や「好き」を、気軽に共有できる場所。今日のコーデも、心が動いた瞬間も、短く軽やかに投稿できる。',
    imageOnRight: false,
  },
] as const

// スマホ内画面画像の差し替えテーブル。
// 正式スクリーンショット (public/images/screens/*.png) は iPhone の画面全体
// (ステータスバー + Dynamic Island + タブバー含む) を含んだ完成画像。
// FeatureRow.PhoneMockup 側で "二重の端末表現" にならないよう、外側は
// 黒ベゼル / Dynamic Island オーバーレイを付けず、柔らかい角丸のみで表示する。
// 未指定 (undefined) の場合は淡いプレースホルダーへフォールバック。
const SCREEN_MAP: Record<(typeof FEATURES)[number]['key'], string | undefined> = {
  FEED: '/images/screens/feed.png',
  COSMO: '/images/screens/cosmo.png',
  HYPE: '/images/screens/hype.png',
}

// =============================================================================
// Page
// =============================================================================

export default async function HomePage() {
  // 既存挙動を維持: 認証済は /feed へ
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/feed')

  return (
    <>
      {/* 構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ページ固有スタイル (最小限) */}
      <style>{`
        html, body { background: #FFFFFF; color: #17131F; }
        html { scroll-behavior: smooth; }
        /* モバイルで幅超過要素があっても横スクロールを絶対に発生させない */
        html, body { overflow-x: hidden; }

        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
        }
      `}</style>

      <div
        className={`min-h-screen ${unbounded.variable} ${zenMaru.variable}`}
        style={{ background: '#FFFFFF', fontFamily: F_BODY }}
      >
        <SiteHeader fontUI={F_UI} appStoreUrl={APP_STORE_URL} />

        <main>
          {/* Hero: Fashion meets your universe.
              (Hero 内には「STYLE IDとは？」の短い説明カードのみ) */}
          <HeroSimple
            appStoreUrl={APP_STORE_URL}
            fontDisplay={F_DISPLAY}
            fontJa={F_HEADING}
            fontBody={F_BODY}
          />

          {/* 8 つの STYLE ID キャラクター紹介 (独立セクション、目玉機能) */}
          <StyleIdShowcase
            fontDisplay={F_DISPLAY}
            fontHeading={F_HEADING}
            fontBody={F_BODY}
          />

          {/* FEED / COSMO / HYPE */}
          <FeatureSections />

          {/* Final CTA */}
          <FinalCTASection />
        </main>

        <SiteFooter />
      </div>
    </>
  )
}

// (Header は `@/components/landing/SiteHeader` に切り出し、client component として
//  背景不透明 + スクロール hide/show を実装)

// =============================================================================
// Feature Sections — FEED → COSMO → HYPE
// =============================================================================

function FeatureSections() {
  return (
    <section
      className="relative py-20 sm:py-32"
      style={{ background: '#FFFFFF' }}
      aria-label="Cosmohype features"
    >
      {/* 前バージョンで置いていた "Cosmohype は three spaces で成り立っている。" 見出しは削除。
          機能紹介 (FEED / COSMO / HYPE) へシンプルにつなげる。 */}

      {/* Rows — FEED / COSMO / HYPE の各セクション間の縦余白。
          モバイル 390px 前後で、前セクションの説明文最下部と次セクションの
          スマホ枠最上部の間を約 96〜140px 確保 (clamp(96px, 24vw, 140px))。
          セクション同士が「別ブロック」として認識できる十分な区切り。
          PC (sm+) は 160px 固定でセクション区切りを保ちつつ間延び回避。 */}
      <div
        className="max-w-6xl mx-auto px-6 sm:px-10 flex flex-col"
        style={{ rowGap: 'clamp(96px, 24vw, 140px)' }}
      >
        {FEATURES.map((f) => (
          <FeatureRow
            key={f.key}
            eyebrow={f.eyebrow}
            title={f.title}
            description={f.description}
            imageOnRight={f.imageOnRight}
            screenSrc={SCREEN_MAP[f.key]}
            screenAlt={`${f.key} screen`}
            fontHeading={F_HEADING}
            fontBody={F_BODY}
            fontEyebrow={F_BODY}
          />
        ))}
      </div>
    </section>
  )
}

// =============================================================================
// Final CTA
// =============================================================================

function FinalCTASection() {
  return (
    <section
      className="relative py-28 sm:py-40"
      style={{ background: '#FFFFFF' }}
      aria-label="Get started"
    >
      <div className="max-w-2xl mx-auto px-6 sm:px-10 text-center">
        {/* Final CTA: シンボル + 文字ロゴ (image.copy = /public/cosmohype-mark.png、square) */}
        <div className="inline-block mb-10 sm:mb-12">
          <Image
            src="/cosmohype-mark.png"
            alt="Cosmohype"
            width={1024}
            height={1024}
            className="h-28 sm:h-32 w-auto opacity-95"
            style={{ objectFit: 'contain', background: 'transparent' }}
          />
        </div>

        {/* Fashion meets (weight 800、太めで存在感) → your universe. (weight 500、柔らかく) */}
        <h3
          className="text-[30px] sm:text-[46px] md:text-[52px] leading-[1.1] tracking-[-0.02em]"
          style={{ fontFamily: F_DISPLAY }}
        >
          <span style={{ fontWeight: 800 }}>Fashion meets</span>
          <br />
          <span
            style={{
              fontWeight: 500,
              background: 'linear-gradient(135deg, #FF6A2A 0%, #EC4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            your universe.
          </span>
        </h3>

        <p
          className="mt-8 text-[13px] sm:text-[14px] leading-[2] opacity-65 max-w-md mx-auto"
          style={{ fontFamily: F_BODY, fontWeight: 400 }}
        >
          20問のSTYLE ID診断から、はじめよう。
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/style-id"
            className="inline-flex items-center justify-center gap-2 rounded-full h-13 px-7 text-white text-[14px]"
            style={{
              background: 'linear-gradient(135deg, #FF6A2A 0%, #F04E00 100%)',
              boxShadow: '0 10px 24px rgba(240, 78, 0, 0.26)',
              fontFamily: F_UI,
              fontWeight: 700,
            }}
          >
            STYLE IDを診断する
          </Link>

          {APP_STORE_URL ? (
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full h-13 px-6 text-[14px] border"
              style={{
                color: '#17131F',
                background: '#FFFFFF',
                borderColor: 'rgba(23, 19, 31, 0.12)',
                fontFamily: F_UI,
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
      </div>
    </section>
  )
}

// =============================================================================
// Footer
// =============================================================================

function SiteFooter() {
  return (
    <footer
      style={{
        background: '#FFFFFF',
        borderTop: '1px solid rgba(23, 19, 31, 0.06)',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-12 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 items-start">
          <div>
            {/* Footer: 横長 wordmark (image = /public/cosmohype-wordmark.png) */}
            <Image
              src="/cosmohype-wordmark.png"
              alt="Cosmohype"
              width={2172}
              height={724}
              className="h-7 sm:h-8 w-auto"
              style={{ objectFit: 'contain' }}
            />
            <p
              className="mt-5 text-[13px] leading-[1.9] opacity-65 max-w-sm"
              style={{ fontFamily: F_BODY }}
            >
              ファッションの好みを8つのSTYLE IDに分類し、
              同じ感性の人とつながれるコーデ発見アプリ。
            </p>
          </div>

          <nav
            className="grid grid-cols-2 gap-8 text-[13px]"
            style={{ fontFamily: F_BODY }}
            aria-label="フッター"
          >
            <div>
              <p
                className="text-[10px] tracking-[0.28em] opacity-45 mb-3"
                style={{ fontWeight: 700 }}
              >
                プロダクト
              </p>
              <ul className="space-y-2.5">
                <li><Link href="/style-id" className="opacity-75 hover:opacity-100">STYLE ID診断</Link></li>
                {/* 「ログイン」は同ページのヘッダーと合わせて App Store 誘導へ統一。
                    URL は `getAppStoreUrl()` (lib/landing/app-store-url.ts) 経由。 */}
                <li><a href={APP_STORE_URL} className="opacity-75 hover:opacity-100">ログイン</a></li>
              </ul>
            </div>
            <div>
              <p
                className="text-[10px] tracking-[0.28em] opacity-45 mb-3"
                style={{ fontWeight: 700 }}
              >
                利用について
              </p>
              <ul className="space-y-2.5">
                <li><Link href="/privacy" className="opacity-75 hover:opacity-100">プライバシーポリシー</Link></li>
                <li><Link href="/terms" className="opacity-75 hover:opacity-100">利用規約</Link></li>
              </ul>
            </div>
          </nav>
        </div>

        <div
          className="mt-12 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] opacity-55"
          style={{
            borderTop: '1px solid rgba(23, 19, 31, 0.06)',
            fontFamily: F_BODY,
          }}
        >
          <p>© {new Date().getFullYear()} Cosmohype. All rights reserved.</p>
          <p>Cosmohype は iOS で提供中です。</p>
        </div>
      </div>
    </footer>
  )
}
