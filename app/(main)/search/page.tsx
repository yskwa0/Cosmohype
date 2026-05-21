import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { Avatar } from '@/components/ui/Avatar'
import { PostCard } from '@/components/post/PostCard'
import { FollowButton } from '@/components/profile/FollowButton'
import { SearchInput } from '@/components/search/SearchInput'
import { SearchHistory } from '@/components/search/SearchHistory'
import Link from 'next/link'
import type { Post, Profile } from '@/types/database'
import { getTodayHypeTheme } from '@/lib/hypeThemes'

export const dynamic = 'force-dynamic'

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const query = q?.trim() ?? ''

  if (query.length === 0) {
    return <DiscoverView userId={user.id} />
  }

  let users: Profile[] = []
  let posts: Post[] = []
  let likedPostIds = new Set<string>()
  let savedPostIds = new Set<string>()

  const [usersResult, postsByTag, postsByCaption, likedData, savedData] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq('id', user.id)
      .order('followers_count', { ascending: false })
      .limit(10),
    supabase
      .from('posts')
      .select('*, profiles(*), post_images(*)')
      .contains('tags', [query])
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('posts')
      .select('*, profiles(*), post_images(*)')
      .ilike('caption', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('likes').select('post_id').eq('user_id', user.id),
    supabase.from('saved_posts').select('post_id').eq('user_id', user.id),
  ])

  users = (usersResult.data ?? []) as Profile[]

  const postMap = new Map<string, Post>()
  for (const p of [...(postsByTag.data ?? []), ...(postsByCaption.data ?? [])]) {
    postMap.set(p.id, p as Post)
  }
  posts = Array.from(postMap.values())
  likedPostIds = new Set((likedData.data ?? []).map(l => l.post_id))
  savedPostIds = new Set((savedData.data ?? []).map(s => s.post_id))

  return (
    <>
      <TopBar title="検索" />
      <div className="px-4 pt-4 pb-3 sticky top-14 z-40" style={{ background: 'var(--bg)' }}>
        <SearchInput defaultValue={query} />
      </div>

      {users.length === 0 && posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'var(--purple-dim)', border: '1px solid var(--border)' }}>
            <svg viewBox="0 0 24 24" className="w-10 h-10" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>「{query}」の結果なし</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>別のキーワードで試してください</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 pb-4">
          {users.length > 0 && (
            <section>
              <h2 className="px-4 pt-2 pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                ユーザー
              </h2>
              <div className="flex flex-col">
                {users.map(u => (
                  <Link
                    key={u.id}
                    href={`/profile/${u.username}`}
                    className="flex items-center gap-3 px-4 py-3 active:opacity-70 transition-opacity"
                  >
                    <Avatar src={u.avatar_url} username={u.username} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
                        {u.display_name ?? u.username}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        @{u.username} · フォロワー {u.followers_count}
                      </p>
                    </div>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {posts.length > 0 && (
            <section>
              <h2 className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                投稿
              </h2>
              <div className="flex flex-col gap-3">
                {posts.map(p => (
                  <PostCard
                    key={p.id}
                    post={p}
                    userId={user.id}
                    isLiked={likedPostIds.has(p.id)}
                    isSaved={savedPostIds.has(p.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  )
}

async function DiscoverView({ userId }: { userId: string }) {
  const supabase = await createClient()

  const [profileResult, followingResult] = await Promise.all([
    supabase.from('profiles').select('style_tags').eq('id', userId).single(),
    supabase.from('follows').select('following_id').eq('follower_id', userId),
  ])

  const myTags: string[] = profileResult.data?.style_tags ?? []
  const followingIds = new Set((followingResult.data ?? []).map(f => f.following_id))
  followingIds.add(userId)

  const { data: candidates } = await supabase
    .from('profiles')
    .select('*')
    .not('id', 'in', `(${[...followingIds].join(',')})`)
    .eq('is_private', false)
    .order('followers_count', { ascending: false })
    .limit(30)

  const allUsers = (candidates ?? []) as Profile[]

  const similar = myTags.length > 0
    ? allUsers
        .map(u => ({ user: u, score: u.style_tags.filter(t => myTags.includes(t)).length }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map(({ user }) => user)
    : []

  return (
    <>
      <TopBar title="発見" />
      <div className="px-4 pt-4 pb-3 sticky top-14 z-40" style={{ background: 'var(--bg)' }}>
        <SearchInput defaultValue="" />
      </div>

      <div className="flex flex-col gap-6 pb-4">
        <SearchHistory />

        {similar.length > 0 && (
          <section>
            <h2 className="px-4 pt-2 pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              スタイルが似たユーザー
            </h2>
            <div className="flex flex-col">
              {similar.map(u => (
                <UserRow key={u.id} user={u} userId={userId} myTags={myTags} showTags />
              ))}
            </div>
          </section>
        )}

        {allUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'var(--purple-dim)', border: '1px solid var(--border)' }}>
              <svg viewBox="0 0 24 24" className="w-10 h-10" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.75 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>おすすめユーザーがいません</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>まだユーザーが少ないようです</p>
          </div>
        )}

        <StyleIdBanner />
        <CosmoBanner />
        <HypeBanner />
      </div>
    </>
  )
}

function StyleIdBanner() {
  return (
    <section className="px-4 pt-2 pb-6">
      <h2 className="pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        診断
      </h2>
      <Link href="/style-id" className="block active:opacity-80 transition-opacity">
        <div
          className="relative rounded-3xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1A0844 0%, #5B21B6 45%, #A855F7 100%)' }}
        >
          {/* 星の装飾 */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 360 110" preserveAspectRatio="xMidYMid slice" aria-hidden>
            {[
              [30, 20], [80, 55], [130, 15], [200, 70], [250, 25], [310, 60], [340, 18],
              [55, 85], [175, 40], [290, 90], [150, 85], [320, 40],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.5 : 1} fill="white" opacity={0.25 + (i % 4) * 0.1} />
            ))}
          </svg>

          <div className="relative flex items-center gap-4 px-5 py-5">
            {/* アイコン */}
            <div
              className="w-[60px] h-[60px] rounded-2xl flex-shrink-0 flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
            >
              <svg viewBox="0 0 60 60" width={40} height={40} aria-hidden>
                {/* 宇宙人シルエット */}
                <ellipse cx={30} cy={26} rx={13} ry={14} fill="#E9D5FF" />
                <ellipse cx={30} cy={42} rx={9} ry={5} fill="#C4B5FD" opacity={0.6} />
                <line x1={22} y1={14} x2={18} y2={8} stroke="#C4B5FD" strokeWidth={1.5} strokeLinecap="round" />
                <circle cx={18} cy={7} r={2} fill="#A855F7" />
                <line x1={38} y1={14} x2={42} y2={8} stroke="#C4B5FD" strokeWidth={1.5} strokeLinecap="round" />
                <circle cx={42} cy={7} r={2} fill="#A855F7" />
                <ellipse cx={24} cy={27} rx={3} ry={3.5} fill="#7C3AED" />
                <ellipse cx={36} cy={27} rx={3} ry={3.5} fill="#7C3AED" />
                <ellipse cx={24} cy={27} rx={1.5} ry={2} fill="white" opacity={0.9} />
                <ellipse cx={36} cy={27} rx={1.5} ry={2} fill="white" opacity={0.9} />
                <path d="M25 34 Q30 37 35 34" stroke="#7C3AED" strokeWidth={1.2} fill="none" strokeLinecap="round" />
                {/* 星 */}
                <text x={48} y={20} fontSize={10} fill="#FCD34D">✦</text>
              </svg>
            </div>

            {/* テキスト */}
            <div className="flex-1 min-w-0">
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'rgba(196,181,253,0.8)' }}
              >
                STYLE ID診断
              </span>
              <h3 className="text-white font-bold text-[15px] leading-snug mt-0.5">
                あなたのスタイルタイプ<br />を診断してみよう
              </h3>
              <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                8問・約1分で自分のスタイルがわかる
              </p>
            </div>

            {/* 矢印 */}
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.18)' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </div>
        </div>
      </Link>
    </section>
  )
}

function HypeBanner() {
  const { label: theme } = getTodayHypeTheme()
  return (
    <section className="px-4 pb-6">
      <h2 className="pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        HYPE
      </h2>
      <Link href="/hype" className="block active:opacity-80 transition-opacity">
        <div
          className="relative rounded-3xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1C0030 0%, #7C1D6F 50%, #EC4899 100%)' }}
        >
          {/* 星の装飾 */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 360 110" preserveAspectRatio="xMidYMid slice" aria-hidden>
            {[
              [25, 18], [90, 60], [145, 12], [195, 75], [245, 28], [305, 55], [345, 22],
              [60, 88], [170, 42], [285, 88], [140, 88], [325, 38],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.5 : 1} fill="white" opacity={0.2 + (i % 4) * 0.1} />
            ))}
          </svg>

          <div className="relative flex items-center gap-4 px-5 py-5">
            {/* アイコン */}
            <div
              className="w-[60px] h-[60px] rounded-2xl flex-shrink-0 flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
            >
              <svg viewBox="0 0 60 60" width={40} height={40} aria-hidden>
                {/* 放射線 */}
                <line x1={30} y1={6} x2={30} y2={15} stroke="white" strokeWidth={2} strokeLinecap="round" opacity={0.75} />
                <line x1={30} y1={45} x2={30} y2={54} stroke="white" strokeWidth={2} strokeLinecap="round" opacity={0.75} />
                <line x1={6} y1={30} x2={15} y2={30} stroke="white" strokeWidth={2} strokeLinecap="round" opacity={0.75} />
                <line x1={45} y1={30} x2={54} y2={30} stroke="white" strokeWidth={2} strokeLinecap="round" opacity={0.75} />
                <line x1={13} y1={13} x2={19} y2={19} stroke="white" strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
                <line x1={41} y1={41} x2={47} y2={47} stroke="white" strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
                <line x1={47} y1={13} x2={41} y2={19} stroke="white" strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
                <line x1={13} y1={47} x2={19} y2={41} stroke="white" strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
                {/* 外側ダイヤ */}
                <path d="M30 13 L44 30 L30 47 L16 30Z" fill="#FBCFE8" opacity={0.9} />
                {/* 内側ダイヤ */}
                <path d="M30 21 L38 30 L30 39 L22 30Z" fill="white" opacity={0.95} />
                {/* 中心 */}
                <circle cx={30} cy={30} r={4.5} fill="#EC4899" />
              </svg>
            </div>

            {/* テキスト */}
            <div className="flex-1 min-w-0">
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'rgba(249,168,212,0.85)' }}
              >
                今日のHYPE
              </span>
              <h3 className="text-white font-bold text-[15px] leading-snug mt-0.5">
                {theme}
              </h3>
              <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                今日のテーマでコーデを投稿してみよう
              </p>
            </div>

            {/* 矢印 */}
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.18)' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </div>
        </div>
      </Link>
    </section>
  )
}

function CosmoBanner() {
  return (
    <section className="px-4 pb-6">
      <h2 className="pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        COSMO
      </h2>
      <Link href="/cosmo" className="block active:opacity-80 transition-opacity">
        <div
          className="relative rounded-3xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0F0A2E 0%, #1E1B4B 50%, #4C1D95 100%)' }}
        >
          {/* 星の装飾 */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 360 110" preserveAspectRatio="xMidYMid slice" aria-hidden>
            {[
              [20, 30], [70, 10], [120, 75], [180, 20], [230, 80], [280, 30], [350, 65],
              [45, 65], [160, 55], [260, 12], [310, 85], [90, 90],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.5 : 1} fill="white" opacity={0.2 + (i % 4) * 0.1} />
            ))}
            {/* 軌道リング */}
            <ellipse cx={55} cy={55} rx={28} ry={18} fill="none" stroke="rgba(167,139,250,0.15)" strokeWidth={1} />
          </svg>

          <div className="relative flex items-center gap-4 px-5 py-5">
            {/* アイコン */}
            <div
              className="w-[60px] h-[60px] rounded-2xl flex-shrink-0 flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(8px)' }}
            >
              <svg viewBox="0 0 60 60" width={40} height={40} aria-hidden>
                {/* 中央の惑星 */}
                <circle cx={30} cy={30} r={10} fill="#7C3AED" opacity={0.9} />
                <ellipse cx={30} cy={30} rx={18} ry={6} fill="none" stroke="#A78BFA" strokeWidth={1.2} opacity={0.7} />
                {/* 周回する点（ユーザー） */}
                <circle cx={30} cy={12} r={3} fill="#E9D5FF" />
                <circle cx={48} cy={30} r={2.5} fill="#C4B5FD" />
                <circle cx={30} cy={48} r={2.5} fill="#DDD6FE" />
                <circle cx={12} cy={30} r={2} fill="#A78BFA" />
                {/* 星 */}
                <text x={44} y={16} fontSize={9} fill="#FCD34D">✦</text>
              </svg>
            </div>

            {/* テキスト */}
            <div className="flex-1 min-w-0">
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'rgba(167,139,250,0.8)' }}
              >
                STYLE ID DISCOVERY
              </span>
              <h3 className="text-white font-bold text-[15px] leading-snug mt-0.5">
                同じスタイルの仲間を<br />探してみよう
              </h3>
              <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                STYLE IDで絞って、感覚の合う人を見つけよう
              </p>
            </div>

            {/* 矢印 */}
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </div>
        </div>
      </Link>
    </section>
  )
}

function UserRow({ user, userId, myTags, showTags }: {
  user: Profile
  userId: string
  myTags: string[]
  showTags: boolean
}) {
  const matchingTags = showTags ? user.style_tags.filter(t => myTags.includes(t)) : []

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Link href={`/profile/${user.username}`} className="flex items-center gap-3 flex-1 min-w-0 active:opacity-70 transition-opacity">
        <Avatar src={user.avatar_url} username={user.username} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
            {user.display_name ?? user.username}
          </p>
          {matchingTags.length > 0 ? (
            <p className="text-xs truncate" style={{ color: 'var(--purple)' }}>
              {matchingTags.join(' · ')}
            </p>
          ) : (
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              @{user.username} · フォロワー {user.followers_count}
            </p>
          )}
        </div>
      </Link>
      <div className="w-24 flex-shrink-0">
        <FollowButton followerId={userId} followingId={user.id} initialFollowing={false} />
      </div>
    </div>
  )
}
