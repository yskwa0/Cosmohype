'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Post } from '@/types/database'

const PAGE_SIZE = 24

export function ProfilePostGrid({
  initialPosts,
  userId,
  hasMoreInitial,
}: {
  initialPosts: Post[]
  userId: string
  hasMoreInitial: boolean
}) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [hasMore, setHasMore] = useState(hasMoreInitial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const loadingRef = useRef(false)
  const postsRef = useRef(initialPosts)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => { postsRef.current = posts }, [posts])

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return
    const cursor = postsRef.current[postsRef.current.length - 1]?.created_at
    if (!cursor) return

    loadingRef.current = true
    setLoading(true)
    setError(false)

    try {
      const supabase = createClient()
      const { data, error: err } = await supabase
        .from('posts')
        .select('*, post_images(*)')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .lt('created_at', cursor)
        .limit(PAGE_SIZE)

      if (err) throw err

      const next = (data ?? []) as Post[]
      setPosts(prev => [...prev, ...next])
      setHasMore(next.length >= PAGE_SIZE)
    } catch {
      setError(true)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [userId])

  // IntersectionObserver: trigger loadMore when sentinel scrolls into view
  useEffect(() => {
    if (!hasMore) return
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '300px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  return (
    <div>
      <div className="grid grid-cols-3 gap-[1px]">
        {posts.map(post => {
          const thumb = post.post_images?.[0]?.url
          return (
            <Link
              key={post.id}
              href={`/post/${post.id}`}
              className="relative block"
              style={{ aspectRatio: '4/5', background: thumb ? 'var(--bg-elevated)' : 'var(--bg)' }}
            >
              {thumb && (
                <Image
                  src={thumb}
                  alt={post.caption ?? 'コーデ'}
                  fill
                  className="object-cover"
                  sizes="33vw"
                />
              )}
              {(post.post_images?.length ?? 0) > 1 && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-black/40 rounded-sm flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-white" fill="currentColor">
                    <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
                  </svg>
                </div>
              )}
            </Link>
          )
        })}
      </div>

      {/* sentinel: IntersectionObserver watches this to trigger auto-load */}
      <div ref={sentinelRef} className="h-1" />

      {loading && (
        <div className="flex justify-center py-6">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 22 22" fill="none" style={{ color: 'var(--purple)' }}>
            <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
            <path d="M11 2a9 9 0 019 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {error && !loading && (
        <div className="py-5 flex justify-center">
          <button
            onClick={loadMore}
            className="text-sm font-medium px-5 py-2 rounded-full"
            style={{ color: 'var(--purple)', background: 'var(--purple-dim)', border: '1px solid var(--border)' }}
          >
            もう一度読み込む
          </button>
        </div>
      )}
    </div>
  )
}
