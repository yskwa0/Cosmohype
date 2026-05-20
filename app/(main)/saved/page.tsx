import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { PostCard } from '@/components/post/PostCard'
import type { Post } from '@/types/database'

export default async function SavedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: savedData }, { data: likedData }] = await Promise.all([
    supabase
      .from('saved_posts')
      .select('post_id, posts(*, profiles(*), post_images(*))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('likes').select('post_id').eq('user_id', user.id),
  ])

  const posts = (savedData ?? []).map(s => s.posts).filter(Boolean) as Post[]
  const likedPostIds = new Set((likedData ?? []).map(l => l.post_id))
  const savedPostIds = new Set(posts.map(p => p.id))

  return (
    <>
      <TopBar title="保存済み" />
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'var(--purple-dim)', border: '1px solid var(--border)' }}>
            <svg viewBox="0 0 24 24" className="w-10 h-10" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>保存済みの投稿はありません</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>気になる投稿を保存してみましょう</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 py-4">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              userId={user.id}
              isLiked={likedPostIds.has(post.id)}
              isSaved={savedPostIds.has(post.id)}
            />
          ))}
        </div>
      )}
    </>
  )
}
