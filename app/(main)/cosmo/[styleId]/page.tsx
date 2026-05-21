import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { BackButton } from '@/components/ui/BackButton'
import { TopBar } from '@/components/layout/TopBar'
import { StyleAlien } from '@/components/style-id/StyleAlien'
import { Avatar } from '@/components/ui/Avatar'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import { createClient } from '@/lib/supabase/server'
import type { StyleId } from '@/lib/style-id/types'

type GridPost = {
  id: string
  caption: string | null
  imageUrl: string
  profile: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
}

export default async function CosmoStylePage({
  params,
}: {
  params: Promise<{ styleId: string }>
}) {
  const { styleId } = await params
  const style = STYLE_TYPES[styleId as StyleId]
  if (!style) notFound()

  const supabase = await createClient()

  // このスタイルの公開ユーザーIDを取得
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id')
    .eq('style_id', styleId)
    .eq('is_private', false)

  const profileIds = (profileData ?? []).map(p => p.id)

  // 投稿を取得（画像あり・最新順）
  let gridPosts: GridPost[] = []
  if (profileIds.length > 0) {
    const { data: rawPosts } = await supabase
      .from('posts')
      .select('id, caption, user_id, profiles(id, username, display_name, avatar_url), post_images(url, display_order)')
      .in('user_id', profileIds)
      .order('created_at', { ascending: false })
      .limit(30)

    gridPosts = (rawPosts ?? [])
      .map(p => {
        const images = (p.post_images ?? []) as { url: string; display_order: number }[]
        images.sort((a, b) => a.display_order - b.display_order)
        const imageUrl = images[0]?.url
        const profile = p.profiles as { id: string; username: string; display_name: string | null; avatar_url: string | null } | null
        if (!imageUrl || !profile) return null
        return { id: p.id, caption: p.caption, imageUrl, profile }
      })
      .filter((p): p is GridPost => p !== null)
      .slice(0, 20)
  }

  return (
    <>
      <TopBar title={style.name} left={<BackButton href="/cosmo" />} />

      {/* キャラクター＋説明 */}
      <div
        className="relative flex flex-col items-center justify-center pt-10 pb-8 px-5 gap-4"
        style={{
          background: `linear-gradient(160deg, ${style.palette[0]}30 0%, var(--bg) 60%)`,
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background: style.gradient }}
        />

        <StyleAlien styleId={style.id as StyleId} size={130} />

        <div className="text-center flex flex-col gap-2">
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
            {style.name}
          </h1>
          <span
            className="inline-block px-4 py-1 rounded-full text-xs font-bold self-center"
            style={{
              background: `${style.palette[0]}22`,
              border: `1.5px solid ${style.palette[0]}55`,
              color: style.palette[0],
            }}
          >
            {style.subtitle}
          </span>
          <p className="text-sm leading-relaxed mt-1" style={{ color: 'var(--text-sub)' }}>
            {style.description}
          </p>
        </div>
      </div>

      {/* 投稿グリッド */}
      <div className="px-4 pb-10">
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          このスタイルの人
        </p>

        {gridPosts.length === 0 ? (
          <div
            className="rounded-2xl p-8 flex flex-col items-center gap-2"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              まだ投稿がありません
            </p>
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              STYLE IDを設定して投稿すると<br />ここに表示されます
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {gridPosts.map(post => (
              <Link
                key={post.id}
                href={`/profile/${post.profile.username}`}
                className="block active:opacity-80 transition-opacity"
              >
                <div
                  className="relative rounded-2xl overflow-hidden"
                  style={{ aspectRatio: '3/4' }}
                >
                  <Image
                    src={post.imageUrl}
                    alt={post.caption ?? 'コーデ'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 448px) 50vw, 224px"
                  />
                  {/* グラデーションオーバーレイ */}
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 to-transparent" />
                  {/* ユーザー情報 */}
                  <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 flex items-center gap-1.5">
                    <Avatar
                      src={post.profile.avatar_url}
                      username={post.profile.username}
                      size="sm"
                      className="ring-1 ring-white/30 flex-shrink-0"
                    />
                    <p className="text-white text-xs font-semibold truncate leading-none">
                      {post.profile.display_name ?? post.profile.username}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
