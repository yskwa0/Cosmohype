import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileSetupForm } from '@/components/profile/ProfileSetupForm'

export default async function ProfileSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (profile) redirect('/feed')

  return <ProfileSetupForm userId={user.id} />
}
