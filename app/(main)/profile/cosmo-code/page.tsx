import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { CosmoCodeCard } from '@/components/profile/CosmoCodeCard'

export default async function CosmoCodePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/profile/setup')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cosmohype.app'
  const profileUrl = `${appUrl}/profile/${profile.username}`

  return (
    <>
      <TopBar title="COSMO CODE" left={<BackButton href="/profile/me" />} />
      <CosmoCodeCard
        username={profile.username}
        displayName={profile.display_name}
        avatarUrl={profile.avatar_url}
        profileUrl={profileUrl}
      />
    </>
  )
}
