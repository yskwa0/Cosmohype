'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { StyleAlien } from '@/components/style-id/StyleAlien'
import { StartDmButton } from '@/components/dm/StartDmButton'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import type { Profile } from '@/types/database'
import type { StyleId } from '@/lib/style-id/types'

type FollowState = 'not_following' | 'following' | 'pending'

interface Props {
  profile: Profile
  postsCount: number
  isOwner: boolean
  currentUserId?: string
  initialFollowing: boolean
  initialPending?: boolean
  isMutualFollow?: boolean
  isFollowedBy?: boolean
}

const STAR_COUNT = 8

export function ProfileHeader({ profile, postsCount, isOwner, currentUserId, initialFollowing, initialPending = false, isMutualFollow = false, isFollowedBy: initialIsFollowedBy = false }: Props) {
  const [followState, setFollowState] = useState<FollowState>(
    initialFollowing ? 'following' : initialPending ? 'pending' : 'not_following'
  )
  const [followersCount, setFollowersCount] = useState(profile.followers_count)
  const [isFollowedBy, setIsFollowedBy] = useState(initialIsFollowedBy)
  const [loading, setLoading] = useState(false)
  const [editPressing, setEditPressing] = useState(false)
  const [sparkling, setSparkling] = useState(false)
  const [showUnfollowModal, setShowUnfollowModal] = useState(false)
  const starsRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (!sparkling || !starsRef.current) return
    const stars = starsRef.current.querySelectorAll('span')
    stars.forEach((star, i) => {
      const angle = (i / STAR_COUNT) * 2 * Math.PI
      const dist = 55
      const tx = Math.cos(angle) * dist
      const ty = Math.sin(angle) * dist
      star.animate([
        { opacity: 1, transform: `translate(-50%, -50%) scale(0) rotate(0deg)` },
        { opacity: 1, transform: `translate(calc(-50% + ${tx * 1.35}px), calc(-50% + ${ty * 1.35}px)) scale(1.8) rotate(200deg)`, offset: 0.3 },
        { opacity: 0, transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0.3) rotate(400deg)` },
      ], {
        duration: 750,
        delay: 0,
        easing: 'cubic-bezier(0.1, 0, 0.2, 1)',
        fill: 'forwards',
      })
    })
    const timeout = setTimeout(() => setSparkling(false), 800)
    return () => clearTimeout(timeout)
  }, [sparkling])

  async function doUnfollow(alsoRemoveFollower: boolean) {
    if (!currentUserId) return
    setLoading(true)
    setShowUnfollowModal(false)

    await supabase.from('follows').delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', profile.id)

    if (alsoRemoveFollower) {
      await supabase.rpc('remove_follower', { p_follower_id: profile.id })
      setIsFollowedBy(false)
    }

    setFollowState('not_following')
    setFollowersCount(c => c - 1)
    setLoading(false)
    router.refresh()
  }

  async function toggleFollow() {
    if (!currentUserId) return

    if (followState === 'following') {
      if (isFollowedBy) {
        setShowUnfollowModal(true)
      } else {
        await doUnfollow(false)
      }
    } else if (followState === 'pending') {
      setFollowState('not_following')
      await supabase.from('follow_requests').delete()
        .eq('requester_id', currentUserId)
        .eq('target_id', profile.id)
    } else {
      if (profile.is_private) {
        setFollowState('pending')
        await supabase.from('follow_requests').insert({
          requester_id: currentUserId,
          target_id: profile.id,
        })
      } else {
        setSparkling(true)
        setTimeout(() => setSparkling(false), 700)
        setFollowState('following')
        setFollowersCount(c => c + 1)
        await supabase.from('follows').insert({
          follower_id: currentUserId,
          following_id: profile.id,
        })
        router.refresh()
      }
    }
  }

  return (
    <div className="px-5 pt-6 pb-5">
      {/* Avatar (left) + Name/Username (right) */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <div className="relative flex-shrink-0">
          <div className="absolute -inset-0.5 rounded-full opacity-60 blur-[2px]"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }} />
          <Avatar src={profile.avatar_url} username={profile.username} size="xl" className="relative" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="text-base font-bold leading-snug" style={{ color: 'var(--text)' }}>
              {profile.display_name ?? profile.username}
            </h1>
            {profile.style_id && STYLE_TYPES[profile.style_id as StyleId] && (
              <Link
                href={`/cosmo/${profile.style_id}`}
                className="flex-shrink-0 transition-opacity active:opacity-70"
              >
                <StyleAlien styleId={profile.style_id as StyleId} size={24} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats: full-width, 3 equal columns */}
      <div className="grid grid-cols-3 text-center mb-3">
        <Stat value={postsCount} label="投稿" />
        <Link href={`/profile/${profile.username}/followers`} className="flex flex-col items-center active:opacity-70">
          <span className="text-base font-bold" style={{ color: 'var(--text)' }}>{followersCount}</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>フォロワー</span>
        </Link>
        <Link href={`/profile/${profile.username}/following`} className="flex flex-col items-center active:opacity-70">
          <span className="text-base font-bold" style={{ color: 'var(--text)' }}>{profile.following_count}</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>フォロー</span>
        </Link>
      </div>

      {profile.bio && (
        <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-sub)' }}>{profile.bio}</p>
      )}

      {profile.style_tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {profile.style_tags.map((tag: string) => (
            <span
              key={tag}
              className="px-3 py-1 text-xs font-medium rounded-full"
              style={{ color: 'var(--tag-text)', background: 'var(--tag-bg)', border: '1px solid var(--tag-border)' }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {isOwner ? (
        <Link
          href="/profile/edit"
          className="w-full flex items-center justify-center h-9 rounded-xl border text-sm font-medium"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text-sub)',
            transform: editPressing ? 'scale(0.95)' : 'scale(1)',
            transition: 'transform 150ms ease-out',
          }}
          onPointerDown={() => setEditPressing(true)}
          onPointerUp={() => setEditPressing(false)}
          onPointerLeave={() => setEditPressing(false)}
        >
          プロフィールを編集
        </Link>
      ) : currentUserId && (
        <div className="flex gap-2">
          <div className="relative flex-1" style={{ overflow: 'visible' }}>
            <button
              onClick={toggleFollow}
              disabled={loading}
              className="w-full h-9 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              style={
                followState === 'following'
                  ? { background: 'var(--bg-subtle)', color: 'var(--text-sub)', border: '1px solid var(--border)' }
                  : followState === 'pending'
                  ? { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                  : { background: 'var(--purple-glow)', color: '#fff' }
              }
            >
              {followState === 'following' ? 'フォロー中' : followState === 'pending' ? '承認待ち' : isFollowedBy ? 'フォローバック' : 'フォローする'}
            </button>
            {sparkling && (
              <div ref={starsRef} className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible', zIndex: 50 }}>
                {Array.from({ length: STAR_COUNT }).map((_, i) => (
                  <span
                    key={i}
                    className="absolute top-1/2 left-1/2 select-none text-sm"
                    style={{ color: i % 2 === 0 ? 'var(--purple)' : '#E9D5FF' }}
                  >
                    ★
                  </span>
                ))}
              </div>
            )}
          </div>
          {isMutualFollow && (
            <StartDmButton
              targetUserId={profile.id}
              currentUserId={currentUserId!}
              className="flex-1"
            />
          )}
        </div>
      )}

      {/* フォロー解除確認モーダル */}
      {showUnfollowModal && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowUnfollowModal(false)}
        >
          <div
            className="w-full rounded-t-2xl px-4 pt-5 pb-8"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-center text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
              フォロワーからも削除しますか？
            </p>
            <p className="text-center text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
              {profile.display_name ?? profile.username} さんはあなたをフォローしています
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => doUnfollow(true)}
                className="w-full h-11 rounded-xl text-sm font-semibold"
                style={{ background: '#EF4444', color: '#fff' }}
              >
                削除する
              </button>
              <button
                onClick={() => doUnfollow(false)}
                className="w-full h-11 rounded-xl text-sm font-medium"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
              >
                しない
              </button>
              <button
                onClick={() => setShowUnfollowModal(false)}
                className="w-full h-11 rounded-xl text-sm font-medium"
                style={{ color: 'var(--text-muted)' }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-base font-bold" style={{ color: 'var(--text)' }}>{value}</span>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}
