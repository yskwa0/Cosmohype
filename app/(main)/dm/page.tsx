import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { Avatar } from '@/components/ui/Avatar'
import { AccountBadges } from '@/components/ui/AccountBadges'
import { formatRelativeTime } from '@/lib/utils'
import { DmPageShell } from '@/components/layout/DmPageShell'

type OtherParticipantRow = {
  conversation_id: string
  profiles: {
    username: string
    display_name: string | null
    avatar_url: string | null
    is_official: boolean | null
    is_cosmohype_creator: boolean | null
  } | null
}

type MessageRow = {
  conversation_id: string
  body: string
  created_at: string
}

export default async function DmPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myParticipations } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', user.id)

  const conversationIds = (myParticipations ?? []).map(p => p.conversation_id)

  if (conversationIds.length === 0) {
    return (
      <DmPageShell>
        <TopBar title="メッセージ" />
        <EmptyDmList />
      </DmPageShell>
    )
  }

  const [{ data: othersRaw }, { data: messagesRaw }, { data: conversationsRaw }, { data: unreadRaw }] = await Promise.all([
    supabase
      .from('conversation_participants')
      .select('conversation_id, profiles(username, display_name, avatar_url, is_official, is_cosmohype_creator)')
      .in('conversation_id', conversationIds)
      .neq('user_id', user.id),
    supabase
      .from('messages')
      .select('conversation_id, body, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false })
      .limit(conversationIds.length * 20),
    supabase
      .from('conversations')
      .select('id, updated_at')
      .in('id', conversationIds),
    supabase.rpc('get_unread_counts'),
  ])

  const othersByConv: Record<string, OtherParticipantRow['profiles']> = {}
  for (const row of (othersRaw ?? []) as OtherParticipantRow[]) {
    if (row.profiles) othersByConv[row.conversation_id] = row.profiles
  }

  const latestByConv: Record<string, MessageRow> = {}
  for (const msg of (messagesRaw ?? []) as MessageRow[]) {
    if (!latestByConv[msg.conversation_id]) latestByConv[msg.conversation_id] = msg
  }

  const updatedAtByConv: Record<string, string> = {}
  for (const conv of conversationsRaw ?? []) {
    updatedAtByConv[conv.id] = conv.updated_at
  }

  const unreadByConv: Record<string, number> = {}
  for (const row of unreadRaw ?? []) {
    unreadByConv[row.conversation_id] = Number(row.unread_count)
  }

  const conversations = conversationIds
    .map(id => ({
      id,
      otherUser: othersByConv[id] ?? null,
      latestMessage: latestByConv[id] ?? null,
      sortKey: latestByConv[id]?.created_at ?? updatedAtByConv[id] ?? '',
      unread: unreadByConv[id] ?? 0,
    }))
    .filter(c => c.otherUser !== null && c.latestMessage !== null)
    .sort((a, b) => b.sortKey.localeCompare(a.sortKey))

  return (
    <DmPageShell>
      <TopBar title="メッセージ" />
      {conversations.length === 0 ? (
        <EmptyDmList />
      ) : (
        <ul>
          {conversations.map(conv => (
            <li key={conv.id}>
              <Link
                href={`/dm/${conv.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-opacity active:opacity-60"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <Avatar
                  src={conv.otherUser?.avatar_url}
                  username={conv.otherUser?.username ?? undefined}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-center gap-1 min-w-0">
                      <span
                        className="text-sm font-semibold truncate"
                        style={{ color: 'var(--text)' }}
                      >
                        {conv.otherUser?.display_name ?? conv.otherUser?.username}
                      </span>
                      <AccountBadges isOfficial={conv.otherUser?.is_official ?? undefined} isCosmohypeCreator={conv.otherUser?.is_cosmohype_creator ?? undefined} />
                    </div>
                    {conv.latestMessage && (
                      <span
                        className="text-xs flex-shrink-0"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {formatRelativeTime(conv.latestMessage.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p
                      className="text-sm truncate"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {conv.latestMessage?.body ?? 'メッセージはまだありません'}
                    </p>
                    {conv.unread > 0 && (
                      <span
                        className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold px-1"
                        style={{ background: 'var(--purple)', color: '#fff' }}
                      >
                        {conv.unread > 99 ? '99+' : conv.unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DmPageShell>
  )
}

function EmptyDmList() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'var(--purple-dim)', border: '1px solid var(--border)' }}
      >
        <svg
          viewBox="0 0 24 24"
          className="w-10 h-10"
          style={{ color: 'var(--purple)' }}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
          />
        </svg>
      </div>
      <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>
        メッセージはまだありません
      </h2>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        気になるユーザーにDMを送ってみましょう
      </p>
    </div>
  )
}
