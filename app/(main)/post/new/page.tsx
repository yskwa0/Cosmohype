import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { PostForm } from '@/components/post/PostForm'
import { StyleAlien } from '@/components/style-id/StyleAlien'
import { BackButton } from '@/components/ui/BackButton'
import type { StyleId } from '@/lib/style-id/types'
import { HYPE_THEME_MAP } from '@/lib/hypeThemes'
import { PageTracker } from '@/components/analytics/PageTracker'

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ hype?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, style_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/profile/setup')

  const { hype } = await searchParams
  const hypeLabel = hype ? HYPE_THEME_MAP[hype] : undefined

  const title = (
    <>
      今日のスタイルを残す
      {profile.style_id && (
        <StyleAlien styleId={profile.style_id as StyleId} size={22} />
      )}
    </>
  )

  return (
    <>
      <PageTracker event="post_create_open" />
      <TopBar title={title} left={<BackButton />} />
      <div className="pt-4">
        {hypeLabel && (
          <div className="mx-4 mb-4 rounded-xl bg-gradient-to-r from-violet-600/20 to-pink-500/20 border border-violet-500/30 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold tracking-widest uppercase text-pink-400">今日のHYPE</span>
              <span className="text-[10px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full border border-pink-500/30">参加中</span>
            </div>
            <p className="text-sm font-semibold text-white/90">{hypeLabel}</p>
          </div>
        )}
        <PostForm userId={user.id} hypeTheme={hypeLabel ? hype : undefined} />
      </div>
    </>
  )
}
