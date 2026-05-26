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
      <p style={{ color: 'red', fontWeight: 'bold', fontSize: 12, marginBottom: 8 }}>COSMO GRID TEST v2</p>
      <div className="grid grid-cols-2 gap-1.5">
        {posts.map(post => (
          /* Card: tap image area → open viewer */
          <div
            key={post.id}
            role="button"
            tabIndex={0}
            aria-label="画像を拡大"
            onClick={() => setViewing(post)}
            className="relative rounded-2xl overflow-hidden cursor-pointer active:opacity-80 transition-opacity select-none"
            style={{ aspectRatio: '3/4' }}
          >
            {/* Image */}
            <Image
              src={post.imageUrl}
              alt={post.caption ?? 'コーデ'}
              fill
              className="object-cover pointer-events-none"
              sizes="(max-width: 448px) 50vw, 224px"
            />

            {/* Gradient overlay */}
            <div
              className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)' }}
            />

            {/* User info: tap → profile (stopPropagation prevents card click) */}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                router.push(`/profile/${post.profile.username}`)
              }}
              className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 flex items-center gap-1.5 active:opacity-70 transition-opacity"
              aria-label={`${post.profile.display_name ?? post.profile.username}のプロフィール`}
            >
              <Avatar
                src={post.profile.avatar_url}
                username={post.profile.username}
                size="sm"
                className="ring-1 ring-white/30 flex-shrink-0"
              />
              <p className="text-white text-xs font-semibold truncate leading-none">
                {post.profile.display_name ?? post.profile.username}
              </p>
            </button>
          </div>
        ))}
      </div>

      {/* Full-screen image viewer */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setViewing(null)}
        >
          {/* Close */}
          <div
            className="flex justify-end px-4 flex-shrink-0"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
          >
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setViewing(null) }}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.12)' }}
              aria-label="閉じる"
            >
              <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Image */}
          <div
            className="flex-1 flex items-center justify-center px-4 py-4"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="relative"
              style={{ width: '100%', maxWidth: 'min(100%, calc(65vh * 3/4))', aspectRatio: '3/4' }}
            >
              <Image
                src={viewing.imageUrl}
                alt={viewing.caption ?? 'コーデ'}
                fill
                className="object-contain rounded-2xl"
                sizes="(max-width: 600px) 90vw, 400px"
                priority
              />
            </div>
          </div>

          {/* Bottom: user + profile button */}
          <div
            className="flex-shrink-0 px-5 pt-4 flex items-center justify-between gap-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                src={viewing.profile.avatar_url}
                username={viewing.profile.username}
                size="md"
                className="ring-2 ring-white/20 flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate leading-tight">
                  {viewing.profile.display_name ?? viewing.profile.username}
                </p>
                <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  @{viewing.profile.username}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setViewing(null); router.push(`/profile/${viewing.profile.username}`) }}
              className="flex-shrink-0 h-9 px-4 rounded-full text-sm font-semibold active:opacity-70 transition-opacity"
              style={{ background: 'rgba(124,58,237,0.85)', color: '#fff' }}
            >
              プロフィール
            </button>
          </div>
        </div>
      )}
    </>
  )
}
