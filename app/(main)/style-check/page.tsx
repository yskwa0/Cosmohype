import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { StyleCheckForm } from '@/components/style-check/StyleCheckForm'

export const dynamic = 'force-dynamic'

export default async function StyleCheckPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const JST_OFFSET_MS = 9 * 60 * 60 * 1000
  const nowJst = new Date(Date.now() + JST_OFFSET_MS)
  const todayStart = new Date(
    Date.UTC(nowJst.getUTCFullYear(), nowJst.getUTCMonth(), nowJst.getUTCDate()) - JST_OFFSET_MS
  )

  const { data: todayDiag } = await supabase
    .from('style_diagnoses')
    .select('result')
    .eq('user_id', user.id)
    .gte('created_at', todayStart.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <>
      <TopBar title="AIスタイル診断" left={<BackButton href="/contents" variant="purple" />} />
      <StyleCheckForm todayResult={todayDiag?.result ?? null} />
    </>
  )
}
