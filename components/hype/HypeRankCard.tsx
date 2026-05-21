'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StyleAlien } from '@/components/style-id/StyleAlien'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import type { StyleId } from '@/lib/style-id/types'

const FALLBACK_GRADIENT = 'linear-gradient(135deg, #111827 0%, #374151 50%, #1f2937 100%)'

const RANK_ACCENT: Record<number, string> = {
  1: '#F59E0B',
  2: '#94A3B8',
  3: '#CD7C3E',
}

export type RankEntry = {
  rank: number
  postId: string
  username: string
  styleId: string | null
  caption: string | null
  likes: number
  imageUrl: string | null
  avatarUrl: string | null
  isLiked: boolean
}

export function HypeRankCard({ entry, userId }: { entry: RankEntry; userId: string | null }) {
  const [liked, setLiked] = useState(entry.isLiked)
  const [likeCount, setLikeCount] = useState(entry.likes)
  const supabase = createClient()

  const accent = RANK_ACCENT[entry.rank]
  const isTop = entry.rank === 1
  const isTop3 = entry.rank <= 3
  const styleType = entry.styleId ? STYLE_TYPES[entry.styleId as StyleId] : null
  const validStyleId = entry.styleId && styleType ? (entry.styleId as StyleId) : null

  async function toggleLike() {
    if (!userId) return
    const next = !liked
    setLiked(next)
    setLikeCount(c => next ? c + 1 : c - 1)
    try {
      if (next) {
        const { error } = await supabase.from('likes').insert({ user_id: userId, post_id: entry.postId })
        if (error) throw error
      } else {
        const { error } = await supabase.from('likes').delete().eq('user_id', userId).eq('post_id', entry.postId)
        if (error) throw error
      }
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', entry.postId)
      if (count !== null) setLikeCount(count)
    } catch {
      setLiked(!next)
      setLikeCount(c => next ? c - 1 : c + 1)
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--bg-elevated)',
        border: `1px solid ${isTop ? 'rgba(245,158,11,0.5)' : isTop3 ? 'rgba(236,72,153,0.2)' : 'var(--border)'}`,
        boxShadow: isTop
          ? '0 0 40px rgba(245,158,11,0.22), 0 0 0 1px rgba(245,158,11,0.14), 0 4px 24px rgba(245,158,11,0.1)'
          : undefined,
      }}
    >
      {/* 1位 Champion バナー */}
      {isTop && (
        <div
          className="flex items-center justify-center gap-2 py-2.5"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.22) 50%, transparent 100%)',
            borderBottom: '1px solid rgba(245,158,11,0.35)',
          }}
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#F59E0B">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <span className="text-[11px] font-black tracking-[0.2em] uppercase" style={{ color: '#FDE68A' }}>
            No.1 Champion
          </span>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#F59E0B">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>
      )}

      {/* 投稿画像エリア（タップで投稿へ） */}
      <Link href={`/post/${entry.postId}`} className="block">
        <div
          className="relative w-full"
          style={{
            height: isTop ? 240 : 180,
            background: entry.imageUrl ? undefined : FALLBACK_GRADIENT,
          }}
        >
          {entry.imageUrl ? (
            <Image
              src={entry.imageUrl}
              alt={entry.caption ?? 'コーデ画像'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 600px"
            />
          ) : (
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 360 240" preserveAspectRatio="xMidYMid slice" aria-hidden>
              {[
                [20, 30], [80, 60], [160, 20], [240, 55], [310, 25], [340, 70],
                [50, 120], [130, 100], [200, 130], [280, 90], [120, 180], [250, 160],
              ].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 1.5 : 0.8} fill="white" opacity={0.12 + (i % 3) * 0.06} />
              ))}
            </svg>
          )}

          {/* 順位バッジ（2位以降） */}
          {!isTop && (
            <div
              className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
              style={{
                background: 'rgba(0,0,0,0.5)',
                color: accent ?? 'rgba(255,255,255,0.6)',
                border: `1.5px solid ${accent ? `${accent}99` : 'rgba(255,255,255,0.2)'}`,
                backdropFilter: 'blur(6px)',
              }}
            >
              {entry.rank}
            </div>
          )}
        </div>
      </Link>

      {/* 情報エリア */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          {/* アバター → プロフィールへ */}
          <Link href={`/profile/${entry.username}`} className="flex items-center gap-2 flex-1 min-w-0 transition-opacity active:opacity-70">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden flex items-center justify-center"
              style={{ background: 'var(--purple-dim)', border: `1px solid ${isTop ? 'rgba(245,158,11,0.3)' : 'rgba(124,58,237,0.2)'}` }}
            >
              {entry.avatarUrl ? (
                <Image src={entry.avatarUrl} alt={entry.username} width={40} height={40} className="object-cover w-full h-full" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="rgba(167,139,250,0.6)" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              )}
            </div>

            {validStyleId && (
              <div className="flex-shrink-0">
                <StyleAlien styleId={validStyleId} size={40} />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: isTop ? '#FDE68A' : 'var(--text)' }}>
                @{entry.username}
              </p>
              {entry.caption && (
                <p className="text-[12px] leading-relaxed line-clamp-1 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {entry.caption}
                </p>
              )}
            </div>
          </Link>

          {/* いいねボタン */}
          <button
            onClick={toggleLike}
            disabled={!userId}
            className="flex-shrink-0 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-opacity active:opacity-60"
            style={{ background: liked ? 'rgba(236,72,153,0.12)' : 'transparent' }}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 transition-colors"
              fill={liked ? '#EC4899' : 'none'}
              stroke={liked ? '#EC4899' : 'rgba(255,255,255,0.4)'}
              strokeWidth={liked ? 0 : 1.8}
            >
              <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            <span
              className="text-[11px] font-bold leading-none"
              style={{ color: liked ? '#F9A8D4' : 'rgba(255,255,255,0.5)' }}
            >
              {likeCount}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
