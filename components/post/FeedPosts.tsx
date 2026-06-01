'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { PostCard } from './PostCard'
import { peekFeedInteractions, drainFeedInteractions } from '@/lib/feedInteractionCache'
import type { Post } from '@/types/database'

export function FeedPosts({
  initialPosts,
  initialLikedIds,
  initialSavedIds,
  userId,
  tab,
}: {
  initialPosts: Post[]
  initialLikedIds: string[]
  initialSavedIds: string[]
  userId: string
  tab: 'recommended' | 'following'
}) {
  // Initializers run synchronously on mount — peek (don't drain) the cache so the
  // very first render already reflects any like/save done on the detail page.
  const [posts, setPosts] = useState<Post[]>(() => {
    const pending = peekFeedInteractions()
    if (!pending.size) return initialPosts
    return initialPosts.map(p => {
      const ov = pending.get(p.id)
      if (!ov || ov.likeCount === undefined) return p
      return { ...p, likes_count: ov.likeCount }
    })
  })
  const [likedIds, setLikedIds] = useState<Set<string>>(() => {
    const pending = peekFeedInteractions()
    const base = new Set(initialLikedIds)
    for (const [id, { liked }] of pending) {
      if (liked === true) base.add(id)
      else if (liked === false) base.delete(id)
    }
    return base
  })
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    const pending = peekFeedInteractions()
    const base = new Set(initialSavedIds)
    for (const [id, { saved }] of pending) {
      if (saved === true) base.add(id)
      else if (saved === false) base.delete(id)
    }
    return base
  })
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialPosts.length >= 20)
  const isLoadingRef = useRef(false)
  const hasMoreRef = useRef(initialPosts.length >= 20)
  const postsRef = useRef(initialPosts)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => { postsRef.current = posts }, [posts])
  useEffect(() => { hasMoreRef.current = hasMore }, [hasMore])

  // Sync like/save state from PostDetail back to this feed.
  // On mount: drain what was peeked in the useState initializers above (cache cleared).
  // On popstate: apply any new interactions written while on the detail page.
  // This handles the case where FeedPosts is NOT re-mounted (restored from router cache).
  useEffect(() => {
    drainFeedInteractions() // clear what was already applied in the useState initializers

    function applyPending() {
      const pending = drainFeedInteractions()
      if (!pending.size) return
      setLikedIds(prev => {
        const next = new Set(prev)
        for (const [id, { liked }] of pending) {
          if (liked === true) next.add(id)
          else if (liked === false) next.delete(id)
        }
        return next
      })
      setSavedIds(prev => {
        const next = new Set(prev)
        for (const [id, { saved }] of pending) {
          if (saved === true) next.add(id)
          else if (saved === false) next.delete(id)
        }
        return next
      })
      setPosts(prev => prev.map(p => {
        const ov = pending.get(p.id)
        if (!ov || ov.likeCount === undefined) return p
        return { ...p, likes_count: ov.likeCount }
      }))
    }

    window.addEventListener('popstate', applyPending)
    return () => window.removeEventListener('popstate', applyPending)
  }, [])

  const handleLikeToggle = useCallback((postId: string, isLiked: boolean) => {
    setLikedIds(prev => {
      const next = new Set(prev)
      if (isLiked) next.add(postId)
      else next.delete(postId)
      return next
    })
  }, [])

  const handleSaveToggle = useCallback((postId: string, isSaved: boolean) => {
    setSavedIds(prev => {
      const next = new Set(prev)
      if (isSaved) next.add(postId)
      else next.delete(postId)
      return next
    })
  }, [])

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMoreRef.current) return
    const cursor = postsRef.current[postsRef.current.length - 1]?.created_at
    if (!cursor) return

    isLoadingRef.current = true
    setIsLoading(true)

    try {
      const res = await fetch('/api/feed/more', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab, cursor }),
      })
      if (!res.ok) throw new Error('fetch failed')
      const { posts: newPosts, likedIds: newLiked, savedIds: newSaved, hasMore: more } = await res.json()

      setPosts(p => {
        const existingIds = new Set(p.map(x => x.id))
        const deduped = (newPosts as Post[]).filter(x => !existingIds.has(x.id))
        return [...p, ...deduped]
      })
      setLikedIds(prev => {
        const next = new Set(prev)
        ;(newLiked as string[]).forEach(id => next.add(id))
        return next
      })
      setSavedIds(prev => {
        const next = new Set(prev)
        ;(newSaved as string[]).forEach(id => next.add(id))
        return next
      })
      const nextHasMore = more && (newPosts as Post[]).length > 0
      setHasMore(nextHasMore)
      hasMoreRef.current = nextHasMore
    } catch {
      // silently fail — user can scroll again to retry
    } finally {
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [tab])

  // Attach scroll listener to the FeedSlider panel (nearest overflow-y:auto ancestor)
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    let scrollEl: HTMLElement | null = sentinel.parentElement
    while (scrollEl && getComputedStyle(scrollEl).overflowY !== 'auto') {
      scrollEl = scrollEl.parentElement
    }
    if (!scrollEl) return

    const el = scrollEl
    function check() {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 400) {
        loadMore()
      }
    }

    el.addEventListener('scroll', check, { passive: true })
    return () => el.removeEventListener('scroll', check)
  }, [loadMore])

  if (posts.length === 0) {
    return tab === 'following' ? <EmptyFollowing /> : <EmptyFeed />
  }

  return (
    <div className="flex flex-col gap-3 py-4 feed-animate-in">
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          userId={userId}
          isLiked={likedIds.has(post.id)}
          isSaved={savedIds.has(post.id)}
          onLikeToggle={handleLikeToggle}
          onSaveToggle={handleSaveToggle}
        />
      ))}

      <div ref={sentinelRef} />

      {isLoading && (
        <div className="flex justify-center py-6">
          <svg
            className="animate-spin w-5 h-5"
            viewBox="0 0 22 22"
            fill="none"
            style={{ color: 'var(--purple)' }}
          >
            <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
            <path d="M11 2a9 9 0 019 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {!hasMore && !isLoading && (
        <p className="text-center text-xs py-6" style={{ color: 'var(--text-muted)' }}>
          すべての投稿を表示しました
        </p>
      )}
    </div>
  )
}

function EmptyFollowing() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'var(--purple-dim)', border: '1px solid var(--border)' }}>
        <svg viewBox="0 0 24 24" className="w-10 h-10" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      </div>
      <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>フォロー中のユーザーがいません</h2>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>気になるユーザーをフォローしてみましょう</p>
    </div>
  )
}

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'var(--purple-dim)', border: '1px solid var(--border)' }}>
        <svg viewBox="0 0 24 24" className="w-10 h-10" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
        </svg>
      </div>
      <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>まだ投稿がありません</h2>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>最初のコーデを投稿してみましょう</p>
    </div>
  )
}
