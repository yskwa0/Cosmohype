import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { PostForm } from '@/components/post/PostForm'

export default async function NewPostPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/profile/setup')

  return (
    <>
      <TopBar title="新しいコーデを投稿" />
      <div className="pt-4">
        <PostForm userId={user.id} />
      </div>
    </>
  )
}
