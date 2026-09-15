// AI HQ Phase 2A: agent_events / agent_activity の SSE proxy。
//
// なぜ proxy するか:
//   - client は cookie 認証のみで、Supabase auth session を持たない。
//   - client 直 subscribe は RLS (admin-only) で拒否される。
//   - service_role を client bundle に出さない要件のため、server が service_role で
//     Postgres Changes を subscribe し、text/event-stream で client へ forward する。
//
// 対象 event:
//   - agent_events: INSERT + UPDATE (status transitions を UI に反映)
//   - agent_activity: UPDATE (7 agent の status 変化)
//
// Vercel serverless の maxDuration に達すると WS が閉じるため、client 側 EventSource
// は onerror で自動再接続する。

import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import type { AiHqSupabase } from '@/ai-company/src/types'
import { AIHQ_COOKIE_NAME, verifySessionToken } from '@/lib/ai-hq/session'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const tok = cookieStore.get(AIHQ_COOKIE_NAME)?.value
  if (!verifySessionToken(tok)) {
    return new Response(null, { status: 404 })
  }

  const admin = createAdminClient() as unknown as AiHqSupabase
  let channels: RealtimeChannel[] = []
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
      write(': open\n\n')

      const ev = admin
        .channel('aihq-hq-events')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'agent_events' },
          (payload) => {
            write(`event: event_insert\ndata: ${JSON.stringify(payload.new)}\n\n`)
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'agent_events' },
          (payload) => {
            write(`event: event_update\ndata: ${JSON.stringify(payload.new)}\n\n`)
          },
        )
        .subscribe()

      const ac = admin
        .channel('aihq-hq-activity')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'agent_activity' },
          (payload) => {
            write(`event: activity_update\ndata: ${JSON.stringify(payload.new)}\n\n`)
          },
        )
        .subscribe()

      channels = [ev, ac]
      heartbeat = setInterval(() => write(`: hb\n\n`), 15_000)

      const signal = req.signal
      signal.addEventListener('abort', () => {
        if (heartbeat) clearInterval(heartbeat)
        for (const ch of channels) admin.removeChannel(ch).catch(() => {})
        try {
          controller.close()
        } catch {
          /* already closed */
        }
      })
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat)
      for (const ch of channels) admin.removeChannel(ch).catch(() => {})
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
