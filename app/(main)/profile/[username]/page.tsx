import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileMenu } from '@/components/profile/ProfileMenu'
import { ProfileOwnerMenu } from '@/components/profile/ProfileOwnerMenu'
import { ProfilePostGrid } from '@/components/profile/ProfilePostGrid'
import { BackButton } from '@/components/ui/BackButton'
import { SlideIn } from '@/components/ui/SlideIn'
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

  const hasActivity = await (async () => {
    if (!isOwner) return false
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('is_read', false)
    if ((unreadCount ?? 0) > 0) return true
    if (profile.is_private) {
      const { count: reqCount } = await supabase
        .from('follow_requests')
        .select('id', { count: 'exact', head: true })
        .eq('target_id', profile.id)
      return (reqCount ?? 0) > 0
    }
    return false
  })()

  const canViewPosts = !profile.is_private || isOwner || isFollowing

  const PAGE_SIZE = 24
  const [{ data: posts }, { count: postsCountRaw }] = await Promise.all([
    canViewPosts
      ? supabase
          .from('posts')
          .select(`*, post_images(*)`)
          .eq('user_id', profile.id)
          .eq('is_archived', false)
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE)
      : Promise.resolve({ data: [] }),
    canViewPosts
      ? supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('is_archived', false)
          .eq('is_hidden', false)
      : Promise.resolve({ count: 0 }),
  ])
  const postsCount = postsCountRaw ?? 0

  const pageContent = (
    <>
      <TopBar
        left={(() => {
          if (from === 'follow-activity') return <BackButton href="/profile/follow-activity" variant="purple" />
          if (from === 'followers' && ref) return <BackButton href={`/profile/${ref}/followers`} variant="purple" />
          if (from === 'following' && ref) return <BackButton href={`/profile/${ref}/following`} variant="purple" />
          if (from) return <BackButton variant="purple" />
          if (username === 'me') return undefined
          return <BackButton variant="purple" />
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
              href="/profile/cosmo-code"
              className="p-1 transition-transform duration-75 active:scale-75"
              aria-label="COSMO CODE"
              style={{ color: 'var(--text)' }}
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75V16.5zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
              </svg>
            </Link>
            <Link
              href="/profile/follow-activity"
              className="relative p-1 transition-transform duration-75 active:scale-75"
              aria-label="通知"
              style={{ color: 'var(--text)' }}
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              {hasActivity && (
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500" />
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
      <div style={{ paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))' }}>
        <ProfileHeader
          profile={profile}
          postsCount={canViewPosts ? postsCount : 0}
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
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>フォローするとスタイルを見られます</p>
            </div>
          ) : (posts?.length ?? 0) === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: 'var(--text-muted)' }}>
              まだスタイルがありません
            </div>
          ) : (
            <ProfilePostGrid
              initialPosts={posts as Post[]}
              userId={profile.id}
              hasMoreInitial={(posts?.length ?? 0) >= PAGE_SIZE}
            />
          )}
        </div>
      </div>

    </>
  )

  return isOwner ? pageContent : <SlideIn>{pageContent}</SlideIn>
}

