import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { Avatar } from '@/components/ui/Avatar'
import { FollowRequestItem } from '@/components/profile/FollowRequestItem'
import { MarkActivityRead } from '@/components/profile/MarkActivityRead'
import { formatRelativeTime } from '@/lib/utils'
import type { Profile } from '@/types/database'

type ActorProfile = Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
type NotifPost = { id: string; post_images: { url: string; display_order: number }[] } | null

type RawNotification = {
  id: string
  type: 'like' | 'comment' | 'follow'
  post_id: string | null
  is_read: boolean
  created_at: string
  actor: ActorProfile | null
  post: NotifPost
}


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

  // SELECT通知 と フォローリクエスト を並列取得。
  // 既読化は表示後にクライアント側 MarkActivityRead が行う（is_read の表示状態を正確に保つため）。
  const [notifResult, reqsResult] = await Promise.all([
    supabase
      .from('notifications')
      .select(`
        id, type, post_id, is_read, created_at,
        actor:profiles!notifications_actor_id_fkey(id, username, display_name, avatar_url),
        post:posts!notifications_post_id_fkey(id, post_images(url, display_order))
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    profile.is_private
      ? supabase
          .from('follow_requests')
          .select('id, requester_id, created_at')
          .eq('target_id', user.id)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  const notifications = (notifResult.data ?? []) as unknown as RawNotification[]

  // Follow requests for private accounts
  let requests: { id: string; requester_id: string; created_at: string }[] = []
  let requesterProfiles: Record<string, ActorProfile> = {}

  if (profile.is_private) {
    requests = (reqsResult.data ?? []) as { id: string; requester_id: string; created_at: string }[]

    const requesterIds = requests.map(r => r.requester_id)
    if (requesterIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', requesterIds)
      for (const p of profiles ?? []) {
        requesterProfiles[p.id] = p as ActorProfile
      }
    }
  }

  // isEmpty は取得件数ベースで判定（JOINの可否に依存しない）
  const isEmpty = notifications.length === 0 && requests.length === 0

  return (
    <>
      {/* 既読化は表示後にクライアント側で行う */}
      <MarkActivityRead userId={user.id} />
      <TopBar title="通知" left={<BackButton href="/profile/me" />} />

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
            style={{ background: 'var(--purple-dim)', border: '1px solid var(--border)' }}
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>通知はありません</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>いいね・コメント・フォローがあると表示されます</p>
        </div>
      ) : (
        <div>
          {/* フォローリクエスト（非公開アカウントのみ） */}
          {requests.length > 0 && (
            <div>
              <p className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                フォローリクエスト
              </p>
              <ul>
                {requests.map(req => {
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
              {notifications.length > 0 && (
                <div className="mt-4 mb-1 px-4">
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    通知
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 通知リスト */}
          {notifications.length > 0 && (
            <ul>
              {notifications.map(notif => {
                const actor = notif.actor
                const actorName = actor?.display_name ?? actor?.username ?? 'ユーザー'
                const actorUsername = actor?.username ?? null

                const href = notif.type === 'follow'
                  ? (actorUsername ? `/profile/${actorUsername}?from=follow-activity` : '#')
                  : `/post/${notif.post_id}`

                const thumb = notif.post?.post_images
                  ?.slice()
                  .sort((a, b) => a.display_order - b.display_order)[0]?.url ?? null

                return (
                  <li
                    key={notif.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: notif.is_read ? undefined : 'color-mix(in srgb, var(--purple) 6%, transparent)',
                    }}
                  >
                    <Link href={href} className="flex items-center gap-3 px-4 py-3 active:opacity-70">
                      {/* 未読ドット */}
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: notif.is_read ? 'transparent' : 'var(--purple)' }}
                      />
                      <Avatar src={actor?.avatar_url ?? null} username={actorUsername ?? '?'} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug" style={{ color: 'var(--text)' }}>
                          <span className="font-semibold">{actorName}</span>
                          <span style={{ color: 'var(--text-sub)' }}>
                            {notif.type === 'like' && 'さんがあなたの投稿にいいねしました'}
                            {notif.type === 'comment' && 'さんがあなたの投稿にコメントしました'}
                            {notif.type === 'follow' && 'さんがあなたをフォローしました'}
                          </span>
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {formatRelativeTime(notif.created_at)}
                        </p>
                      </div>
                      {thumb && notif.type !== 'follow' && (
                        <div className="relative w-10 h-10 flex-shrink-0 rounded overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                          <Image src={thumb} alt="" fill className="object-cover" sizes="40px" />
                        </div>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </>
  )
}
