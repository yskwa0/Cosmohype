'use client'
import dynamic from 'next/dynamic'

const SplashScreen = dynamic(
  () => import('./SplashScreen').then(mod => ({ default: mod.SplashScreen })),
  { ssr: false }
)

export function SplashScreenMount() {
  return <SplashScreen />
}
