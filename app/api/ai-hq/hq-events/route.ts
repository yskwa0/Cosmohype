// AI HQ Phase 2A: agent_events feed。
//
// GET   : cookie 認証で最近の events を返す (list)。
// POST  : cookie 認証で manual event 挿入 (CEO や owner が spontaneous meeting を意図的に起動)。
//         severity=critical でも Quiet Hours 中は spontaneous meeting を発火させ、
//         それ以外の severity は Quiet Hours 中は pending にとどめる。

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import type { AgentEventRow, AiHqSupabase, EventType, Severity } from '@/ai-company/src/types'
import { EVENT_TYPES, SEVERITIES } from '@/ai-company/src/types'
import { AIHQ_COOKIE_NAME, verifySessionToken } from '@/lib/ai-hq/session'
import { runSpontaneousMeeting } from '@/ai-company/src/meetings/spontaneous'
import { isQuietHoursJst } from '@/ai-company/src/quiet-hours'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function verifyCookie(): Promise<boolean> {
  const cookieStore = await cookies()
  const tok = cookieStore.get(AIHQ_COOKIE_NAME)?.value
  return verifySessionToken(tok)
}

export async function GET() {
  if (!(await verifyCookie())) return new NextResponse(null, { status: 404 })
  const admin = createAdminClient() as unknown as AiHqSupabase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('agent_events')
    .select('id, event_type, source, severity, title, summary, status, handled_by_thread_id, quiet_queued, created_at, dispatched_at, handled_at')
    .order('created_at', { ascending: false })
    .limit(30)
  return NextResponse.json({ events: data ?? [] })
}

interface InjectBody {
  event_type: EventType
  severity?: Severity
  title: string
  summary: string
  payload?: Record<string, unknown>
  /// true にすると event 挿入だけで spontaneous meeting を起動しない (Quiet Hours 動作テスト用)。
  no_dispatch?: boolean
}

export async function POST(req: NextRequest) {
  if (!(await verifyCookie())) return new NextResponse(null, { status: 404 })
  let body: InjectBody
  try {
    body = (await req.json()) as InjectBody
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  if (!EVENT_TYPES.includes(body.event_type)) {
    return NextResponse.json({ error: 'invalid event_type' }, { status: 400 })
  }
  const severity: Severity = SEVERITIES.includes(body.severity as Severity) ? (body.severity as Severity) : 'medium'
  if (!body.title || !body.summary) {
    return NextResponse.json({ error: 'title and summary required' }, { status: 400 })
  }

  const admin = createAdminClient() as unknown as AiHqSupabase
  const quiet = isQuietHoursJst()
  const holdInQuiet = quiet && severity !== 'critical' && !body.no_dispatch

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error } = await (admin as any)
    .from('agent_events')
    .insert({
      event_type: body.event_type,
      source: 'manual',
      severity,
      title: body.title,
      summary: body.summary,
      payload: body.payload ?? {},
      status: 'pending',
      quiet_queued: holdInQuiet,
    })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const ev = inserted as AgentEventRow

  if (body.no_dispatch || holdInQuiet) {
    return NextResponse.json({ ok: true, event: ev, dispatched: false, reason: holdInQuiet ? 'quiet_hours_hold' : 'no_dispatch' })
  }

  try {
    const meeting = await runSpontaneousMeeting(admin, ev)
    return NextResponse.json({ ok: true, event: ev, dispatched: true, meeting })
  } catch (err) {
    console.error('[hq-events POST] spontaneous meeting failed', err)
    return NextResponse.json(
      { ok: false, event: ev, dispatched: false, error: (err as Error).message },
      { status: 500 },
    )
  }
}
