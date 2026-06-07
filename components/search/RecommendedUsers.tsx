'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { AccountBadges } from '@/components/ui/AccountBadges'
import type { Profile } from '@/types/database'

interface Props {
  users: Profile[]
  initialFollowingIds: string[]
  currentUserId: string
}

export function RecommendedUsers({ users, initialFollowingIds, currentUserId }: Props) {
  const [followingIds, setFollowingIds] = useState(() => new Set(initialFollowingIds))
  const [visibleUsers, setVisibleUsers] = useState(users)
  const [loadingIds, setLoadingIds] = useState(() => new Set<string>())

  useEffect(() => { setVisibleUsers(users) }, [users])
  const supabase = createClient()
  const router = useRouter()

  async function toggleFollow(userId: string) {
    if (loadingIds.has(userId)) return
    setLoadingIds(prev => new Set(prev).add(userId))
    const isFollowing = followingIds.has(userId)

    setFollowingIds(prev => {
      const next = new Set(prev)
      isFollowing ? next.delete(userId) : next.add(userId)
      return next
    })

    if (isFollowing) {
      const { error } = await supabase.from('follows').delete()
        .eq('follower_id', currentUserId).eq('following_id', userId)
      if (error) {
        console.error('[RecommendedUsers] unfollow failed:', error)
        setFollowingIds(prev => new Set(prev).add(userId))
      }
    } else {
      setVisibleUsers(prev => prev.filter(u => u.id !== userId))
      const { error } = await supabase.from('follows').insert({ follower_id: currentUserId, following_id: userId })
      if (error) {
        console.error('[RecommendedUsers] follow insert failed:', error)
        setFollowingIds(prev => { const next = new Set(prev); next.delete(userId); return next })
        setVisibleUsers(prev => {
          if (prev.some(u => u.id === userId)) return prev
          const restored = users.find(u => u.id === userId)
          return restored ? [...prev, restored] : prev
        })
      }
    }

    setLoadingIds(prev => { const next = new Set(prev); next.delete(userId); return next })
    router.refresh()
  }

  return (
    <section className="px-4 pt-2 pb-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
        おすすめの人
      </h2>
      {visibleUsers.length === 0 ? (
        <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>おすすめの人はいません</p>
      ) : (
      <div className="flex flex-col">
        {visibleUsers.map(u => {
          const isFollowing = followingIds.has(u.id)
          const isLoading = loadingIds.has(u.id)
          return (
            <div key={u.id} className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <Link
                href={`/profile/${u.username}`}
                className="flex items-center gap-3 flex-1 min-w-0 active:opacity-70 transition-opacity"
              >
                <Avatar src={u.avatar_url} username={u.username} size="md" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
                      {u.display_name ?? u.username}
                    </span>
                    <AccountBadges isOfficial={u.is_official} isCosmohypeCreator={u.is_cosmohype_creator} />
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    @{u.username}
                  </p>
                </div>
              </Link>
              <button
                onClick={() => toggleFollow(u.id)}
                disabled={isLoading}
                className="flex-shrink-0 text-xs font-semibold px-4 py-1.5 rounded-full transition-colors disabled:opacity-50"
                style={isFollowing
                  ? { background: 'var(--bg-elevated)', color: 'var(--text-sub)', border: '1px solid var(--border)' }
                  : { background: 'var(--purple-glow)', color: '#fff' }
                }
              >
                {isFollowing ? 'フォロー中' : 'フォロー'}
              </button>
            </div>
          )
        })}
      </div>
      )}
    </section>
  )
}
