import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PostDetail } from '@/components/post/PostDetail'
import { PostDetailSlide } from '@/components/post/PostDetailSlide'
import { CommentSection } from '@/components/post/CommentSection'
import type { Post, Comment } from '@/types/database'

async function ArchivePostContent({ id }: { id: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: post }, { data: commentsRaw }] = await Promise.all([
    supabase
      .from('posts')
      .select(`*, profiles!posts_user_id_fkey(*), post_images(*)`)
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_archived', true)
      .maybeSingle(),
    supabase
      .from('comments')
      .select(`*, profiles(*)`)
      .eq('post_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
        <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>投稿が見つかりません</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>この投稿は削除されたか、アクセスできません</p>
      </div>
    )
  }

  const [isLiked, isSaved, { data: postItems }] = await Promise.all([
    supabase.from('likes').select('id').eq('user_id', user.id).eq('post_id', id).maybeSingle().then(({ data }) => !!data),
    supabase.from('saved_posts').select('id').eq('user_id', user.id).eq('post_id', id).maybeSingle().then(({ data }) => !!data),
    supabase.from('post_items').select('*').eq('post_id', id).order('display_order', { ascending: true }),
  ])

  return (
    <>
      <PostDetail
        post={{ ...post, post_items: postItems ?? [] } as Post}
        userId={user.id}
        isLiked={isLiked}
        isSaved={isSaved}
      />
      <CommentSection
        postId={id}
        userId={user.id}
        initialComments={(commentsRaw ?? []) as Comment[]}
      />
    </>
  )
}

export default async function ArchivePostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <PostDetailSlide>
      <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
        <ArchivePostContent id={id} />
      </Suspense>
    </PostDetailSlide>
  )
}
