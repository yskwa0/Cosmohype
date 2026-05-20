import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { PostCard } from '@/components/post/PostCard'
import { Avatar } from '@/components/ui/Avatar'
import { FeedTabs } from '@/components/layout/FeedTabs'
import type { Post, Profile } from '@/types/database'

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const isFollowing = tab === 'following'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profileData) redirect('/profile/setup')
  const profile = profileData as Profile

  let posts: Post[] = []
  let likedPostIds = new Set<string>()
  let savedPostIds = new Set<string>()

  const { data: blocksData } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', user.id)
  const blockedIds = (blocksData ?? []).map(b => b.blocked_id)

  if (isFollowing) {
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds = (follows ?? []).map(f => f.following_id)

    const validFollowingIds = followingIds.filter(id => !blockedIds.includes(id))
    if (validFollowingIds.length > 0) {
      let q = supabase.from('posts').select(`*, profiles(*), post_images(*)`).in('user_id', validFollowingIds)
      if (blockedIds.length > 0) q = q.not('user_id', 'in', `(${blockedIds.join(',')})`)
      const [{ data: postsData }, { data: likedData }, { data: savedData }] = await Promise.all([
        q.order('created_at', { ascending: false }).limit(30),
        supabase.from('likes').select('post_id').eq('user_id', user.id),
        supabase.from('saved_posts').select('post_id').eq('user_id', user.id),
      ])
      posts = (postsData ?? []) as Post[]
      likedPostIds = new Set((likedData ?? []).map(l => l.post_id))
      savedPostIds = new Set((savedData ?? []).map(s => s.post_id))
    }
  } else {
    let q = supabase.from('posts').select(`*, profiles(*), post_images(*)`)
    if (blockedIds.length > 0) q = q.not('user_id', 'in', `(${blockedIds.join(',')})`)
    const [{ data: postsData }, { data: likedData }, { data: savedData }] = await Promise.all([
      q.order('created_at', { ascending: false }).limit(30),
      supabase.from('likes').select('post_id').eq('user_id', user.id),
      supabase.from('saved_posts').select('post_id').eq('user_id', user.id),
    ])
    posts = (postsData ?? []) as Post[]
    likedPostIds = new Set((likedData ?? []).map(l => l.post_id))
    savedPostIds = new Set((savedData ?? []).map(s => s.post_id))
  }

  return (
    <>
      <TopBar
        showLogo
        right={<Avatar src={profile.avatar_url} username={profile.username} size="sm" />}
      />
      <Suspense>
        <FeedTabs />
      </Suspense>
      <div className="flex flex-col gap-3 py-4">
        {posts.length === 0 ? (
          isFollowing ? <EmptyFollowingFeed /> : <EmptyFeed />
        ) : (
          posts.map(post => (
            <PostCard key={post.id} post={post} userId={user.id} isLiked={likedPostIds.has(post.id)} isSaved={savedPostIds.has(post.id)} />
          ))
        )}
      </div>
    </>
  )
}

function EmptyFollowingFeed() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'var(--purple-dim)', border: '1px solid var(--border)' }}>
        <svg viewBox="0 0 24 24" className="w-10 h-10" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      </div>
      <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>フォロー中のユーザーがいません</h2>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>気になるユーザーをフォローしてみましょう</p>
    </div>
  )
}

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'var(--purple-dim)', border: '1px solid var(--border)' }}>
        <svg viewBox="0 0 24 24" className="w-10 h-10" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
        </svg>
      </div>
      <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>まだ投稿がありません</h2>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>最初のコーデを投稿してみましょう</p>
    </div>
  )
}
