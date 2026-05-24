import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { Avatar } from '@/components/ui/Avatar'
import { FollowListButton } from '@/components/profile/FollowListButton'
import type { Profile } from '@/types/database'

type ListUser = Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'is_private'>

export default async function FollowingPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('id, username, display_name, is_private, following_count')
    .eq('username', username)
    .single()

  if (!profileRaw) notFound()
  const profile = profileRaw as Pick<Profile, 'id' | 'username' | 'display_name' | 'is_private' | 'following_count'>

  const { data: { user: currentUser } } = await supabase.auth.getUser()
  const isOwner = currentUser?.id === profile.id

  const isFollowing = currentUser && !isOwner
    ? await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', profile.id)
        .maybeSingle()
        .then(({ data }) => !!data)
    : false

  const canView = !profile.is_private || isOwner || isFollowing

  let following: ListUser[] = []
  let followingIds = new Set<string>()
  let pendingIds = new Set<string>()

  if (canView) {
    const { data: followRows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', profile.id)

    const ids = followRows?.map(r => r.following_id) ?? []

    if (ids.length > 0) {
      const [profilesRes, myFollowsRes, myPendingRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, is_private')
          .in('id', ids),
        currentUser
          ? supabase
              .from('follows')
              .select('following_id')
              .eq('follower_id', currentUser.id)
              .in('following_id', ids)
          : Promise.resolve({ data: [] }),
        currentUser
          ? supabase
              .from('follow_requests')
              .select('target_id')
              .eq('requester_id', currentUser.id)
              .in('target_id', ids)
          : Promise.resolve({ data: [] }),
      ])

      following = (profilesRes.data ?? []) as ListUser[]
      followingIds = new Set((myFollowsRes.data ?? []).map((r: { following_id: string }) => r.following_id))
      pendingIds = new Set((myPendingRes.data ?? []).map((r: { target_id: string }) => r.target_id))
    }
  }

  return (
    <>
      <TopBar
        title={`@${profile.username} のフォロー`}
        left={<BackButton href={`/profile/${username}`} variant="purple" />}
      />
      {!canView ? (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
            style={{ background: 'var(--purple-dim)', border: '1px solid var(--border)' }}>
            <svg viewBox="0 0 24 24" className="w-7 h-7" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>このアカウントは非公開アカウントです</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>フォローすると一覧を見られます</p>
        </div>
      ) : following.length === 0 ? (
        <div className="text-center py-20 text-sm" style={{ color: 'var(--text-muted)' }}>
          まだフォローしているユーザーがいません
        </div>
      ) : (
        <ul>
          {following.map(user => {
            const isSelf = currentUser?.id === user.id
            const followState = followingIds.has(user.id)
              ? 'following'
              : pendingIds.has(user.id)
              ? 'pending'
              : 'not_following'

            return (
              <li key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <Link href={`/profile/${user.username}?from=following&ref=${username}`} className="flex items-center gap-3 flex-1 min-w-0 active:opacity-70">
                    <Avatar src={user.avatar_url} username={user.username} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                        {user.display_name ?? user.username}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        @{user.username}
                      </p>
                    </div>
                  </Link>
                  {!isSelf && currentUser && (
                    <FollowListButton
                      targetUserId={user.id}
                      targetIsPrivate={user.is_private}
                      initialState={followState}
                      currentUserId={currentUser.id}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
