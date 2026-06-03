import { redirect } from 'next/navigation'
import { BottomNav } from '@/components/layout/BottomNav'
import { StarField } from '@/components/ui/StarField'
import { EdgeSwipeBack } from '@/components/ui/EdgeSwipeBack'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let theme = 'cosmic-black'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('theme')
      .eq('id', user.id)
      .single()
    if (!profile) redirect('/profile/setup')
    if (profile.theme) theme = profile.theme
  }

  const themeClass = theme !== 'cosmic-black' ? `theme-${theme}` : ''

  return (
    <div className={`min-h-screen ${themeClass}`} style={{ background: 'var(--bg)' }}>
      <EdgeSwipeBack />
      {theme === 'cosmic-black' && <StarField />}
      <main className="relative z-10 max-w-md mx-auto pb-20">
        {children}
      </main>
      <BottomNav isLoggedIn={!!user} />
    </div>
  )
}
