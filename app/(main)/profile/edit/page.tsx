import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'
import type { Profile } from '@/types/database'

export default async function ProfileEditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profileRaw) redirect('/profile/setup')

  return (
    <>
      <TopBar title="プロフィールを編集" />
      <ProfileEditForm profile={profileRaw as Profile} />
    </>
  )
}
