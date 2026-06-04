'use client'
import { useState } from 'react'

type Preview = {
  imageUrl: string | null
  aspectRatio: string
  caption: string | null
  username: string | null
  displayName: string | null
  avatarUrl: string | null
} | null

export function PostDetailLoadingShell({ children }: { children: React.ReactNode }) {
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

  if (preview) {
    const [w, h] = (preview.aspectRatio ?? '4:5').split(':').map(Number)
    const paddingBottom = `${((h / w) * 100).toFixed(2)}%`

    return (
      <div style={{ minHeight: '100dvh' }}>
        {/* Fake TopBar matching ShellLoading */}
        <div
          className="sticky top-0 z-40"
          style={{ background: 'var(--bg)', paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div className="max-w-md mx-auto flex items-center gap-3 px-5" style={{ height: 56 }}>
            <div className="w-8 h-8 rounded-full flex-shrink-0 animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
            <div className="h-4 w-28 rounded-lg animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
          </div>
          <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }} />
        </div>

        {/* Post preview */}
        <div className="px-4 py-3">
          {/* Avatar + username row */}
          <div className="flex items-center gap-2.5 mb-3">
            {preview.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.avatarUrl}
                alt=""
                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full flex-shrink-0 animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
            )}
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold leading-tight" style={{ color: 'var(--text)' }}>
                {preview.displayName ?? preview.username ?? ''}
              </span>
              {preview.username && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>@{preview.username}</span>
              )}
            </div>
          </div>

          {/* Image preview — already in browser cache from feed */}
          {preview.imageUrl && (
            <div className="relative rounded-2xl overflow-hidden mb-3" style={{ paddingBottom }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.imageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          )}

          {/* Caption skeleton */}
          {preview.caption ? (
            <p className="text-sm line-clamp-2" style={{ color: 'var(--text-sub)' }}>{preview.caption}</p>
          ) : (
            <div className="h-3 w-3/4 rounded animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh' }}>
      {children}
    </div>
  )
}
