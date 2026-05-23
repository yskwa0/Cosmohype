import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { PostCard } from '@/components/post/PostCard'
import { FeedSlider } from '@/components/layout/FeedSlider'
import { DmPanel, type DmConversation } from '@/components/dm/DmPanel'
import { DmIconButton } from '@/components/dm/DmIconButton'
import type { Post, Profile } from '@/types/database'

const VALID_TABS = ['recommended', 'following'] as const
type FeedTab = typeof VALID_TABS[number]

function scorePost(post: Post, userStyleId: string | null, followingIds: Set<string>): number {
  let score = 0
  if (userStyleId && post.profiles?.style_id === userStyleId) score += 40
  if (post.tags?.some(t => t.toLowerCase() === 'hype')) score += 30
  score += (post.likes_count ?? 0) * 2
  score += (post.saves_count ?? 0) * 5
  score += (post.comments_count ?? 0) * 3
  if (Date.now() - new Date(post.created_at).getTime() < 24 * 60 * 60 * 1000) score += 15
  if (followingIds.has(post.user_id)) score += 30
  return score
}

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: rawTab } = await searchParams
  const tab: FeedTab = VALID_TABS.includes(rawTab as FeedTab) ? (rawTab as FeedTab) : 'recommended'

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

  const { data: blocksData } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', user.id)
  const blockedIds = (blocksData ?? []).map(b => b.blocked_id)

  // Phase 1: parallel — social graph, unread counts, DM conversation IDs
  const [{ data: likedData }, { data: savedData }, { data: followsData }, { data: unreadData }, { data: convParticipations }] = await Promise.all([
    supabase.from('likes').select('post_id').eq('user_id', user.id),
    supabase.from('saved_posts').select('post_id').eq('user_id', user.id),
    supabase.from('follows').select('following_id').eq('follower_id', user.id),
    supabase.rpc('get_unread_counts'),
    supabase.from('conversation_participants').select('conversation_id').eq('user_id', user.id),
  ])

  const hasUnread = (unreadData ?? []).some(row => Number(row.unread_count) > 0)
  const likedPostIds = new Set((likedData ?? []).map(l => l.post_id))
  const savedPostIds = new Set((savedData ?? []).map(s => s.post_id))
  const followingIds = new Set((followsData ?? []).map(f => f.following_id))
  const validFollowingIds = [...followingIds].filter(id => !blockedIds.includes(id))
  const conversationIds = (convParticipations ?? []).map(p => p.conversation_id)

  // Phase 2: parallel — feed posts and DM details
  const buildRecQ = () => {
    let q = supabase.from('posts').select(`*, profiles(*), post_images(*)`).eq('is_archived', false)
    if (blockedIds.length > 0) q = q.not('user_id', 'in', `(${blockedIds.join(',')})`)
    return q.order('created_at', { ascending: false }).limit(100)
  }
  const buildFollowQ = () => {
    let q = supabase.from('posts').select(`*, profiles(*), post_images(*)`).in('user_id', validFollowingIds).eq('is_archived', false)
    if (blockedIds.length > 0) q = q.not('user_id', 'in', `(${blockedIds.join(',')})`)
    return q.order('created_at', { ascending: false }).limit(50)
  }

  const [recResult, followResult, othersResult, messagesResult, conversationsResult] = await Promise.all([
    buildRecQ(),
    validFollowingIds.length > 0 ? buildFollowQ() : Promise.resolve({ data: null }),
    conversationIds.length > 0
      ? supabase.from('conversation_participants').select('conversation_id, profiles(username, display_name, avatar_url)').in('conversation_id', conversationIds).neq('user_id', user.id)
      : Promise.resolve({ data: null }),
    conversationIds.length > 0
      ? supabase.from('messages').select('conversation_id, body, created_at').in('conversation_id', conversationIds).order('created_at', { ascending: false }).limit(Math.max(conversationIds.length * 5, 20))
      : Promise.resolve({ data: null }),
    conversationIds.length > 0
      ? supabase.from('conversations').select('id, updated_at').in('id', conversationIds)
      : Promise.resolve({ data: null }),
  ])

  // Build feed posts
  const recommendedPosts = ((recResult.data ?? []) as Post[])
    .filter(p => !p.profiles?.is_private || p.user_id === user.id || followingIds.has(p.user_id))
    .sort((a, b) => scorePost(b, profile.style_id, followingIds) - scorePost(a, profile.style_id, followingIds))

  const followingPosts = ((followResult.data ?? []) as Post[])
    .filter(p => !p.profiles?.is_private || p.user_id === user.id || followingIds.has(p.user_id))

  // Build DM conversation list
  type OtherRow = { conversation_id: string; profiles: DmConversation['otherUser'] }
  type MsgRow = { conversation_id: string; body: string; created_at: string }

  const othersByConv: Record<string, DmConversation['otherUser']> = {}
  for (const row of (othersResult.data ?? []) as OtherRow[]) {
    if (row.profiles) othersByConv[row.conversation_id] = row.profiles
  }
  const latestByConv: Record<string, { body: string; created_at: string }> = {}
  for (const msg of (messagesResult.data ?? []) as MsgRow[]) {
    if (!latestByConv[msg.conversation_id]) latestByConv[msg.conversation_id] = msg
  }
  const updatedAtByConv: Record<string, string> = {}
  for (const conv of (conversationsResult.data ?? []) as { id: string; updated_at: string }[]) {
    updatedAtByConv[conv.id] = conv.updated_at
  }
  const unreadByConv: Record<string, number> = {}
  for (const row of unreadData ?? []) {
    unreadByConv[row.conversation_id] = Number(row.unread_count)
  }

  const dmConversations: DmConversation[] = conversationIds
    .map(id => ({
      id,
      otherUser: othersByConv[id] ?? null,
      latestMessage: latestByConv[id] ?? null,
      unread: unreadByConv[id] ?? 0,
      sortKey: latestByConv[id]?.created_at ?? updatedAtByConv[id] ?? '',
    }))
    .filter(c => c.otherUser !== null)
    .sort((a: DmConversation & { sortKey: string }, b: DmConversation & { sortKey: string }) => b.sortKey.localeCompare(a.sortKey))

  return (
    <>
      <TopBar
        showLogo
        right={<DmIconButton hasUnread={hasUnread} />}
      />
      <FeedSlider
        initialTab={tab}
        recommended={
          <div className="flex flex-col gap-3 py-4 feed-animate-in">
            {recommendedPosts.length === 0 ? (
              <EmptyFeed />
            ) : (
              recommendedPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  userId={user.id}
                  isLiked={likedPostIds.has(post.id)}
                  isSaved={savedPostIds.has(post.id)}
                />
              ))
            )}
          </div>
        }
        following={
          <div className="flex flex-col gap-3 py-4 feed-animate-in">
            {followingPosts.length === 0 ? (
              <EmptyFollowingFeed />
            ) : (
              followingPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  userId={user.id}
                  isLiked={likedPostIds.has(post.id)}
                  isSaved={savedPostIds.has(post.id)}
                />
              ))
            )}
          </div>
        }
        dm={<DmPanel conversations={dmConversations} />}
      />
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
