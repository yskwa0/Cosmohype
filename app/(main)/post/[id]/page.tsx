import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { PostCard } from '@/components/post/PostCard'
import { CommentSection } from '@/components/post/CommentSection'
import type { Post, Comment } from '@/types/database'

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: post }, { data: { user } }, { data: commentsRaw }] = await Promise.all([
    supabase.from('posts').select(`*, profiles(*), post_images(*)`).eq('id', id).single(),
    supabase.auth.getUser(),
    supabase.from('comments').select(`*, profiles(*)`).eq('post_id', id).order('created_at', { ascending: true }),
  ])

  if (!post) notFound()

  const isLiked = user
    ? await supabase.from('likes').select('id').eq('user_id', user.id).eq('post_id', id).maybeSingle().then(({ data }) => !!data)
    : false

  return (
    <>
      <TopBar title="投稿" left={<BackButton />} />
      <PostCard post={post as Post} userId={user?.id} isLiked={isLiked} />
      <CommentSection
        postId={id}
        userId={user?.id ?? null}
        initialComments={(commentsRaw ?? []) as Comment[]}
      />
    </>
  )
}
