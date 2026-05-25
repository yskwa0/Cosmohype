'use client'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { formatRelativeTime } from '@/lib/utils'
import { saveFeedScroll, armFeedScrollRestore } from '@/lib/feedScrollStore'

export type DmConversation = {
  id: string
  otherUser: { username: string; display_name: string | null; avatar_url: string | null } | null
  latestMessage: { body: string; created_at: string } | null
  unread: number
}

export function DmPanel({ conversations }: { conversations: DmConversation[] }) {
  return (
    <div>
      <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>メッセージ</h2>
      </div>
      {conversations.length === 0 ? (
        <EmptyDmPanel />
      ) : (
        <ul>
          {conversations.map(conv => (
            <li key={conv.id}>
              <Link
                href={`/dm/${conv.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-opacity active:opacity-60"
                style={{ borderBottom: '1px solid var(--border)' }}
                onClick={() => { saveFeedScroll(0, 2); armFeedScrollRestore() }}
              >
                <Avatar
                  src={conv.otherUser?.avatar_url}
                  username={conv.otherUser?.username ?? undefined}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                      {conv.otherUser?.display_name ?? conv.otherUser?.username}
                    </span>
                    {conv.latestMessage && (
                      <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {formatRelativeTime(conv.latestMessage.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>
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
    </div>
  )
}

function EmptyDmPanel() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'var(--purple-dim)', border: '1px solid var(--border)' }}
      >
        <svg viewBox="0 0 24 24" className="w-10 h-10" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      </div>
      <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>メッセージはまだありません</h2>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>気になるユーザーにDMを送ってみましょう</p>
    </div>
  )
}
