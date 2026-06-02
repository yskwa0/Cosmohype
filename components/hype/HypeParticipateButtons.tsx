'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Props = {
  themeSlug: string
  userId: string | null
  initialParticipated: boolean
  initialParticipationCount: number
  photoCount: number
}

export function HypeParticipateButtons({
  themeSlug,
  userId,
  initialParticipated,
  initialParticipationCount,
  photoCount,
}: Props) {
  const [participated, setParticipated] = useState(initialParticipated)
  const [count, setCount] = useState(initialParticipationCount)
  const [loading, setLoading] = useState(false)

  async function participate() {
    if (!userId || participated || loading) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('hype_participations')
        .insert({ user_id: userId, hype_theme: themeSlug })
      if (!error) {
        setParticipated(true)
        setCount(c => c + 1)
      } else if (error.code === '23505') {
        // UNIQUE violation → already participated
        setParticipated(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 参加人数 */}
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {count === 0
            ? '今日のHYPE、参加受付中'
            : <>{count}<span className="font-normal" style={{ color: 'rgba(255,255,255,0.5)' }}>人が参加中</span></>
          }
        </p>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {photoCount === 0
            ? '写真で残すと、みんなのHYPEに表示されます'
            : `${photoCount}人が写真で残しました`
          }
        </p>
      </div>

      {/* ボタン */}
      <div className="flex gap-2">
        {/* 私もやってる */}
        <button
          onClick={participate}
          disabled={participated || loading || !userId}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-opacity active:opacity-70 disabled:cursor-default"
          style={participated ? {
            background: 'rgba(134,239,172,0.15)',
            border: '1px solid rgba(134,239,172,0.35)',
            color: '#86EFAC',
          } : {
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.22)',
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          {participated ? (
            <>
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              参加済み
            </>
          ) : loading ? (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
              <path d="M11 2a9 9 0 019 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="currentColor">
                <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777zM2.331 10.977a11.969 11.969 0 00-.831 4.398 12 12 0 00.52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 01-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227z" />
              </svg>
              私もやってる
            </>
          )}
        </button>

        {/* 写真で残す */}
        <Link
          href={`/post/new?hype=${themeSlug}`}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-opacity active:opacity-70"
          style={{
            background: 'rgba(236,72,153,0.2)',
            border: '1px solid rgba(236,72,153,0.4)',
            color: '#FBCFE8',
          }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
          </svg>
          写真で残す
        </Link>
      </div>
    </div>
  )
}
