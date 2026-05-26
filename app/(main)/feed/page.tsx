import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { FeedPosts } from '@/components/post/FeedPosts'
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
    let q = supabase.from('posts').select(`*, profiles!posts_user_id_fkey(*), post_images(*)`).eq('is_archived', false).eq('is_hidden', false)
    if (blockedIds.length > 0) q = q.not('user_id', 'in', `(${blockedIds.join(',')})`)
    return q.order('created_at', { ascending: false }).limit(20)
  }
  const buildFollowQ = () => {
    let q = supabase.from('posts').select(`*, profiles!posts_user_id_fkey(*), post_images(*)`).in('user_id', validFollowingIds).eq('is_archived', false).eq('is_hidden', false)
    if (blockedIds.length > 0) q = q.not('user_id', 'in', `(${blockedIds.join(',')})`)
    return q.order('created_at', { ascending: false }).limit(20)
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
          <FeedPosts
            initialPosts={recommendedPosts}
            initialLikedIds={[...likedPostIds]}
            initialSavedIds={[...savedPostIds]}
            userId={user.id}
            tab="recommended"
          />
        }
        following={
          <FeedPosts
            initialPosts={followingPosts}
            initialLikedIds={[...likedPostIds]}
            initialSavedIds={[...savedPostIds]}
            userId={user.id}
            tab="following"
          />
        }
        dm={<DmPanel conversations={dmConversations} />}
      />
    </>
  )
}

