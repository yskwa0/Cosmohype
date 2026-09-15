// AI HQ: 指定 thread の messages を取得。

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { AIHQ_COOKIE_NAME, verifySessionToken } from '@/lib/ai-hq/session'
import type { AiHqSupabase } from '@/ai-company/src/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const tok = cookieStore.get(AIHQ_COOKIE_NAME)?.value
  if (!verifySessionToken(tok)) {
    return new NextResponse(null, { status: 404 })
  }
  const threadId = req.nextUrl.searchParams.get('thread_id') ?? ''
  if (!UUID_RE.test(threadId)) {
    return NextResponse.json({ error: 'bad thread_id' }, { status: 400 })
  }
  const admin = createAdminClient() as unknown as AiHqSupabase
  const { data } = await admin
    .from('agent_messages')
    .select('id, thread_id, sender_type, sender_agent, content, message_type, metadata, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
  return NextResponse.json({ messages: data ?? [] })
}
