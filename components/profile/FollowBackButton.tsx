'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type FollowState = 'not_following' | 'following' | 'pending'

interface Props {
  currentUserId: string
  actorId: string
  actorIsPrivate: boolean
  initialState: FollowState
}

export function FollowBackButton({ currentUserId, actorId, actorIsPrivate, initialState }: Props) {
  const [state, setState] = useState<FollowState>(initialState)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function follow() {
    if (state !== 'not_following' || loading) return
    setLoading(true)
    setError(null)

    if (actorIsPrivate) {
      setState('pending')
      const { error: err } = await supabase.from('follow_requests').insert({
        requester_id: currentUserId,
        target_id: actorId,
      })
      if (err) {
        console.error('[FollowBackButton] follow_request insert failed:', err)
        setState('not_following')
        setError('失敗しました')
        setTimeout(() => setError(null), 3000)
      }
    } else {
      setState('following')
      const { error: err } = await supabase.from('follows').insert({
        follower_id: currentUserId,
        following_id: actorId,
      })
      if (err) {
        console.error('[FollowBackButton] follow insert failed:', err)
        setState('not_following')
        setError('失敗しました')
        setTimeout(() => setError(null), 3000)
      }
    }
    setLoading(false)
  }

  const isActive = state === 'not_following'
  const label =
    state === 'following' ? 'フォロー中' :
    state === 'pending' ? 'リクエスト中' :
    actorIsPrivate ? 'リクエスト' : 'フォローする'

  return (
    <div className="flex flex-col items-end flex-shrink-0">
      <button
        onClick={follow}
        disabled={!isActive || loading}
        className="text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap disabled:opacity-70 transition-opacity active:opacity-70"
        style={isActive
          ? { background: 'var(--purple-glow)', color: '#fff' }
          : { background: 'var(--bg-subtle)', color: 'var(--text-sub)', border: '1px solid var(--border)' }
        }
      >
        {label}
      </button>
      {error && (
        <p className="text-[10px] mt-0.5 text-right" style={{ color: '#F87171' }}>{error}</p>
      )}
    </div>
  )
}
