'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/Avatar'

export type GridPost = {
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

export function CosmoGrid({ posts }: { posts: GridPost[] }) {
  const router = useRouter()
  const [viewing, setViewing] = useState<GridPost | null>(null)

  useEffect(() => {
    if (!viewing) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [viewing])

  useEffect(() => {
    if (!viewing) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setViewing(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewing])

  if (posts.length === 0) {
    return (
      <div
        className="rounded-2xl p-8 flex flex-col items-center gap-2"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>まだ投稿がありません</p>
        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          STYLE IDを設定して投稿すると<br />ここに表示されます
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {posts.map(post => (
          <div
            key={post.id}
            role="button"
            tabIndex={0}
            aria-label="画像を拡大"
            onClick={() => setViewing(post)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setViewing(post) }}
            className="relative rounded-2xl overflow-hidden cursor-pointer select-none"
            style={{ aspectRatio: '3/4' }}
          >
            {/* Photo */}
            <Image
              src={post.imageUrl}
              alt={post.caption ?? 'コーデ'}
              fill
              className="object-cover pointer-events-none"
              sizes="(max-width: 448px) 50vw, 224px"
            />

            {/* Bottom gradient */}
            <div
              className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)' }}
            />

            {/* User info — stopPropagation so tap doesn't open viewer */}
            <button
              type="button"
              aria-label={`${post.profile.display_name ?? post.profile.username}のプロフィールへ`}
              onClick={e => {
                e.stopPropagation()
                router.push(`/profile/${post.profile.username}`)
              }}
              className="absolute bottom-0 left-0 px-2.5 pb-2.5 flex items-center gap-1.5"
              style={{ maxWidth: '100%' }}
            >
              <Avatar
                src={post.profile.avatar_url}
                username={post.profile.username}
                size="xs"
                className="ring-1 ring-white/40 flex-shrink-0"
              />
              <span className="text-white text-xs font-semibold truncate leading-none" style={{ maxWidth: 80 }}>
                {post.profile.display_name ?? post.profile.username}
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* Fullscreen viewer */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: 'rgba(0,0,0,0.93)' }}
          onClick={() => setViewing(null)}
        >
          {/* Top: close button */}
          <div
            className="flex-shrink-0 flex justify-end px-4"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="閉じる"
              onClick={() => setViewing(null)}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.14)' }}
            >
              <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Center: image with user info overlaid at bottom-left */}
          <div
            className="flex-1 flex items-center justify-center px-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', paddingTop: 8 }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{ width: '100%', maxWidth: 'min(100%, calc(70vh * 3 / 4))', aspectRatio: '3/4' }}
            >
              <Image
                src={viewing.imageUrl}
                alt={viewing.caption ?? 'コーデ'}
                fill
                className="object-cover"
                sizes="(max-width: 600px) 90vw, 400px"
                priority
              />

              {/* Gradient for readability */}
              <div
                className="absolute inset-x-0 bottom-0 h-28 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)' }}
              />

              {/* User info — overlaid bottom-left of image */}
              <button
                type="button"
                aria-label={`${viewing.profile.display_name ?? viewing.profile.username}のプロフィールへ`}
                onClick={e => { e.stopPropagation(); setViewing(null); router.push(`/profile/${viewing.profile.username}`) }}
                className="absolute bottom-0 left-0 flex items-center gap-2.5 px-3 pb-3 active:opacity-70 transition-opacity"
                style={{ zIndex: 10 }}
              >
                <Avatar
                  src={viewing.profile.avatar_url}
                  username={viewing.profile.username}
                  size="sm"
                  className="ring-2 ring-white/30 flex-shrink-0"
                />
                <div className="text-left min-w-0">
                  <p className="text-white text-sm font-semibold leading-tight" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                    {viewing.profile.display_name ?? viewing.profile.username}
                  </p>
                  <p className="text-xs leading-tight" style={{ color: 'rgba(255,255,255,0.65)', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                    @{viewing.profile.username}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
