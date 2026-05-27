'use client'
import dynamic from 'next/dynamic'

const SESSION_KEY = '_ch_splash'
const BG = 'linear-gradient(160deg, #090714 0%, #1A0533 35%, #2D0A5F 60%, #090714 100%)'

// dynamic チャンク読み込み中のカバー。
// 初回訪問: 紫背景を即時表示してコンテンツのチラ見えを防ぐ。
// 再訪問: null を返して何も表示しない。
function SplashFallback() {
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return null
  } catch {}
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
  return <SplashScreen />
}
