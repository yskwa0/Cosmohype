'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type FollowState = 'following' | 'pending' | 'not_following'

interface Props {
  targetUserId: string
  targetIsPrivate: boolean
  initialState: FollowState
  currentUserId: string
}

export function FollowListButton({ targetUserId, targetIsPrivate, initialState, currentUserId }: Props) {
  const [state, setState] = useState<FollowState>(initialState)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
    setLoading(true)

    if (state === 'following') {
      setState('not_following')
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId)
      if (error) setState('following')
    } else if (state === 'pending') {
      setState('not_following')
      const { error } = await supabase
        .from('follow_requests')
        .delete()
        .eq('requester_id', currentUserId)
        .eq('target_id', targetUserId)
      if (error) setState('pending')
    } else {
      if (targetIsPrivate) {
        setState('pending')
        const { error } = await supabase
          .from('follow_requests')
          .insert({ requester_id: currentUserId, target_id: targetUserId })
        if (error) setState('not_following')
      } else {
        setState('following')
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: currentUserId, following_id: targetUserId })
        if (error) setState('not_following')
      }
    }

    setLoading(false)
  }

  const base = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-50 whitespace-nowrap'

  if (state === 'following') {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className={base}
        style={{ border: '1px solid var(--border)', color: 'var(--text-sub)', background: 'var(--bg-subtle)' }}
      >
        フォロー中
      </button>
    )
  }

  if (state === 'pending') {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className={base}
        style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'var(--bg-subtle)' }}
      >
        承認待ち
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={base}
      style={{ background: 'var(--purple-glow)', color: '#fff' }}
    >
      フォロー
    </button>
  )
}
