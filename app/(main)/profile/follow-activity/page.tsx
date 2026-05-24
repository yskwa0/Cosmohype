import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { Avatar } from '@/components/ui/Avatar'
import { FollowRequestItem } from '@/components/profile/FollowRequestItem'
import { MarkFollowActivityRead } from '@/components/profile/MarkFollowActivityRead'
import { formatRelativeTime } from '@/lib/utils'
import type { Profile } from '@/types/database'

export default async function FollowActivityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('id, username, is_private')
    .eq('id', user.id)
    .single()

  if (!profileRaw) redirect('/login')
  const profile = profileRaw as Pick<Profile, 'id' | 'username' | 'is_private'>

  if (profile.is_private) {
    // 非公開：フォローリクエスト一覧
    const { data: requests } = await supabase
      .from('follow_requests')
      .select('id, requester_id, created_at')
      .eq('target_id', user.id)
      .order('created_at', { ascending: false })

    const requesterIds = requests?.map(r => r.requester_id) ?? []
    let requesterProfiles: Record<string, Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>> = {}

    if (requesterIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', requesterIds)
      for (const p of profiles ?? []) {
        requesterProfiles[p.id] = p as Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
      }
    }

    return (
      <>
        <TopBar
          title="フォローリクエスト"
          left={<BackButton href="/profile/me" />}
        />
        {(requests?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
              style={{ background: 'var(--purple-dim)', border: '1px solid var(--border)' }}>
              <svg viewBox="0 0 24 24" className="w-7 h-7" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>フォローリクエストはありません</p>
          </div>
        ) : (
          <ul>
            {requests!.map(req => {
              const requester = requesterProfiles[req.requester_id]
              if (!requester) return null
              return (
                <FollowRequestItem
                  key={req.id}
                  requestId={req.id}
                  requester={requester}
                />
              )
            })}
          </ul>
        )}
      </>
    )
  }

  // 公開：直近1週間のフォロワー通知
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: recentFollows } = await supabase
    .from('follows')
    .select('follower_id, created_at')
    .eq('following_id', user.id)
    .gte('created_at', oneWeekAgo)
    .order('created_at', { ascending: false })

  const followerIds = recentFollows?.map(f => f.follower_id) ?? []
  let followerProfiles: Record<string, Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>> = {}

  if (followerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', followerIds)
    for (const p of profiles ?? []) {
      followerProfiles[p.id] = p as Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
    }
  }

  return (
    <>
      <MarkFollowActivityRead userId={user.id} />
      <TopBar
        title="フォロワー通知"
        left={<BackButton href="/profile/me" />}
      />
      {(recentFollows?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
            style={{ background: 'var(--purple-dim)', border: '1px solid var(--border)' }}>
            <svg viewBox="0 0 24 24" className="w-7 h-7" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>直近1週間のフォロワーはいません</p>
        </div>
      ) : (
        <ul>
          {recentFollows!.map(follow => {
            const follower = followerProfiles[follow.follower_id]
            if (!follower) return null
            return (
              <li key={follow.follower_id} style={{ borderBottom: '1px solid var(--border)' }}>
                <Link href={`/profile/${follower.username}?from=follow-activity`} className="flex items-center gap-3 px-4 py-3 active:opacity-70">
                  <Avatar src={follower.avatar_url} username={follower.username} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug" style={{ color: 'var(--text)' }}>
                      <span className="font-semibold">{follower.display_name ?? follower.username}</span>
                      <span style={{ color: 'var(--text-muted)' }}> さんがあなたをフォローしました</span>
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>@{follower.username}</p>
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {formatRelativeTime(follow.created_at)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
