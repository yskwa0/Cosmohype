import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { Avatar } from '@/components/ui/Avatar'
import { PostCard } from '@/components/post/PostCard'
import { SearchInput } from '@/components/search/SearchInput'
import { SearchHistory } from '@/components/search/SearchHistory'
import { RecommendedUsers } from '@/components/search/RecommendedUsers'
import Link from 'next/link'
import type { Post, Profile } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const query = q?.trim() ?? ''

  if (query.length === 0) {
    const [blockData, followingData, candidatesRaw, myFollowersData] = await Promise.all([
      supabase
        .from('blocks')
        .select('blocker_id, blocked_id')
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
      supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id),
      supabase
        .from('profiles')
        .select('*')
        .eq('is_private', false)
        .neq('id', user.id)
        .order('followers_count', { ascending: false })
        .limit(50),
      supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id),
    ])

    const blockedIds = new Set(
      (blockData.data ?? []).map(b => b.blocker_id === user.id ? b.blocked_id : b.blocker_id)
    )
    const followingIds = new Set((followingData.data ?? []).map(f => f.following_id))
    const myFollowers = new Set((myFollowersData.data ?? []).map(f => f.follower_id))

    // フィルタリング：自分・フォロー済み・非公開・ブロック済みを除外
    const pool = ((candidatesRaw.data ?? []) as Profile[])
      .filter(u => !blockedIds.has(u.id) && !followingIds.has(u.id))
      .slice(0, 20)

    // 共通フォロワー数で採点
    const recommended: Profile[] = []
    if (pool.length > 0) {
      const { data: candidateFollows } = await supabase
        .from('follows')
        .select('follower_id, following_id')
        .in('following_id', pool.map(u => u.id))

      const followersByUser = new Map<string, Set<string>>()
      for (const f of candidateFollows ?? []) {
        if (!followersByUser.has(f.following_id)) followersByUser.set(f.following_id, new Set())
        followersByUser.get(f.following_id)!.add(f.follower_id)
      }

      const scored = pool.map(u => {
        const their = followersByUser.get(u.id) ?? new Set()
        let mutual = 0
        for (const id of myFollowers) { if (their.has(id)) mutual++ }
        return { user: u, mutual, rand: Math.random() }
      })
      scored.sort((a, b) => b.mutual !== a.mutual ? b.mutual - a.mutual : a.rand - b.rand)
      recommended.push(...scored.slice(0, 8).map(s => s.user))
    }

    return (
      <>
        <TopBar title="検索" />
        <div className="px-4 pt-4 pb-3 sticky top-14 z-40" style={{ background: 'var(--bg)' }}>
          <SearchInput defaultValue="" />
        </div>
        <div className="pb-4">
          <SearchHistory />
          <RecommendedUsers
            users={recommended}
            initialFollowingIds={[]}
            currentUserId={user.id}
          />
        </div>
      </>
    )
  }

  let users: Profile[] = []
  let posts: Post[] = []
  let likedPostIds = new Set<string>()
  let savedPostIds = new Set<string>()

  const [usersResult, postsByTag, postsByCaption, likedData, savedData] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .eq('is_private', false)
      .neq('id', user.id)
      .order('followers_count', { ascending: false })
      .limit(10),
    supabase
      .from('posts')
      .select('*, profiles!posts_user_id_fkey(*), post_images(*)')
      .contains('tags', [query])
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('posts')
      .select('*, profiles!posts_user_id_fkey(*), post_images(*)')
      .ilike('caption', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('likes').select('post_id').eq('user_id', user.id),
    supabase.from('saved_posts').select('post_id').eq('user_id', user.id),
  ])

  users = (usersResult.data ?? []) as Profile[]

  const postMap = new Map<string, Post>()
  for (const p of [...(postsByTag.data ?? []), ...(postsByCaption.data ?? [])]) {
    postMap.set(p.id, p as Post)
  }
  posts = Array.from(postMap.values()).filter(p => !(p.profiles as { is_private?: boolean } | null)?.is_private)
  likedPostIds = new Set((likedData.data ?? []).map(l => l.post_id))
  savedPostIds = new Set((savedData.data ?? []).map(s => s.post_id))

  return (
    <>
      <TopBar title="検索" />
      <div className="px-4 pt-4 pb-3 sticky top-14 z-40" style={{ background: 'var(--bg)' }}>
        <SearchInput defaultValue={query} />
      </div>

      {users.length === 0 && posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'var(--purple-dim)', border: '1px solid var(--border)' }}>
            <svg viewBox="0 0 24 24" className="w-10 h-10" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>「{query}」の結果なし</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>別のキーワードで試してください</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 pb-4">
          {users.length > 0 && (
            <section>
              <h2 className="px-4 pt-2 pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                ユーザー
              </h2>
              <div className="flex flex-col">
                {users.map(u => (
                  <Link
                    key={u.id}
                    href={`/profile/${u.username}`}
                    className="flex items-center gap-3 px-4 py-3 active:opacity-70 transition-opacity"
                  >
                    <Avatar src={u.avatar_url} username={u.username} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
                        {u.display_name ?? u.username}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        @{u.username} · フォロワー {u.followers_count}
                      </p>
                    </div>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {posts.length > 0 && (
            <section>
              <h2 className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                投稿
              </h2>
              <div className="flex flex-col gap-3">
                {posts.map(p => (
                  <PostCard
                    key={p.id}
                    post={p}
                    userId={user.id}
                    isLiked={likedPostIds.has(p.id)}
                    isSaved={savedPostIds.has(p.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  )
}
