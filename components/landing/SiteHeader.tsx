'use client'

// =============================================================================
// SiteHeader (Client Component)
//
// - 背景を完全不透明の #FFFFFF に統一 (backdrop-blur / rgba を撤去)
//   → スクロールしても下のコンテンツが透けず、ヘッダーとページ本体の背景差ゼロ。
// - border-bottom も削除 (背景差の帯が見えないよう完全一体化)。
// - スクロール方向を検出して自動 hide/show:
//     ・ページ上部 (scrollY ≤ 40) では常に表示
//     ・下方向スクロールで translateY(-100%) に上へ収納
//     ・上方向スクロールで translateY(0) に再表示
//     ・レイアウトシフト無し (sticky top-0 のまま translateY のみ)
//     ・transition は 260ms、prefers-reduced-motion:reduce では即時
// =============================================================================

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type Props = {
  fontUI: string
  // ヘッダーの「ログイン」リンクの遷移先。
  // 呼び出し側 (app/page.tsx) が `getAppStoreUrl()` (lib/landing/app-store-url.ts)
  // 経由の非空 App Store URL を渡す (env 未設定時はフォールバック URL)。
  appStoreUrl: string
}

export function SiteHeader({ fontUI, appStoreUrl }: Props) {
  // 「ログイン」ボタンは常に App Store へ外部遷移する (同タブ)。
  // 表示文言・見た目は変えず href のみ差し替え、/login route は残置。
  const loginHref = appStoreUrl
  const [hidden, setHidden] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const lastY = useRef(0)
  const rafId = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const setRm = () => setReducedMotion(m.matches)
    setRm()
    m.addEventListener?.('change', setRm)

    lastY.current = window.scrollY

    const onScroll = () => {
      cancelAnimationFrame(rafId.current)
      rafId.current = requestAnimationFrame(() => {
        const y = window.scrollY
        const delta = y - lastY.current
        // ページ最上部 (40px 以内) では常に表示
        if (y <= 40) {
          setHidden(false)
        } else if (delta > 3) {
          // 下方向: 収納
          setHidden(true)
        } else if (delta < -3) {
          // 上方向: 表示
          setHidden(false)
        }
        lastY.current = y
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(rafId.current)
      window.removeEventListener('scroll', onScroll)
      m.removeEventListener?.('change', setRm)
    }
  }, [])

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: '#FFFFFF',
        transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
        transition: reducedMotion ? 'none' : 'transform 260ms cubic-bezier(0.22, 0.61, 0.36, 1)',
        willChange: 'transform',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-10 h-16 sm:h-[72px] flex items-center justify-between gap-4">
        {/* Header: 文字ロゴのみ (image = /public/cosmohype-wordmark.png) */}
        <Link href="/" className="flex items-center shrink-0" aria-label="Cosmohype ホーム">
          <Image
            src="/cosmohype-wordmark.png"
            alt="Cosmohype"
            width={2172}
            height={724}
            priority
            className="h-10 sm:h-12 w-auto block"
            style={{ objectFit: 'contain', background: 'transparent' }}
          />
        </Link>

        {/* PC ナビ */}
        <nav
          className="hidden md:flex items-center gap-7 text-[13px]"
          style={{ fontFamily: fontUI, fontWeight: 500 }}
          aria-label="メイン"
        >
          <Link href="/style-id" className="opacity-75 hover:opacity-100 transition-opacity">
            STYLE ID
          </Link>
          <a
            href={loginHref}
            className="opacity-75 hover:opacity-100 transition-opacity"
          >
            ログイン
          </a>
          <Link
            href="/style-id"
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-white text-[13px]"
            style={{
              background: 'linear-gradient(135deg, #FF6A2A 0%, #F04E00 100%)',
              fontFamily: fontUI,
              fontWeight: 700,
              transition: 'transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            STYLE IDを診断する
          </Link>
        </nav>

        {/* モバイルナビ */}
        <nav
          className="flex md:hidden items-center gap-2 text-[12px]"
          style={{ fontFamily: fontUI, fontWeight: 500 }}
          aria-label="モバイルメイン"
        >
          <a href={loginHref} className="opacity-75 whitespace-nowrap">ログイン</a>
          <Link
            href="/style-id"
            className="inline-flex items-center rounded-full px-3 py-1.5 text-white text-[12px] whitespace-nowrap"
            style={{
              background: 'linear-gradient(135deg, #FF6A2A 0%, #F04E00 100%)',
              fontFamily: fontUI,
              fontWeight: 700,
            }}
          >
            診断する
          </Link>
        </nav>
      </div>
    </header>
  )
}
