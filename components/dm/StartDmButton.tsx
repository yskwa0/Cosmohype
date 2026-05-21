'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Props {
  targetUserId: string
  currentUserId: string
  className?: string
}

export function StartDmButton({ targetUserId, currentUserId, className }: Props) {
  const [loading, setLoading] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const router = useRouter()

  // マウント時に自分→相手のブロックを確認（RLS 範囲内で参照可能な方向）
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('blocks')
      .select('id')
      .eq('blocker_id', currentUserId)
      .eq('blocked_id', targetUserId)
      .maybeSingle()
      .then(({ data }) => { if (data) setBlocked(true) })
  }, [currentUserId, targetUserId])

  async function handleClick() {
    if (loading || blocked) return
    setLoading(true)

    const supabase = createClient()

    // 自分 → 相手 のブロック再確認
    const { data: selfBlock } = await supabase
      .from('blocks')
      .select('id')
      .eq('blocker_id', currentUserId)
      .eq('blocked_id', targetUserId)
      .maybeSingle()

    if (selfBlock) {
      setBlocked(true)
      setLoading(false)
      return
    }

    // 既存会話を検索
    const { data: myConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', currentUserId)

    const myConvIds = (myConvs ?? []).map(c => c.conversation_id)
    let conversationId: string | null = null

    if (myConvIds.length > 0) {
      const { data: shared } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', targetUserId)
        .in('conversation_id', myConvIds)
        .limit(1)
        .maybeSingle()

      conversationId = shared?.conversation_id ?? null
    }

    // 既存会話があれば SECURITY DEFINER 関数で双方向ブロック確認
    if (conversationId) {
      const { data: isBlocked } = await supabase
        .rpc('is_dm_blocked', { conv_id: conversationId })

      if (isBlocked) {
        setBlocked(true)
        setLoading(false)
        return
      }
    }

    // 会話がなければ新規作成
    if (!conversationId) {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({})
        .select('id')
        .single()

      if (convError || !newConv) {
        setLoading(false)
        return
      }

      conversationId = newConv.id

      const { error: selfError } = await supabase
        .from('conversation_participants')
        .insert({ conversation_id: conversationId, user_id: currentUserId })

      if (selfError) {
        setLoading(false)
        return
      }

      await supabase
        .from('conversation_participants')
        .insert({ conversation_id: conversationId, user_id: targetUserId })
    }

    router.push(`/dm/${conversationId}`)
  }

  if (blocked) {
    return (
      <div className={cn('flex flex-col items-center gap-1', className)}>
        <div
          className="w-full h-9 rounded-xl text-xs font-medium flex items-center justify-center"
          style={{
            background: 'var(--bg-subtle)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}
        >
          メッセージ不可
        </div>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          このユーザーとはメッセージできません
        </p>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'h-9 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5',
        className
      )}
      style={{
        background: 'var(--bg-subtle)',
        color: 'var(--text-sub)',
        border: '1px solid var(--border)',
      }}
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
            />
          </svg>
          メッセージ
        </>
      )}
    </button>
  )
}
