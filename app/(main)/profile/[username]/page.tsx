import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileMenu } from '@/components/profile/ProfileMenu'
import { ProfileOwnerMenu } from '@/components/profile/ProfileOwnerMenu'
import type { Post, Profile } from '@/types/database'

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
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
    .select('*')
    .eq('username', resolvedUsername)
    .single()

  if (!profileRaw) notFound()
  const profile = profileRaw as Profile

  const { data: posts } = await supabase
    .from('posts')
    .select(`*, post_images(*)`)
    .eq('user_id', profile.id)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  const { data: { user: currentUser } } = await supabase.auth.getUser()
  const isOwner = currentUser?.id === profile.id

  const [isFollowing, isBlocked] = await Promise.all([
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
  ])

  return (
    <>
      <TopBar
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
          <ProfileOwnerMenu />
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
          postsCount={posts?.length ?? 0}
          isOwner={isOwner}
          currentUserId={currentUser?.id}
          initialFollowing={isFollowing}
        />

        <div style={{ borderTop: '1px solid var(--border)' }}>
          {(posts?.length ?? 0) === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: 'var(--text-muted)' }}>
              まだ投稿がありません
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-[1px]" style={{ background: 'var(--bg)' }}>
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

