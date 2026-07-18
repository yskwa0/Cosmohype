'use client'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'

const BG = 'linear-gradient(160deg, #090714 0%, #1A0533 35%, #2D0A5F 60%, #090714 100%)'

// dynamic チャンク読み込み中のカバー。
// 常に紫背景を表示してコンテンツのチラ見えを防ぐ。
// 再訪問時のsessionStorage判定はSplashScreen本体が行う（hydration mismatch回避のため）。
function SplashFallback() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        minHeight: '100dvh',
        background: BG,
        zIndex: 99999,
        pointerEvents: 'none',
      }}
    />
  )
}

const SplashScreen = dynamic(
  () => import('./SplashScreen').then(mod => ({ default: mod.SplashScreen })),
  { ssr: false, loading: SplashFallback }
)

export function SplashScreenMount() {
  // 招待 Landing (/invite/*) は独自の白×オレンジブランド Landing を持つ。
  // 全 route 共通の紫 SplashFallback をここで抑止する
  // (他 route はこれまで通り SplashScreen を通常マウント)。
  const pathname = usePathname()
  // トップページ (公式ホームページ) は SplashScreen を挟まず即表示。
  // 未認証訪問者が最初に見るページであり、瞬時表示を優先する。
  if (pathname === '/') return null
  if (pathname?.startsWith('/invite/')) return null
  // style-guess (友達の STYLE ID 予想 受取ページ) は Universal Link / Custom URL
  // Scheme で共有された結果画面。タップ→即時表示が UX 上重要なので splash を挟まない。
  if (pathname?.startsWith('/style-guess/')) return null
  return <SplashScreen />
}
