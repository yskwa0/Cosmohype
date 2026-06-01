'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { StyleAlien } from '@/components/style-id/StyleAlien'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import type { StyleId } from '@/lib/style-id/types'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'
import { saveFeedScroll, armFeedScrollRestore } from '@/lib/feedScrollStore'
import { setFeedInteraction } from '@/lib/feedInteractionCache'
import { InlineComments } from './InlineComments'
import { PostMenu } from './PostMenu'
import { PostOwnerMenu } from './PostOwnerMenu'
import { ImageViewer } from '@/components/ui/ImageViewer'
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

export function PostCard({ post, userId, isLiked = false, isSaved = false, onLikeToggle, onSaveToggle }: {
  post: Post; userId?: string; isLiked?: boolean; isSaved?: boolean
  onLikeToggle?: (postId: string, isLiked: boolean) => void
  onSaveToggle?: (postId: string, isSaved: boolean) => void
}) {
  const [currentImage, setCurrentImage] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [liked, setLiked] = useState(isLiked)
  const [likeCount, setLikeCount] = useState(post.likes_count)
  const [saved, setSaved] = useState(isSaved)
  const [commentsCount, setCommentsCount] = useState(post.comments_count)
  const [heartPos, setHeartPos] = useState<{ x: number; y: number } | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIdx, setViewerIdx] = useState(0)
  const lastTapRef = useRef(0)
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const images = post.post_images ?? []
  const profile = post.profiles

  async function toggleLike() {
    if (!userId) return
    const next = !liked
    setLiked(next)
    setLikeCount(c => next ? c + 1 : c - 1)
    setFeedInteraction(post.id, { liked: next })
    onLikeToggle?.(post.id, next)
    try {
      if (next) {
        const { error } = await supabase.from('likes').insert({ user_id: userId, post_id: post.id })
        if (error) throw error
      } else {
        const { error } = await supabase.from('likes').delete().eq('user_id', userId).eq('post_id', post.id)
        if (error) throw error
      }
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id)
      if (count !== null) {
        setLikeCount(count)
        setFeedInteraction(post.id, { liked: next, likeCount: count })
      }
    } catch {
      setLiked(!next)
      setLikeCount(c => next ? c - 1 : c + 1)
      setFeedInteraction(post.id, { liked: !next })
      onLikeToggle?.(post.id, !next)
    }
  }

  async function toggleSave() {
    if (!userId) return
    const next = !saved
    setSaved(next)
    setFeedInteraction(post.id, { saved: next })
    onSaveToggle?.(post.id, next)
    try {
      if (next) {
        const { error } = await supabase.from('saved_posts').insert({ user_id: userId, post_id: post.id })
        if (error) throw error
      } else {
        const { error } = await supabase.from('saved_posts').delete().eq('user_id', userId).eq('post_id', post.id)
        if (error) throw error
      }
    } catch {
      setSaved(!next)
      setFeedInteraction(post.id, { saved: !next })
      onSaveToggle?.(post.id, !next)
    }
  }

  function handleImageTap(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation()
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
    <div
      data-post-id={post.id}
      className="px-4 py-3"
      style={{ borderBottom: '1px solid var(--border)', position: 'relative' }}
      onClick={(e) => {
        let node: HTMLElement | null = e.currentTarget as HTMLElement
        while (node && getComputedStyle(node).overflowY !== 'auto') {
          node = node.parentElement
        }
        const panelIdx = Number(node?.dataset?.feedPanel ?? '0')
        const scrollTop = node?.scrollTop ?? 0

        saveFeedScroll(scrollTop, panelIdx)
        armFeedScrollRestore()
        sessionStorage.setItem('post_slide_from_feed', '1')
        router.push(`/post/${post.id}`, { scroll: false })
      }}
    >
      <div className="flex gap-3">

        {/* 左: アバター */}
        <Link
          href={`/profile/${profile?.username ?? ''}`}
          className="flex-shrink-0 self-start"
          onClick={e => e.stopPropagation()}
        >
          <Avatar src={profile?.avatar_url} username={profile?.username} size="md" />
        </Link>

        {/* 右: コンテンツ */}
        <div className="flex-1 min-w-0">

          {/* ヘッダー行 */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <Link
                href={`/profile/${profile?.username ?? ''}`}
                onClick={e => e.stopPropagation()}
              >
                <span className="font-bold text-sm truncate" style={{ color: 'var(--text)' }}>
                  {profile?.display_name ?? profile?.username}
                </span>
              </Link>
              {profile?.style_id && STYLE_TYPES[profile.style_id as StyleId] && (
                <Link
                  href={`/cosmo/${profile.style_id}`}
                  className="flex-shrink-0 transition-opacity active:opacity-70"
                  onClick={e => e.stopPropagation()}
                >
                  <StyleAlien styleId={profile.style_id as StyleId} size={20} />
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {formatRelativeTime(post.created_at)}
              </span>
              {userId && userId === post.user_id && (
                <div onClick={e => e.stopPropagation()}>
                  <PostOwnerMenu
                    postId={post.id}
                    postCreatedAt={post.created_at}
                    userId={post.user_id}
                    username={profile?.username ?? ''}
                    isArchived={post.is_archived}
                  />
                </div>
              )}
              {userId && userId !== post.user_id && profile?.id && (
                <div onClick={e => e.stopPropagation()}>
                  <PostMenu postId={post.id} postOwnerId={profile.id} currentUserId={userId} />
                </div>
              )}
            </div>
          </div>

          {/* HYPEバッジ */}
          {post.hype_theme && isToday(post.created_at) && (
            <Link href="/hype" className="inline-flex items-center gap-1 mb-1.5 px-2 py-0.5 rounded-full transition-opacity active:opacity-70"
              style={{ background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.3)' }}
              onClick={e => e.stopPropagation()}>
              <svg viewBox="0 0 60 60" width={10} height={10} aria-hidden>
                <path d="M30 13 L44 30 L30 47 L16 30Z" fill="#FBCFE8" opacity={0.9} />
                <path d="M30 21 L38 30 L30 39 L22 30Z" fill="white" opacity={0.95} />
                <circle cx={30} cy={30} r={4.5} fill="#EC4899" />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#F9A8D4' }}>HYPE</span>
            </Link>
          )}

          {/* キャプション */}
          {post.caption && (
            <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text)' }}>
              {post.caption}
            </p>
          )}

          {/* 画像 */}
          {images.length > 0 && (
            <div
              className="relative rounded-xl overflow-hidden mb-2 select-none"
              onClick={handleImageTap}
            >
              <Image
                src={images[currentImage].url}
                alt={post.caption ?? 'コーデ'}
                width={0}
                height={0}
                sizes="(max-width: 448px) 80vw, 360px"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />

              {heartPos && (
                <div className="absolute pointer-events-none"
                  style={{ left: heartPos.x - 32, top: heartPos.y - 32, animation: 'heart-burst 0.75s ease-out forwards' }}>
                  <svg viewBox="0 0 24 24" className="w-16 h-16" fill="#F87171">
                    <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                </div>
              )}

              {images.length > 1 && (
                <>
                  {currentImage > 0 && (
                    <button onClick={e => { e.stopPropagation(); setCurrentImage(i => i - 1) }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                  )}
                  {currentImage < images.length - 1 && (
                    <button onClick={e => { e.stopPropagation(); setCurrentImage(i => i + 1) }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  )}
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-black/35 backdrop-blur-sm">
                    <span className="text-white text-[10px] font-medium">{currentImage + 1}/{images.length}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ブランドタグ・ハッシュタグ */}
          {(post.brand_tags?.length > 0 || post.tags?.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {post.brand_tags?.map(tag => (
                <span key={tag} className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ color: 'var(--tag-text)', background: 'var(--tag-bg)', border: '1px solid var(--tag-border)' }}>
                  {tag}
                </span>
              ))}
              {post.tags?.map(tag => (
                <span key={tag} className="text-xs" style={{ color: 'var(--purple)' }}>#{tag}</span>
              ))}
            </div>
          )}

          {/* アクションバー */}
          <div className="flex items-center gap-5 mt-1">
            <button onClick={e => { e.stopPropagation(); toggleLike() }} disabled={!userId} className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="w-5 h-5 transition-colors"
                style={{ color: liked ? '#A855F7' : 'var(--text-muted)' }}
                fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={liked ? 0 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              {likeCount > 0 && (
                <span className="text-xs" style={{ color: liked ? 'var(--purple)' : 'var(--text-muted)' }}>{likeCount}</span>
              )}
            </button>

            <button onClick={e => { e.stopPropagation(); setShowComments(p => !p) }} className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="w-5 h-5 transition-colors"
                style={{ color: showComments ? 'var(--purple)' : 'var(--text-muted)' }}
                fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
              {commentsCount > 0 && (
                <span className="text-xs" style={{ color: showComments ? 'var(--purple)' : 'var(--text-muted)' }}>{commentsCount}</span>
              )}
            </button>

            <button onClick={e => { e.stopPropagation(); toggleSave() }} disabled={!userId}>
              <svg viewBox="0 0 24 24" className="w-5 h-5 transition-colors"
                style={{ color: saved ? 'var(--purple)' : 'var(--text-muted)' }}
                fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={saved ? 0 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
            </button>
          </div>

        </div>
      </div>

      {showComments && (
        <div onClick={e => e.stopPropagation()}>
          <InlineComments
            postId={post.id}
            userId={userId}
            onCommentAdded={() => setCommentsCount(c => c + 1)}
            onCommentDeleted={() => setCommentsCount(c => Math.max(0, c - 1))}
          />
        </div>
      )}

      {viewerOpen && images.length > 0 && (
        <ImageViewer
          images={images}
          initialIdx={viewerIdx}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  )
}
