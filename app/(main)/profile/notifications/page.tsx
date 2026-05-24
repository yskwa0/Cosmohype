import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { NotificationSettingsForm } from '@/components/profile/NotificationSettingsForm'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <>
      <TopBar
        title="通知設定"
        left={<BackButton variant="purple" />}
      />
      <NotificationSettingsForm userId={user.id} initial={data} />
    </>
  )
}
