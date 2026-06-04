'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Preview = {
  imageUrl: string | null
  aspectRatio: string
  caption: string | null
  username: string | null
  displayName: string | null
  avatarUrl: string | null
} | null

function Pulse({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      className="animate-pulse"
      style={{ background: 'var(--bg-elevated)', borderRadius: 4, ...style }}
    />
  )
}

export function PostDetailLoadingShell({ children: _children }: { children?: React.ReactNode }) {
  const router = useRouter()
  const [pressed, setPressed] = useState(false)
  const [preview] = useState<Preview>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = sessionStorage.getItem('feed_post_preview')
      if (!raw) return null
      sessionStorage.removeItem('feed_post_preview')
      return JSON.parse(raw) as Preview
    } catch {
      return null
    }
  })

  const [w, h] = (preview?.aspectRatio ?? '4:5').split(':').map(Number)
  const paddingBottom = `${((h / w) * 100).toFixed(2)}%`

  return (
    <div style={{ minHeight: '100dvh' }}>

      {/* TopBar — identical to PostDetailSlide's TopBar */}
      <header
        className="sticky top-0 z-40"
        style={{ background: 'var(--bg)', paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-md mx-auto flex items-center justify-between px-5 h-14">
          <div className="flex items-center gap-2">
            <button
              onPointerDown={() => setPressed(true)}
              onPointerUp={() => setPressed(false)}
              onPointerLeave={() => setPressed(false)}
              onPointerCancel={() => setPressed(false)}
              onClick={() => router.back()}
              aria-label="戻る"
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(124,58,237,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transform: pressed ? 'scale(0.82)' : 'scale(1)',
                transition: pressed
                  ? 'transform 70ms ease-in'
                  : 'transform 480ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#7C3AED" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <h1 className="text-base font-semibold" style={{ color: 'var(--text)' }}>投稿</h1>
          </div>
        </div>
        <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }} />
      </header>

      {/* User header — matches PostDetail: flex items-center gap-3 px-4 py-3 */}
      <div className="flex items-center gap-3 px-4 py-3">
        {preview?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.avatarUrl}
            alt=""
            className="w-11 h-11 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <Pulse style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
        )}
        <div className="flex-1 min-w-0">
          {preview?.displayName || preview?.username ? (
            <>
              <div className="font-bold text-base leading-tight mb-0.5" style={{ color: 'var(--text)' }}>
                {preview.displayName ?? preview.username}
              </div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                @{preview.username}
              </div>
            </>
          ) : (
            <>
              <Pulse style={{ height: 14, width: 100, marginBottom: 6 }} />
              <Pulse style={{ height: 12, width: 72 }} />
            </>
          )}
        </div>
        {/* Menu icon placeholder — keeps layout stable when real PostDetail shows menu */}
        <div style={{ width: 36, height: 36, flexShrink: 0 }} />
      </div>

      {/* Image — real from sessionStorage (already in browser cache) or skeleton */}
      <div className="relative" style={{ paddingBottom }}>
        {preview?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
        )}
      </div>

      {/* Caption + meta + action bar — matches PostDetail: px-4 pt-3 pb-1 */}
      <div className="px-4 pt-3 pb-1">

        {/* Caption */}
        {preview?.caption ? (
          <p className="text-[15px] leading-relaxed mb-3" style={{ color: 'var(--text)' }}>
            {(preview.displayName || preview.username) && (
              <span className="font-bold mr-1.5">
                {preview.displayName ?? preview.username}
              </span>
            )}
            {preview.caption}
          </p>
        ) : (
          <div className="mb-3 flex flex-col gap-2">
            <Pulse style={{ height: 14, width: '82%' }} />
            <Pulse style={{ height: 14, width: '58%' }} />
          </div>
        )}

        {/* Timestamp skeleton */}
        <Pulse style={{ height: 12, width: 72, marginBottom: 12 }} />

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border)' }} />

        {/* Action bar — same icons/layout as PostDetail, dimmed */}
        <div className="flex items-center gap-6 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
          {/* Like */}
          <svg viewBox="0 0 24 24" className="w-6 h-6"
            style={{ color: 'var(--text-muted)', opacity: 0.45 }}
            fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          {/* Comment */}
          <svg viewBox="0 0 24 24" className="w-6 h-6"
            style={{ color: 'var(--text-muted)', opacity: 0.45 }}
            fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
          {/* Save — ml-auto matches PostDetail */}
          <svg viewBox="0 0 24 24" className="w-6 h-6 ml-auto"
            style={{ color: 'var(--text-muted)', opacity: 0.45 }}
            fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
        </div>
      </div>

      {/* CommentSection header skeleton */}
      <div className="px-4 pt-2 pb-6">
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>コメント</p>
        <div className="flex flex-col gap-3">
          {[0, 1].map(i => (
            <div key={i} className="flex items-start gap-2.5">
              <Pulse style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }} />
              <div className="flex-1 flex flex-col gap-1.5">
                <Pulse style={{ height: 12, width: 80 }} />
                <Pulse style={{ height: 12, width: i === 0 ? 140 : 110 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
