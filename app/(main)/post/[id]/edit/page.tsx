import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { PostEditForm } from '@/components/post/PostEditForm'
import type { PostItem } from '@/types/database'

export default async function PostEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: post }, { data: postItems }] = await Promise.all([
    supabase
      .from('posts')
      .select('id, user_id, caption, tags, brand_tags, hype_theme')
      .eq('id', id)
      .single(),
    supabase
      .from('post_items')
      .select('*')
      .eq('post_id', id)
      .order('display_order', { ascending: true }),
  ])

  if (!post) notFound()
  if (post.user_id !== user.id) notFound()

  return (
    <>
      <TopBar title="スタイルを編集" left={<BackButton />} />
      <div className="pt-4">
        <PostEditForm
          postId={id}
          initialCaption={post.caption ?? ''}
          initialTags={post.tags ?? []}
          initialBrandTags={post.brand_tags ?? []}
          initialHypeTheme={post.hype_theme ?? undefined}
          initialItems={(postItems ?? []) as PostItem[]}
        />
      </div>
    </>
  )
}
