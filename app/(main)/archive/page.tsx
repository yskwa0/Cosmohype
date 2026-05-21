import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
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
        left={<BackButton href={`/profile/${profileData.username}`} />}
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
          <div className="grid grid-cols-3 gap-[1px]" style={{ background: 'var(--bg)' }}>
            {(posts as Post[]).map(post => {
              const thumb = post.post_images?.[0]?.url
              return (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className="relative block"
                  style={{ aspectRatio: '4/5', background: thumb ? 'var(--bg-elevated)' : 'var(--bg)' }}
                >
                  {thumb && (
                    <Image
                      src={thumb}
                      alt={post.caption ?? 'コーデ'}
                      fill
                      className="object-cover"
                      sizes="33vw"
                    />
                  )}
                  {(post.post_images?.length ?? 0) > 1 && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-black/40 rounded-sm flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-white" fill="currentColor">
                        <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
                      </svg>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
