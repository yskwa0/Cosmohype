import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileMenu } from '@/components/profile/ProfileMenu'
import { ProfileOwnerMenu } from '@/components/profile/ProfileOwnerMenu'
import { BackButton } from '@/components/ui/BackButton'
import type { Post, Profile } from '@/types/database'

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>
  searchParams: Promise<{ from?: string; ref?: string }>
}) {
  const { username } = await params
  const { from, ref } = await searchParams
  const supabase = await createClient()

  const resolvedUsername = username === 'me'
    ? await supabase.auth.getUser().then(async ({ data }) => {
        if (!data.user) return null
        const { data: p } = await supabase.from('profiles').select('username').eq('id', data.user.id).single()
        return (p as { username: string } | null)?.username ?? null
      })
    : username

  if (!resolvedUsername) return notFound()

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('*, follow_activity_last_read_at')
    .eq('username', resolvedUsername)
    .single()

  if (!profileRaw) notFound()
  const profile = profileRaw as Profile

  const { data: { user: currentUser } } = await supabase.auth.getUser()
  const isOwner = currentUser?.id === profile.id

  const [isFollowing, isBlocked, isPending, isFollowedBy] = await Promise.all([
    currentUser && !isOwner
      ? supabase
          .from('follows')
          .select('id')
          .eq('follower_id', currentUser.id)
          .eq('following_id', profile.id)
          .maybeSingle()
          .then(({ data }) => !!data)
      : Promise.resolve(false),
    currentUser && !isOwner
      ? supabase
          .from('blocks')
          .select('id')
          .eq('blocker_id', currentUser.id)
          .eq('blocked_id', profile.id)
          .maybeSingle()
          .then(({ data }) => !!data)
      : Promise.resolve(false),
    currentUser && !isOwner && profile.is_private
      ? supabase
          .from('follow_requests')
          .select('id')
          .eq('requester_id', currentUser.id)
          .eq('target_id', profile.id)
          .maybeSingle()
          .then(({ data }) => !!data)
      : Promise.resolve(false),
    currentUser && !isOwner
      ? supabase
          .from('follows')
          .select('id')
          .eq('follower_id', profile.id)
          .eq('following_id', currentUser.id)
          .maybeSingle()
          .then(({ data }) => !!data)
      : Promise.resolve(false),
  ])

  const isMutualFollow = isFollowing && isFollowedBy

  const hasPendingRequests = await (async () => {
    if (!isOwner) return false
    if (profile.is_private) {
      const { count } = await supabase
        .from('follow_requests')
        .select('id', { count: 'exact', head: true })
        .eq('target_id', profile.id)
      return (count ?? 0) > 0
    }
    // 公開アカウント：未読の新規フォローがあるかチェック
    const lastRead = profile.follow_activity_last_read_at
    const query = supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', profile.id)
    if (lastRead) query.gt('created_at', lastRead)
    const { count } = await query
    return (count ?? 0) > 0
  })()

  const canViewPosts = !profile.is_private || isOwner || isFollowing
  const { data: posts } = canViewPosts
    ? await supabase
        .from('posts')
        .select(`*, post_images(*)`)
        .eq('user_id', profile.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <>
      <TopBar
        left={(() => {
          if (from === 'follow-activity') return <BackButton href="/profile/follow-activity" variant="purple" />
          if (from === 'followers' && ref) return <BackButton href={`/profile/${ref}/followers`} variant="purple" />
          if (from === 'following' && ref) return <BackButton href={`/profile/${ref}/following`} variant="purple" />
          return undefined
        })()}
        title={
          <span className="flex items-center gap-1.5">
            @{profile.username}
            {profile.is_private && (
              <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor" aria-label="非公開アカウント" style={{ color: 'var(--text-sub)' }}>
                <path d="M18 10h-1V7a5 5 0 0 0-10 0v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2zm-6 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm3.1-7H8.9V7a3.1 3.1 0 0 1 6.2 0v3z"/>
              </svg>
            )}
          </span>
        }
        right={isOwner ? (
          <div className="flex items-center gap-1">
            <Link
              href="/profile/follow-activity"
              className="relative p-1 transition-transform duration-75 active:scale-75"
              aria-label="フォローリクエスト・通知"
              style={{ color: 'var(--text)' }}
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
              </svg>
              {hasPendingRequests && (
                <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-red-500" />
              )}
            </Link>
            <ProfileOwnerMenu />
          </div>
        ) : currentUser ? (
          <ProfileMenu
            targetUserId={profile.id}
            currentUserId={currentUser.id}
            initialBlocked={isBlocked}
          />
        ) : undefined}
      />
      <div>
        <ProfileHeader
          profile={profile}
          postsCount={canViewPosts ? (posts?.length ?? 0) : 0}
          isOwner={isOwner}
          currentUserId={currentUser?.id}
          initialFollowing={isFollowing}
          initialPending={isPending}
          isMutualFollow={isMutualFollow}
          isFollowedBy={isFollowedBy}
        />

        <div style={{ borderTop: '1px solid var(--border)' }}>
          {!canViewPosts ? (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                style={{ background: 'var(--purple-dim)', border: '1px solid var(--border)' }}>
                <svg viewBox="0 0 24 24" className="w-7 h-7" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>このアカウントは非公開アカウントです</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>フォローすると投稿を見られます</p>
            </div>
          ) : (posts?.length ?? 0) === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: 'var(--text-muted)' }}>
              まだ投稿がありません
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-[1px]" style={{ background: 'transparent' }}>
              {(posts as Post[]).map(post => {
                const thumb = post.post_images?.[0]?.url
                return (
                  <Link
                    key={post.id}
                    href={`/post/${post.id}`}
                    className="relative block"
                    style={{ aspectRatio: '4/5', background: thumb ? 'var(--bg-elevated)' : 'var(--bg)' }}
                  >
                    {thumb && (
                      <Image
                        src={thumb}
                        alt={post.caption ?? 'コーデ'}
                        fill
                        className="object-cover"
                        sizes="33vw"
                      />
                    )}
                    {(post.post_images?.length ?? 0) > 1 && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-black/40 rounded-sm flex items-center justify-center">
                        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-white" fill="currentColor">
                          <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
                        </svg>
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

