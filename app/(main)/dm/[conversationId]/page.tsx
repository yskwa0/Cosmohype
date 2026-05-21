import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { Avatar } from '@/components/ui/Avatar'
import { ChatView } from '@/components/dm/ChatView'
import type { MessageRow } from '@/components/dm/ChatView'
import type { Profile } from '@/types/database'

type OtherProfileRow = {
  profiles: Pick<Profile, 'username' | 'display_name' | 'avatar_url'> | null
}

export default async function ChatPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // RLS が参加者以外を弾くが、maybeSingle で明示的に 404 へ
  const { data: myParticipation } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!myParticipation) notFound()

  const [{ data: otherRaw }, { data: messagesRaw }] = await Promise.all([
    supabase
      .from('conversation_participants')
      .select('profiles(username, display_name, avatar_url)')
      .eq('conversation_id', conversationId)
      .neq('user_id', user.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('messages')
      .select('id, sender_id, body, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(200),
  ])

  const otherUser = ((otherRaw as OtherProfileRow | null)?.profiles) ?? null
  const initialMessages = (messagesRaw ?? []) as MessageRow[]

  return (
    <>
      <TopBar
        left={<BackButton href="/dm" />}
        title={
          otherUser ? (
            <div className="flex items-center gap-2">
              <Avatar
                src={otherUser.avatar_url}
                username={otherUser.username}
                size="xs"
              />
              <span>{otherUser.display_name ?? otherUser.username}</span>
            </div>
          ) : (
            'メッセージ'
          )
        }
      />
      <ChatView
        conversationId={conversationId}
        userId={user.id}
        initialMessages={initialMessages}
      />
    </>
  )
}
