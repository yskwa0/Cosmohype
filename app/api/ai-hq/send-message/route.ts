// AI HQ Phase 1: CEO からのメッセージを受け、JURIN orchestration を起動する API。
//
// 認証は AI HQ 秘密 URL 由来の HMAC 署名 cookie のみ。
// admin auth (profiles.role='admin') は使用しない。
// cookie 不在 / 検証失敗 → 404 (存在自体を隠す)。

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { runJurinTurn } from '@/ai-company/src/orchestration/jurin'
import type { AiHqSupabase, Channel } from '@/ai-company/src/types'
import { CHANNELS } from '@/ai-company/src/types'
import { AIHQ_COOKIE_NAME, verifySessionToken } from '@/lib/ai-hq/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Body {
  thread_id?: string
  channel?: string
  ceo_message: string
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const tok = cookieStore.get(AIHQ_COOKIE_NAME)?.value
  if (!verifySessionToken(tok)) {
    return new NextResponse(null, { status: 404 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 })
  }
  const ceoMessage = (body.ceo_message ?? '').trim()
  if (!ceoMessage) {
    return NextResponse.json({ error: 'ceo_message required' }, { status: 400 })
  }
  const channel: Channel = CHANNELS.includes(body.channel as Channel)
    ? (body.channel as Channel)
    : 'general'

  const admin = createAdminClient() as unknown as AiHqSupabase

  let threadId = body.thread_id
  if (!threadId) {
    const { data: t, error: tErr } = await admin
      .from('agent_threads')
      .insert({
        title: ceoMessage.slice(0, 60),
        channel,
        status: 'open',
      })
      .select('id')
      .single()
    if (tErr) {
      console.error('[api/ai-hq/send-message] thread create error', tErr)
      return NextResponse.json({ error: 'thread create failed' }, { status: 500 })
    }
    threadId = (t as { id: string }).id
  }

  try {
    const result = await runJurinTurn({
      admin,
      threadId,
      ceoMessage,
    })
    return NextResponse.json({
      ok: true,
      thread_id: result.threadId,
      tool_calls_executed: result.toolCallsExecuted,
      reasoning_model_used: result.reasoningModelUsed,
    })
  } catch (err) {
    console.error('[api/ai-hq/send-message] JURIN run error', err)
    await admin.from('agent_messages').insert({
      thread_id: threadId,
      sender_type: 'system',
      sender_agent: null,
      content: `【JURIN 実行エラー】 ${(err as Error).message}`,
      message_type: 'message',
      metadata: { error: true },
    })
    return NextResponse.json(
      { error: 'JURIN failed', detail: (err as Error).message },
      { status: 500 },
    )
  }
}
