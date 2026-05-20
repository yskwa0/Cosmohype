'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function FollowButton({ followerId, followingId, initialFollowing }: {
  followerId: string
  followingId: string
  initialFollowing: boolean
}) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function toggle() {
    setLoading(true)
    const next = !following
    setFollowing(next)

    if (next) {
      await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId })
    } else {
      await supabase.from('follows').delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="w-full h-9 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
      style={following
        ? { background: 'var(--bg-subtle)', color: 'var(--text-sub)', border: '1px solid var(--border)' }
        : { background: 'var(--purple-glow)', color: '#fff' }
      }
    >
      {following ? 'フォロー中' : 'フォローする'}
    </button>
  )
}
