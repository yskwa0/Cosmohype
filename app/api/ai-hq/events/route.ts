// AI HQ: Supabase Realtime → SSE proxy。
//
// なぜ proxy するか:
//   - client は cookie 認証のみで、Supabase auth session を持たない。
//   - client 直 subscribe は RLS (admin-only) で拒否される。
//   - service_role を client bundle に出さない要件のため、server が service_role で
//     Postgres Changes を subscribe し、text/event-stream で client へ forward する。
//
// Vercel serverless の maxDuration に達すると WS が閉じるため、client 側 EventSource
// は onerror で自動再接続する (setup: HQClient.tsx)。

import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { AIHQ_COOKIE_NAME, verifySessionToken } from '@/lib/ai-hq/session'
import type { AiHqSupabase } from '@/ai-company/src/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Vercel Hobby=60s / Pro=300s。 client が自動再接続するため長すぎる必要は無い。
export const maxDuration = 60

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const tok = cookieStore.get(AIHQ_COOKIE_NAME)?.value
  if (!verifySessionToken(tok)) {
    return new Response(null, { status: 404 })
  }
  const threadId = req.nextUrl.searchParams.get('thread_id') ?? ''
  if (!UUID_RE.test(threadId)) {
    return new Response('bad thread_id', { status: 400 })
  }

  const admin = createAdminClient() as unknown as AiHqSupabase
  let channel: RealtimeChannel | null = null
  let heartbeat: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder()
      const write = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          /* controller closed */
        }
      }
      // initial ping so EventSource sees a response quickly
      write(': open\n\n')

      // Supabase Realtime subscribe (service_role → RLS bypass)
      channel = admin
        .channel(`aihq-sse:${threadId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'agent_messages',
            filter: `thread_id=eq.${threadId}`,
          },
          (payload) => {
            const row = payload.new
            write(`event: message_insert\ndata: ${JSON.stringify(row)}\n\n`)
          },
        )
        .subscribe()

      heartbeat = setInterval(() => write(`: hb\n\n`), 15_000)

      // クライアント切断でクリーンアップ
      const signal = req.signal
      signal.addEventListener('abort', () => {
        if (heartbeat) clearInterval(heartbeat)
        if (channel) admin.removeChannel(channel).catch(() => {})
        try {
          controller.close()
        } catch {
          /* already closed */
        }
      })
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat)
      if (channel) admin.removeChannel(channel).catch(() => {})
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  })
}
