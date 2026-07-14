'use client'

// =============================================================================
// OpenInAppButton.tsx
//
// style-guess ページの「アプリで開く」CTA。
//
// 【なぜ Client Component か】
//   従来は href に Universal Link と同じ HTTPS URL を貼っていたが、
//   Safari で既に同 URL を開いている状態で同 URL リンクをタップしても
//   iOS は「そのまま Safari に留める」挙動を取る (Apple UX 仕様)。
//   → アプリが起動しない。
//
//   本コンポーネントは代わりに Custom URL Scheme
//     cosmohype://style-guess/{token}
//   を叩いてアプリを起動する。iOS 側は既存の cosmohype:// scheme を
//   Info.plist で受理済で、AuthStore.handleDeepLink 内の style-guess 分岐が
//   token を StyleIdGuessCoordinator へ渡す。
//
// 【未インストール時のフォールバック】
//   Custom URL Scheme を叩くと Safari が「開けません」ダイアログを出す。
//   その後 1.8s 経過して依然としてページが visible なら App Store or /style-id
//   へ遷移させる。アプリが実際に起動した場合は Safari が背面に回り
//   document.visibilityState が 'hidden' になるため、フォールバックは発火しない。
//
// 【二重タップ・cleanup】
//   ・in-flight フラグと fallback timer id を state で保持
//   ・visibilitychange / pagehide でタイマー解除
//   ・コンポーネント unmount 時にも解除
//   ・すでに inflight のときは追加タップを no-op
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  token: string
  fallbackUrl: string   // App Store URL があればそれ、なければ /style-id 等
}

// 1.8s フォールバック閾値。iOS のアプリ起動には通常 200〜800ms 程度なので余裕を持たせる。
const FALLBACK_MS = 1800

export function OpenInAppButton({ token, fallbackUrl }: Props) {
  const [inflight, setInflight] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // タイマー / listener の完全解除ヘルパ (unmount / visibility change / pagehide 共通)
  const cleanup = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    // visibility change / pagehide で timer 解除。
    // アプリが起動して Safari が背面に回る → 'hidden' → フォールバック不要。
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        cleanup()
      }
    }
    const onPageHide = () => cleanup()

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
      // unmount 時にも timer 解除
      cleanup()
    }
  }, [cleanup])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // <a href="cosmohype://..."> のデフォルト遷移を利用したいので preventDefault はしない。
      // ただし二重タップ抑制のために inflight ガード。
      if (inflight) {
        e.preventDefault()
        return
      }
      setInflight(true)

      // 既存 timer があれば潰す (defensive)
      cleanup()

      // fallback: 1.8s 後に依然として visible ならアプリが開かなかったと判断して遷移
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        // ページがまだ表示されている = アプリ起動失敗 (未インストール等)
        if (document.visibilityState === 'visible') {
          window.location.href = fallbackUrl
        } else {
          // 背面に回っている = アプリ起動成功、何もしない
          setInflight(false)
        }
      }, FALLBACK_MS)
    },
    [inflight, cleanup, fallbackUrl]
  )

  const customSchemeUrl = `cosmohype://style-guess/${token}`

  return (
    <a
      href={customSchemeUrl}
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        borderRadius: 14,
        backgroundColor: '#FF6A2A',
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: 700,
        textDecoration: 'none',
        boxShadow: '0 8px 24px rgba(255,106,42,0.28)',
        // 二重タップ中は視覚的に押下抑制
        opacity: inflight ? 0.75 : 1,
        pointerEvents: inflight ? 'none' : 'auto',
      }}
      aria-disabled={inflight ? 'true' : 'false'}
    >
      アプリで開く
    </a>
  )
}
