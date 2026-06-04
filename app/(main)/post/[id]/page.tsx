import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PostDetail } from '@/components/post/PostDetail'
import { CommentSection } from '@/components/post/CommentSection'
import { PostDetailSlide } from '@/components/post/PostDetailSlide'
import type { Post } from '@/types/database'

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Single parallel round — comments excluded (loaded client-side after post appears)
  const [{ data: post }, { data: { user } }, { data: postItems }] = await Promise.all([
    supabase.from('posts').select(`*, profiles!posts_user_id_fkey(*), post_images(*)`).eq('id', id).single(),
    supabase.auth.getUser(),
    supabase.from('post_items').select('*').eq('post_id', id).order('display_order', { ascending: true }),
  ])

  if (!post) notFound()

  const [isLiked, isSaved] = user
    ? await Promise.all([
        supabase.from('likes').select('id').eq('user_id', user.id).eq('post_id', id).maybeSingle().then(({ data }) => !!data),
        supabase.from('saved_posts').select('id').eq('user_id', user.id).eq('post_id', id).maybeSingle().then(({ data }) => !!data),
      ])
    : [false, false]

  return (
    <PostDetailSlide>
      <PostDetail post={{ ...post, post_items: postItems ?? [] } as Post} userId={user?.id} isLiked={isLiked} isSaved={isSaved} />
      <CommentSection postId={id} userId={user?.id ?? null} />
    </PostDetailSlide>
  )
}
