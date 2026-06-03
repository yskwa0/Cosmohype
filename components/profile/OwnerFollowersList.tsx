'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { AccountBadges } from '@/components/ui/AccountBadges'
import type { Profile } from '@/types/database'

type ListUser = Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'is_private' | 'is_official' | 'is_cosmohype_creator'>

interface Props {
  initialFollowers: ListUser[]
  currentUserId: string
  profileUsername: string
}

export function OwnerFollowersList({ initialFollowers, currentUserId, profileUsername }: Props) {
  const [followers, setFollowers] = useState(initialFollowers)
  const supabase = createClient()
  const router = useRouter()

  async function removeFollower(userId: string, displayName: string) {
    if (!confirm(`${displayName} さんをフォロワーから削除しますか？`)) return

    const { error } = await supabase.rpc('remove_follower', { p_follower_id: userId })

    if (!error) {
      setFollowers(prev => prev.filter(f => f.id !== userId))
      router.refresh()
    }
  }

  if (followers.length === 0) {
    return (
      <div className="text-center py-20 text-sm" style={{ color: 'var(--text-muted)' }}>
        まだフォロワーがいません
      </div>
    )
  }

  return (
    <ul>
      {followers.map(user => (
        <li key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 px-4 py-3">
            <Link
              href={`/profile/${user.username}?from=followers&ref=${profileUsername}`}
              className="flex items-center gap-3 flex-1 min-w-0 active:opacity-70"
            >
              <Avatar src={user.avatar_url} username={user.username} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                    {user.display_name ?? user.username}
                  </span>
                  <AccountBadges isOfficial={user.is_official} isCosmohypeCreator={user.is_cosmohype_creator} />
                </div>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  @{user.username}
                </p>
              </div>
            </Link>
            <button
              onClick={() => removeFollower(user.id, user.display_name ?? user.username)}
              className="flex-shrink-0 px-3 h-8 rounded-lg text-xs font-medium"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
            >
              削除
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
