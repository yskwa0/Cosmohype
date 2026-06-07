'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { AccountBadges } from '@/components/ui/AccountBadges'
import { formatRelativeTime } from '@/lib/utils'
import type { Comment } from '@/types/database'

interface Props {
  postId: string
  userId?: string
  onCommentAdded?: () => void
  onCommentDeleted?: () => void
}

export function InlineComments({ postId, userId, onCommentAdded, onCommentDeleted }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('comments')
      .select('*, profiles(*)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setComments((data ?? []) as Comment[])
        setLoading(false)
      })
  }, [postId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text || !userId || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: userId, body: text })
      .select('*, profiles(*)')
      .single()
    if (!error && data) {
      setComments(prev => [...prev, data as Comment])
      setBody('')
      onCommentAdded?.()
    } else if (error) {
      console.error('[InlineComments] comment insert failed:', error)
      setSubmitError('コメントの送信に失敗しました。もう一度お試しください。')
      setTimeout(() => setSubmitError(null), 3000)
    }
    setSubmitting(false)
  }

  async function handleDelete(commentId: string) {
    await supabase.from('comments').delete().eq('id', commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
    onCommentDeleted?.()
  }

  if (loading) return (
    <div className="px-4 pb-3">
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>読み込み中...</p>
    </div>
  )

  return (
    <div className="px-4 pb-4 flex flex-col gap-3">
      {comments.length === 0 && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>まだコメントはありません</p>
      )}
      {comments.map(comment => (
        <div key={comment.id} className="flex items-start gap-2">
          <Link href={`/profile/${comment.profiles?.username ?? ''}`}>
            <Avatar src={comment.profiles?.avatar_url} username={comment.profiles?.username} size="xs" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                  {comment.profiles?.display_name ?? comment.profiles?.username}
                </span>
                <AccountBadges isOfficial={comment.profiles?.is_official} isCosmohypeCreator={comment.profiles?.is_cosmohype_creator} />
              </div>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {formatRelativeTime(comment.created_at)}
              </span>
            </div>
            <p className="text-xs mt-0.5 break-words" style={{ color: 'var(--text-sub)' }}>{comment.body}</p>
          </div>
          {userId === comment.user_id && (
            <button onClick={() => handleDelete(comment.id)} className="shrink-0 p-1" aria-label="削除">
              <svg viewBox="0 0 24 24" className="w-3 h-3" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ))}

      {submitError && (
        <p className="text-xs" style={{ color: '#F87171' }}>{submitError}</p>
      )}
      {userId && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-1">
          <input
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="コメントを追加..."
            maxLength={300}
            className="flex-1 px-3 py-2 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30"
            style={{ background: 'var(--input-bg)', color: 'var(--input-text)', border: '1px solid var(--input-border)' }}
          />
          <button
            type="submit"
            disabled={!body.trim() || submitting}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-40"
            style={{ background: 'var(--purple-glow)' }}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </form>
      )}
    </div>
  )
}
