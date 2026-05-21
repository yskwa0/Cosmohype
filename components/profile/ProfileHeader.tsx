'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { LogoutButton } from './LogoutButton'
import { StyleAlien } from '@/components/style-id/StyleAlien'
import { StartDmButton } from '@/components/dm/StartDmButton'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import type { Profile } from '@/types/database'
import type { StyleId } from '@/lib/style-id/types'

interface Props {
  profile: Profile
  postsCount: number
  isOwner: boolean
  currentUserId?: string
  initialFollowing: boolean
}

const STAR_COUNT = 8

export function ProfileHeader({ profile, postsCount, isOwner, currentUserId, initialFollowing }: Props) {
  const [following, setFollowing] = useState(initialFollowing)
  const [followersCount, setFollowersCount] = useState(profile.followers_count)
  const [loading, setLoading] = useState(false)
  const [sparkling, setSparkling] = useState(false)
  const starsRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

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

  async function toggleFollow() {
    if (!currentUserId) return
    setLoading(true)
    const next = !following
    setFollowing(next)
    setFollowersCount(c => next ? c + 1 : c - 1)

    if (next) {
      setSparkling(true)
      setTimeout(() => setSparkling(false), 700)
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: profile.id })
    } else {
      await supabase.from('follows').delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', profile.id)
    }
    setLoading(false)
  }

  return (
    <div className="px-5 pt-6 pb-5">
      <div className="flex items-center gap-5 mb-4">
        <div className="relative">
          <div className="absolute -inset-0.5 rounded-full opacity-60 blur-[2px]"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }} />
          <Avatar src={profile.avatar_url} username={profile.username} size="xl" className="relative" />
        </div>
        <div className="flex gap-6">
          <Stat value={postsCount} label="投稿" />
          <Stat value={followersCount} label="フォロワー" />
          <Stat value={profile.following_count} label="フォロー" />
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center gap-1.5">
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
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>@{profile.username}</p>
        {profile.bio && (
          <p className="text-sm leading-relaxed mt-2" style={{ color: 'var(--text-sub)' }}>{profile.bio}</p>
        )}
      </div>

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
        <div className="flex flex-col gap-2">
          <Link
            href="/profile/edit"
            className="w-full flex items-center justify-center h-9 rounded-xl border text-sm font-medium transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-sub)' }}
          >
            プロフィールを編集
          </Link>
          <LogoutButton />
        </div>
      ) : currentUserId && (
        <div className="flex gap-2">
          <div className="relative flex-1" style={{ overflow: 'visible' }}>
            <button
              onClick={toggleFollow}
              disabled={loading}
              className="w-full h-9 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              style={following
                ? { background: 'var(--bg-subtle)', color: 'var(--text-sub)', border: '1px solid var(--border)' }
                : { background: 'var(--purple-glow)', color: '#fff' }
              }
            >
              {following ? 'フォロー中' : 'フォローする'}
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
          <StartDmButton
            targetUserId={profile.id}
            currentUserId={currentUserId}
            className="flex-1"
          />
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
