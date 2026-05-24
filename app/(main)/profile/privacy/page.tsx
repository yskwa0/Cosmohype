import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { PrivacyForm } from '@/components/profile/PrivacyForm'

export default async function PrivacyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_private')
    .eq('id', user.id)
    .single()

  return (
    <>
      <TopBar
        title="アカウントのプライバシー"
        left={<BackButton variant="purple" />}
      />
      <PrivacyForm userId={user.id} initialIsPrivate={profile?.is_private ?? false} />
    </>
  )
}
