'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'

interface Requester {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

interface Props {
  requestId: string
  requester: Requester
}

type RowState = 'pending' | 'approved' | 'rejected'

export function FollowRequestItem({ requestId, requester }: Props) {
  const [state, setState] = useState<RowState>('pending')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function approve() {
    if (loading) return
    setLoading(true)
    const { error } = await supabase.rpc('approve_follow_request', { p_request_id: requestId })
    if (error) {
      setLoading(false)
      return
    }
    setState('approved')
    router.refresh()
  }

  async function reject() {
    if (loading) return
    setLoading(true)
    const { error } = await supabase
      .from('follow_requests')
      .delete()
      .eq('id', requestId)
    if (error) {
      setLoading(false)
      return
    }
    setState('rejected')
  }

  if (state === 'approved' || state === 'rejected') return null

  return (
    <li style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href={`/profile/${requester.username}?from=follow-activity`} className="flex items-center gap-3 flex-1 min-w-0 active:opacity-70">
          <Avatar src={requester.avatar_url} username={requester.username} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
              {requester.display_name ?? requester.username}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              @{requester.username}
            </p>
          </div>
        </Link>

        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={approve}
            disabled={loading}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-50 whitespace-nowrap"
            style={{ background: 'var(--purple-glow)', color: '#fff' }}
          >
            承認
          </button>
          <button
            onClick={reject}
            disabled={loading}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-50 whitespace-nowrap"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'var(--bg-subtle)' }}
          >
            削除
          </button>
        </div>
      </div>
    </li>
  )
}
