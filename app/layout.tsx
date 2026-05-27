import type { Metadata, Viewport } from 'next'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import nextDynamic from 'next/dynamic'

// ssr: false でサーバーレンダリングをスキップ。
// これにより useState 初期値で sessionStorage を直接参照でき、
// 再訪問時に一度もスプラッシュをレンダリングしない。
const SplashScreen = nextDynamic(
  () => import('@/components/ui/SplashScreen').then(mod => ({ default: mod.SplashScreen })),
  { ssr: false }
)

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Cosmohype — ファッションSNS',
  description: 'コーデをシェアして、ファッションでつながろう',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.jpg',
    apple: '/apple-icon.jpg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Cosmohype',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#090714',
  viewportFit: 'cover',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let theme = 'cosmic-black'
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('theme')
        .eq('id', user.id)
        .single()
      if (profile?.theme) theme = profile.theme
    }
  } catch { /* 未認証ページでは無視 */ }

  const themeClass = theme !== 'cosmic-black' ? `theme-${theme}` : ''

  return (
    <html lang="ja" className={`h-full ${themeClass}`} style={{ background: '#090714' }}>
      <body className="min-h-full antialiased" style={{ background: '#090714' }}>
        <SplashScreen />
        {children}
      </body>
    </html>
  )
}
