'use client'
import Link from 'next/link'
import { useState, useRef } from 'react'
import { ImageViewer } from '@/components/ui/ImageViewer'
import { Avatar } from '@/components/ui/Avatar'
import { StyleIdBadge } from '@/components/style-id/StyleIdBadge'
import { createClient } from '@/lib/supabase/client'
import { usePostInteraction } from '@/hooks/usePostInteraction'
import { formatRelativeTime } from '@/lib/utils'
import { AccountBadges } from '@/components/ui/AccountBadges'
import { PostMenu } from './PostMenu'
import { PostOwnerMenu } from './PostOwnerMenu'
import { ImageCarousel } from './ImageCarousel'
import { PostRecommendItems } from '@/components/affiliate/PostRecommendItems'
import type { Post } from '@/types/database'

function isToday(dateStr: string): boolean {
  const now = new Date()
  const d = new Date(dateStr)
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export function PostDetail({ post, userId, isLiked = false, isSaved = false }: {
  post: Post
  userId?: string
  isLiked?: boolean
  isSaved?: boolean
}) {
  const [currentImage, setCurrentImage] = useState(0)
  const [heartPos, setHeartPos] = useState<{ x: number; y: number } | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIdx, setViewerIdx] = useState(0)
  const lastTapRef = useRef(0)
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()
  const images = post.post_images ?? []
  const profile = post.profiles

  const [{ liked, saved, likeCount }, updateInteraction] = usePostInteraction(post.id, {
    liked: isLiked,
    saved: isSaved,
    likeCount: post.likes_count,
    saveCount: post.saves_count,
  })

  async function toggleLike() {
    if (!userId) return
    const next = !liked
    const prevCount = likeCount
    updateInteraction({ liked: next, likeCount: next ? prevCount + 1 : prevCount - 1 })
    try {
      if (next) {
        await supabase.from('likes').insert({ user_id: userId, post_id: post.id })
      } else {
        await supabase.from('likes').delete().eq('user_id', userId).eq('post_id', post.id)
      }
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id)
      if (count !== null) updateInteraction({ liked: next, likeCount: count })
    } catch {
      updateInteraction({ liked: !next, likeCount: prevCount })
    }
  }

  async function toggleSave() {
    if (!userId) return
    const next = !saved
    updateInteraction({ saved: next })
    try {
      if (next) {
        const { error } = await supabase.from('saved_posts').insert({ user_id: userId, post_id: post.id })
        if (error) throw error
      } else {
        const { error } = await supabase.from('saved_posts').delete().eq('user_id', userId).eq('post_id', post.id)
        if (error) throw error
      }
    } catch {
      updateInteraction({ saved: !next })
    }
  }

  function handleImageTap(e: React.MouseEvent<HTMLDivElement>) {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current)
        singleTapTimerRef.current = null
      }
      const rect = e.currentTarget.getBoundingClientRect()
      setHeartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      setTimeout(() => setHeartPos(null), 800)
      if (!liked) toggleLike()
    } else {
      singleTapTimerRef.current = setTimeout(() => {
        setViewerIdx(currentImage)
        setViewerOpen(true)
      }, 160)
    }
    lastTapRef.current = now
  }

  return (
    <div>
      {/* ユーザーヘッダー */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href={`/profile/${profile?.username ?? ''}`} className="flex-shrink-0">
          <Avatar src={profile?.avatar_url} username={profile?.username} size="lg" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <Link href={`/profile/${profile?.username ?? ''}`}>
              <span className="font-bold text-base leading-tight" style={{ color: 'var(--text)' }}>
                {profile?.display_name ?? profile?.username}
              </span>
            </Link>
            <AccountBadges isOfficial={profile?.is_official} isCosmohypeCreator={profile?.is_cosmohype_creator} />
            {profile?.style_id && (
              <StyleIdBadge styleId={profile.style_id} />
            )}
          </div>
          <Link href={`/profile/${profile?.username ?? ''}`}>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              @{profile?.username}
            </span>
          </Link>
        </div>
        {userId && userId === post.user_id && (
          <PostOwnerMenu
            postId={post.id}
            postCreatedAt={post.created_at}
            userId={post.user_id}
            username={profile?.username ?? ''}
            isArchived={post.is_archived}
          />
        )}
        {userId && userId !== post.user_id && profile?.id && (
          <PostMenu postId={post.id} postOwnerId={profile.id} currentUserId={userId} />
        )}
      </div>

      {/* 全幅画像 */}
      {images.length > 0 && (
        <div className="select-none">
          <ImageCarousel
            images={images}
            alt={post.caption ?? 'コーデ'}
            sizes="100vw"
            priority
            aspectRatio={post.image_aspect_ratio ?? undefined}
            onTap={handleImageTap}
            onIndexChange={setCurrentImage}
          >
            {heartPos && (
              <div className="absolute pointer-events-none"
                style={{ left: heartPos.x - 32, top: heartPos.y - 32, animation: 'heart-burst 0.75s ease-out forwards' }}>
                <svg viewBox="0 0 24 24" className="w-16 h-16" fill="#F87171">
                  <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
            )}
          </ImageCarousel>
        </div>
      )}

      {/* キャプション・タグ・メタ情報 */}
      <div className="px-4 pt-3 pb-1">

        {/* HYPEバッジ */}
        {post.hype_theme && isToday(post.created_at) && (
          <Link
            href="/hype"
            className="inline-flex items-center gap-1.5 mb-2.5 px-3 py-1 rounded-full transition-opacity active:opacity-70"
            style={{ background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.3)' }}
          >
            <svg viewBox="0 0 60 60" width={12} height={12} aria-hidden>
              <path d="M30 13 L44 30 L30 47 L16 30Z" fill="#FBCFE8" opacity={0.9} />
              <path d="M30 21 L38 30 L30 39 L22 30Z" fill="white" opacity={0.95} />
              <circle cx={30} cy={30} r={4.5} fill="#EC4899" />
            </svg>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#F9A8D4' }}>HYPE</span>
          </Link>
        )}

        {/* キャプション */}
        {post.caption && (
          <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text)' }}>
            <Link href={`/profile/${profile?.username ?? ''}`}>
              <span className="font-bold mr-1.5" style={{ color: 'var(--text)' }}>
                {profile?.display_name ?? profile?.username}
              </span>
            </Link>
            {post.caption}
          </p>
        )}

        {/* ブランドタグ・ハッシュタグ */}
        {(post.brand_tags?.length > 0 || post.tags?.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {post.brand_tags?.map(tag => (
              <span key={tag} className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ color: 'var(--tag-text)', background: 'var(--tag-bg)', border: '1px solid var(--tag-border)' }}>
                {tag}
              </span>
            ))}
            {post.tags?.map(tag => (
              <span key={tag} className="text-sm font-medium" style={{ color: 'var(--purple)' }}>#{tag}</span>
            ))}
          </div>
        )}

        {/* 投稿日時 */}
        <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
          {formatRelativeTime(post.created_at)}
        </p>

        {/* 区切り線 */}
        <div style={{ borderTop: '1px solid var(--border)' }} />

        {/* いいね数（X風: 独立した行で強調） */}
        {likeCount > 0 && (
          <div className="py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="font-bold text-base" style={{ color: 'var(--text)' }}>{likeCount.toLocaleString()}</span>
            <span className="text-base ml-1" style={{ color: 'var(--text-muted)' }}>件のいいね</span>
          </div>
        )}

        {/* アクションバー */}
        <div className="flex items-center gap-6 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <button onClick={toggleLike} disabled={!userId} className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-6 h-6 transition-colors"
              style={{ color: liked ? '#A855F7' : 'var(--text-muted)' }}
              fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={liked ? 0 : 2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </button>

          <button className="flex items-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6" style={{ color: 'var(--text-muted)' }}
              fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </button>

          <button onClick={toggleSave} disabled={!userId} className="ml-auto">
            <svg viewBox="0 0 24 24" className="w-6 h-6 transition-colors"
              style={{ color: saved ? 'var(--purple)' : 'var(--text-muted)' }}
              fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={saved ? 0 : 2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
          </button>
        </div>
      </div>

      {viewerOpen && images.length > 0 && (
        <ImageViewer
          images={images}
          initialIdx={viewerIdx}
          onClose={() => setViewerOpen(false)}
        />
      )}

      {/* MVP: 着用アイテムセクション一時非表示（将来のアフィリエイト対応時に復活）
      {post.post_items && post.post_items.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <PostRecommendItems items={post.post_items} />
        </div>
      )}
      */}
    </div>
  )
}
