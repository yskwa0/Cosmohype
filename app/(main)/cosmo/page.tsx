import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { StyleAlien } from '@/components/style-id/StyleAlien'
import { Avatar } from '@/components/ui/Avatar'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import { createClient } from '@/lib/supabase/server'
import type { StyleId } from '@/lib/style-id/types'
import type { Profile } from '@/types/database'

const ALL_STYLES = Object.values(STYLE_TYPES)

type StyleUser = Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'followers_count'>

export default async function CosmoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let myStyleId: string | null = null
  let sameStyleUsers: StyleUser[] = []

  if (user) {
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('style_id')
      .eq('id', user.id)
      .single()

    myStyleId = myProfile?.style_id ?? null

    if (myStyleId) {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, followers_count')
        .eq('style_id', myStyleId)
        .eq('is_private', false)
        .neq('id', user.id)
        .order('followers_count', { ascending: false })
        .limit(5)

      sameStyleUsers = (users ?? []) as StyleUser[]
    }
  }

  return (
    <>
      <TopBar title="COSMO" left={<BackButton href="/contents" />} />

      {/* Hero */}
      <div className="px-5 pt-7 pb-1 text-center">
        <p
          className="text-[10px] font-bold tracking-widest uppercase mb-2"
          style={{ color: 'var(--purple)' }}
        >
          STYLE ID DISCOVERY
        </p>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
          スタイルから探す
        </h1>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          気になるSTYLE IDをタップして、<br />同じスタイルの人や投稿を見てみよう。
        </p>
      </div>

      {/* あなたと同じSTYLE IDの人 */}
      {user && (
        <div className="px-5 pt-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            あなたと同じSTYLE IDの人
          </p>

          {!myStyleId ? (
            /* STYLE ID未診断 */
            <Link
              href="/style-id"
              className="flex items-center gap-4 rounded-2xl px-4 py-4 transition-opacity active:opacity-75"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--purple-dim)', border: '1px solid var(--border)' }}
              >
                <span className="text-lg">✨</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  STYLE ID診断をする
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  診断すると同じスタイルの人が見つかります
                </p>
              </div>
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ) : sameStyleUsers.length === 0 ? (
            /* 同じスタイルのユーザーが0人 */
            <div
              className="rounded-2xl px-4 py-5 flex flex-col items-center gap-1.5"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              <StyleAlien styleId={myStyleId as StyleId} size={48} />
              <p className="text-sm font-medium mt-1" style={{ color: 'var(--text)' }}>
                まだ同じスタイルの人がいません
              </p>
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                あなたが最初の{STYLE_TYPES[myStyleId as StyleId]?.name}かもしれません
              </p>
            </div>
          ) : (
            /* ユーザーリスト */
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {sameStyleUsers.map((u, i) => (
                <Link
                  key={u.id}
                  href={`/profile/${u.username}`}
                  className="flex items-center gap-3 px-4 py-3 transition-opacity active:opacity-75"
                  style={{
                    background: 'var(--bg-elevated)',
                    borderTop: i > 0 ? '1px solid var(--border)' : undefined,
                  }}
                >
                  <Avatar src={u.avatar_url} username={u.username} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                      {u.display_name ?? u.username}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      @{u.username}
                    </p>
                  </div>
                  <p className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {u.followers_count.toLocaleString()} フォロワー
                  </p>
                </Link>
              ))}
              <Link
                href={`/cosmo/${myStyleId}`}
                className="flex items-center justify-center gap-1.5 py-3 transition-opacity active:opacity-75"
                style={{
                  background: 'var(--bg-elevated)',
                  borderTop: '1px solid var(--border)',
                  color: 'var(--purple)',
                }}
              >
                <span className="text-xs font-semibold">もっと見る</span>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="px-4 pt-5 pb-6 grid grid-cols-2 gap-3">
        {ALL_STYLES.map(s => (
          <StyleCard key={s.id} style={s} />
        ))}
      </div>
    </>
  )
}

function StyleCard({ style }: { style: typeof ALL_STYLES[number] }) {
  return (
    <Link
      href={`/cosmo/${style.id}`}
      className="block active:opacity-75 transition-opacity duration-75"
    >
      <div
        className="rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
        }}
      >
        {/* グラデーションライン */}
        <div className="h-[3px] flex-shrink-0" style={{ background: style.gradient }} />

        <div className="flex flex-col items-center gap-2.5 px-3 pt-4 pb-4">
          {/* キャラクター */}
          <StyleAlien styleId={style.id as StyleId} size={80} />

          {/* テキスト */}
          <div className="text-center">
            <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text)' }}>
              {style.name}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {style.subtitle}
            </p>
          </div>

          {/* トレイトチップ */}
          <div className="flex flex-wrap gap-1 justify-center">
            {style.traits.slice(0, 2).map(t => (
              <span
                key={t}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{
                  background: 'var(--purple-dim)',
                  color: 'var(--purple)',
                  border: '1px solid var(--border)',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  )
}
