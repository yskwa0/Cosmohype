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
  const [followError, setFollowError] = useState<string | null>(null)
  const supabase = createClient()

  async function toggle() {
    setLoading(true)
    setFollowError(null)
    const next = !following
    setFollowing(next)

    if (next) {
      const { error } = await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId })
      if (error) {
        console.error('[FollowButton] follow insert failed:', error)
        setFollowing(!next)
        setFollowError('フォローに失敗しました。もう一度お試しください。')
        setTimeout(() => setFollowError(null), 3000)
      }
    } else {
      const { error } = await supabase.from('follows').delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
      if (error) {
        console.error('[FollowButton] follow delete failed:', error)
        setFollowing(!next)
        setFollowError('フォロー解除に失敗しました。もう一度お試しください。')
        setTimeout(() => setFollowError(null), 3000)
      }
    }
    setLoading(false)
  }

  return (
    <>
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
      {followError && (
        <p className="text-xs text-center mt-1" style={{ color: '#F87171' }}>{followError}</p>
      )}
    </>
  )
}
