import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { ArchiveGrid } from '@/components/post/ArchiveGrid'
import type { Post } from '@/types/database'

export default async function ArchivePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  if (!profileData) redirect('/profile/setup')

  const { data: posts } = await supabase
    .from('posts')
    .select(`*, post_images(*)`)
    .eq('user_id', user.id)
    .eq('is_archived', true)
    .order('created_at', { ascending: false })

  return (
    <>
      <TopBar
        title="アーカイブ"
        left={<BackButton href={`/profile/${profileData.username}`} variant="purple" />}
      />
      <div style={{ borderTop: '1px solid var(--border)' }}>
        {(posts?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'var(--purple-dim)', border: '1px solid var(--border)' }}>
              <svg viewBox="0 0 24 24" className="w-10 h-10" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>アーカイブした投稿はありません</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>投稿の「…」メニューからアーカイブできます</p>
          </div>
        ) : (
          <ArchiveGrid posts={posts as Post[]} />
        )}
      </div>
    </>
  )
}
