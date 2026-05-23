import type { Metadata, Viewport } from 'next'
import './globals.css'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Cosmohype — ファッションSNS',
  description: 'コーデをシェアして、ファッションでつながろう',
  manifest: '/manifest.json',
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
    <html lang="ja" className={`h-full ${themeClass}`}>
      <body className="min-h-full antialiased">
        {children}
      </body>
    </html>
  )
}
