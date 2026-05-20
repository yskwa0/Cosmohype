'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useRef } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'
import { InlineComments } from './InlineComments'
import { PostMenu } from './PostMenu'
import type { Post } from '@/types/database'

export function PostCard({ post, userId, isLiked = false, isSaved = false }: {
  post: Post; userId?: string; isLiked?: boolean; isSaved?: boolean
}) {
  const [currentImage, setCurrentImage] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [liked, setLiked] = useState(isLiked)
  const [likeCount, setLikeCount] = useState(post.likes_count)
  const [saved, setSaved] = useState(isSaved)
  const [heartPos, setHeartPos] = useState<{ x: number; y: number } | null>(null)
  const lastTapRef = useRef(0)
  const supabase = createClient()
  const images = post.post_images ?? []
  const profile = post.profiles

  async function toggleLike() {
    if (!userId) return
    const next = !liked
    setLiked(next)
    setLikeCount(c => next ? c + 1 : c - 1)
    if (next) {
      await supabase.from('likes').insert({ user_id: userId, post_id: post.id })
    } else {
      await supabase.from('likes').delete().eq('user_id', userId).eq('post_id', post.id)
    }
  }

  async function toggleSave() {
    if (!userId) return
    const next = !saved
    setSaved(next)
    if (next) {
      await supabase.from('saved_posts').insert({ user_id: userId, post_id: post.id })
    } else {
      await supabase.from('saved_posts').delete().eq('user_id', userId).eq('post_id', post.id)
    }
  }

  function handleImageTap(e: React.MouseEvent<HTMLDivElement>) {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      const rect = e.currentTarget.getBoundingClientRect()
      setHeartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      setTimeout(() => setHeartPos(null), 800)
      if (!liked) toggleLike()
    }
    lastTapRef.current = now
  }

  return (
    <div className="mx-4">
      {/* 画像カード */}
      {images.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ boxShadow: '0 2px 16px rgba(124,58,237,0.07)', border: '1px solid var(--card-border)' }}>
          <div
            className="relative w-full select-none"
            style={{ aspectRatio: '4/5' }}
            onClick={handleImageTap}
          >
            <Image
              src={images[currentImage].url}
              alt={post.caption ?? 'コーデ'}
              fill className="object-cover"
              sizes="(max-width: 448px) 100vw, 448px"
            />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />

            {heartPos && (
              <div className="absolute pointer-events-none"
                style={{ left: heartPos.x - 32, top: heartPos.y - 32, animation: 'heart-burst 0.75s ease-out forwards' }}>
                <svg viewBox="0 0 24 24" className="w-16 h-16" fill="#F87171">
                  <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
              <Link href={`/profile/${profile?.username ?? ''}`} className="flex items-center gap-2.5" onClick={e => e.stopPropagation()}>
                <Avatar src={profile?.avatar_url} username={profile?.username} size="sm" className="ring-2 ring-white/40" />
                <div>
                  <p className="text-white text-sm font-semibold leading-none">{profile?.display_name ?? profile?.username}</p>
                  <p className="text-white/60 text-xs mt-0.5">{formatRelativeTime(post.created_at)}</p>
                </div>
              </Link>
            </div>

            {images.length > 1 && (
              <>
                {currentImage > 0 && (
                  <button onClick={e => { e.stopPropagation(); setCurrentImage(i => i - 1) }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                )}
                {currentImage < images.length - 1 && (
                  <button onClick={e => { e.stopPropagation(); setCurrentImage(i => i + 1) }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                )}
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/25 backdrop-blur-sm">
                  <span className="text-white text-xs font-medium">{currentImage + 1}/{images.length}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* カード外側: アクションバー */}
      <div className="flex items-center justify-between px-1 pt-2.5 pb-1">
        <div className="flex items-center gap-4">
          <button onClick={toggleLike} disabled={!userId} className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="w-6 h-6 transition-colors"
              style={{ color: liked ? '#A855F7' : 'var(--text-muted)' }}
              fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={liked ? 0 : 2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            {likeCount > 0 && <span className="text-xs font-medium" style={{ color: liked ? 'var(--purple)' : 'var(--text-muted)' }}>{likeCount}</span>}
          </button>

          <button onClick={() => setShowComments(p => !p)} className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="w-6 h-6 transition-colors"
              style={{ color: showComments ? 'var(--purple)' : 'var(--text-muted)' }}
              fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
            {post.comments_count > 0 && <span className="text-xs font-medium" style={{ color: showComments ? 'var(--purple)' : 'var(--text-muted)' }}>{post.comments_count}</span>}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {userId && userId !== post.user_id && profile?.id && (
            <PostMenu postId={post.id} postOwnerId={profile.id} currentUserId={userId} />
          )}
          <button onClick={toggleSave} disabled={!userId}>
            <svg viewBox="0 0 24 24" className="w-6 h-6 transition-colors"
              style={{ color: saved ? 'var(--purple)' : 'var(--text-muted)' }}
              fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={saved ? 0 : 2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* キャプション・タグ */}
      {(post.caption || post.brand_tags?.length > 0 || post.tags?.length > 0) && (
        <div className="px-1 pb-1">
          {post.caption && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{post.caption}</p>
          )}
          {(post.brand_tags?.length > 0 || post.tags?.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {post.brand_tags?.map(tag => (
                <span key={tag} className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ color: 'var(--tag-text)', background: 'var(--tag-bg)', border: '1px solid var(--tag-border)' }}>
                  {tag}
                </span>
              ))}
              {post.tags?.map(tag => (
                <span key={tag} className="text-xs" style={{ color: 'var(--text-muted)' }}>#{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {showComments && <InlineComments postId={post.id} userId={userId} />}
    </div>
  )
}
