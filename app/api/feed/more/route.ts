import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Post } from '@/types/database'

const LIMIT = 20

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tab, cursor } = await req.json()
  if (!cursor) return NextResponse.json({ error: 'cursor required' }, { status: 400 })

  const [{ data: blocksData }, { data: likedData }, { data: savedData }] = await Promise.all([
    supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id),
    supabase.from('likes').select('post_id').eq('user_id', user.id),
    supabase.from('saved_posts').select('post_id').eq('user_id', user.id),
  ])

  const blockedIds = (blocksData ?? []).map(b => b.blocked_id)
  const likedIds = (likedData ?? []).map(l => l.post_id)
  const savedIds = (savedData ?? []).map(s => s.post_id)

  if (tab === 'following') {
    const { data: followsData } = await supabase
      .from('follows').select('following_id').eq('follower_id', user.id)
    const followingIds = (followsData ?? [])
      .map(f => f.following_id)
      .filter(id => !blockedIds.includes(id))

    if (followingIds.length === 0) {
      return NextResponse.json({ posts: [], likedIds, savedIds, hasMore: false })
    }

    let q = supabase
      .from('posts')
      .select('*, profiles!posts_user_id_fkey(*), post_images(*)')
      .in('user_id', followingIds)
      .eq('is_archived', false)
      .eq('is_hidden', false)
    if (blockedIds.length > 0) q = q.not('user_id', 'in', `(${blockedIds.join(',')})`)
    const { data } = await q.lt('created_at', cursor).order('created_at', { ascending: false }).limit(LIMIT + 1)

    const all = (data ?? []) as Post[]
    const hasMore = all.length > LIMIT
    const posts = all
      .slice(0, LIMIT)
      .filter(p => !p.profiles?.is_private || p.user_id === user.id)

    return NextResponse.json({ posts, likedIds, savedIds, hasMore })
  }

  // recommended tab — 自分・フォロー中・ブロック済みを除外して「未知のユーザー」だけ表示
  const { data: followsData } = await supabase
    .from('follows').select('following_id').eq('follower_id', user.id)
  const followingIds = (followsData ?? []).map(f => f.following_id)

  const excludeIds = [user.id, ...blockedIds, ...followingIds]
  let q = supabase
    .from('posts')
    .select('*, profiles!posts_user_id_fkey(*), post_images(*)')
    .eq('is_archived', false)
    .eq('is_hidden', false)
  if (excludeIds.length > 0) q = q.not('user_id', 'in', `(${excludeIds.join(',')})`)
  const { data } = await q.lt('created_at', cursor).order('created_at', { ascending: false }).limit(LIMIT + 1)

  const all = (data ?? []) as Post[]
  const hasMore = all.length > LIMIT
  const posts = all
    .slice(0, LIMIT)
    .filter(p => !p.profiles?.is_private)

  return NextResponse.json({ posts, likedIds, savedIds, hasMore })
}
