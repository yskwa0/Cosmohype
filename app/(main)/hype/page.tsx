import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { createClient } from '@/lib/supabase/server'
import { HypeRankCard } from '@/components/hype/HypeRankCard'
import type { RankEntry } from '@/components/hype/HypeRankCard'
import { getTodayHypeTheme } from '@/lib/hypeThemes'

const { slug: THEME_SLUG, label: THEME } = getTodayHypeTheme()

export default async function HypePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: rawPosts } = await supabase
    .from('posts')
    .select(`
      id,
      caption,
      profiles!inner ( username, style_id, avatar_url, is_private ),
      post_images ( url, display_order )
    `)
    .eq('hype_theme', THEME_SLUG)
    .eq('profiles.is_private', false)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(20)

  const postIds = (rawPosts ?? []).map(p => p.id)

  const [{ data: allLikes }, { data: likedData }] = await Promise.all([
    postIds.length > 0
      ? supabase.from('likes').select('post_id').in('post_id', postIds)
      : Promise.resolve({ data: [] }),
    user
      ? supabase.from('likes').select('post_id').eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
  ])

  // likesテーブルから正確な件数を集計
  const likeCountMap = (allLikes ?? []).reduce<Map<string, number>>((map, like) => {
    map.set(like.post_id, (map.get(like.post_id) ?? 0) + 1)
    return map
  }, new Map())

  const likedPostIds = new Set((likedData ?? []).map((l: { post_id: string }) => l.post_id))

  const ranking: RankEntry[] = (rawPosts ?? [])
    .map((post) => {
      const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
      const images = Array.isArray(post.post_images) ? post.post_images : []
      const firstImage = [...images].sort((a, b) => a.display_order - b.display_order)[0]
      return {
        rank: 0,
        postId: post.id,
        username: profile?.username ?? '不明',
        styleId: profile?.style_id ?? null,
        caption: post.caption,
        likes: likeCountMap.get(post.id) ?? 0,
        imageUrl: firstImage?.url ?? null,
        avatarUrl: profile?.avatar_url ?? null,
        isLiked: likedPostIds.has(post.id),
      }
    })
    .sort((a, b) => b.likes - a.likes)
    .map((entry, i) => ({ ...entry, rank: i + 1 }))

  const totalLikes = ranking.reduce((sum, r) => sum + r.likes, 0)

  return (
    <div className="feed-animate-in">
      <TopBar title="今日のHYPE" left={<BackButton variant="purple" />} />

      <div className="flex flex-col pb-24">
        {/* Hero */}
        <div className="px-4 pt-5 pb-6">
          <div
            className="relative rounded-3xl overflow-hidden px-5 py-6"
            style={{ background: 'linear-gradient(135deg, #1C0030 0%, #7C1D6F 50%, #EC4899 100%)' }}
          >
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 360 180" preserveAspectRatio="xMidYMid slice" aria-hidden>
              {[
                [30, 20], [90, 55], [150, 15], [210, 70], [270, 25], [330, 60],
                [350, 18], [60, 90], [180, 45], [300, 90], [140, 140], [240, 155],
              ].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.5 : 1} fill="white" opacity={0.15 + (i % 4) * 0.08} />
              ))}
            </svg>

            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <svg viewBox="0 0 60 60" width={18} height={18} aria-hidden>
                  <line x1={30} y1={6} x2={30} y2={15} stroke="white" strokeWidth={2} strokeLinecap="round" opacity={0.8} />
                  <line x1={30} y1={45} x2={30} y2={54} stroke="white" strokeWidth={2} strokeLinecap="round" opacity={0.8} />
                  <line x1={6} y1={30} x2={15} y2={30} stroke="white" strokeWidth={2} strokeLinecap="round" opacity={0.8} />
                  <line x1={45} y1={30} x2={54} y2={30} stroke="white" strokeWidth={2} strokeLinecap="round" opacity={0.8} />
                  <line x1={13} y1={13} x2={19} y2={19} stroke="white" strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
                  <line x1={41} y1={41} x2={47} y2={47} stroke="white" strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
                  <line x1={47} y1={13} x2={41} y2={19} stroke="white" strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
                  <line x1={13} y1={47} x2={19} y2={41} stroke="white" strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
                  <path d="M30 13 L44 30 L30 47 L16 30Z" fill="#FBCFE8" opacity={0.9} />
                  <path d="M30 21 L38 30 L30 39 L22 30Z" fill="white" opacity={0.95} />
                  <circle cx={30} cy={30} r={4.5} fill="#EC4899" />
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(249,168,212,0.9)' }}>
                  TODAY&apos;S HYPE
                </span>
              </div>

              <h1 className="text-2xl font-black text-white mb-2 leading-tight">{THEME}</h1>

              <p className="text-[13px] mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
                今日のテーマに参加したコーデを、いいね数順でチェックしよう
              </p>

              <div className="flex items-center gap-3 mb-5">
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {ranking.length}件参加中
                </span>
                <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  計{totalLikes}いいね
                </span>
              </div>

              <Link
                href={`/post/new?hype=${THEME_SLUG}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-opacity active:opacity-70"
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(8px)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.28)',
                }}
              >
                このテーマで投稿する
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Ranking */}
        <div className="px-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            ランキング
          </h2>
          {ranking.length === 0 ? (
            <p className="text-sm text-center py-12" style={{ color: 'var(--text-muted)' }}>
              まだ投稿がありません。最初に投稿してみよう！
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {ranking.map(entry => (
                <HypeRankCard key={entry.postId} entry={entry} userId={user?.id ?? null} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
