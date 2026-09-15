// AI HQ Phase 2A: scheduler tick endpoint。
//
// - 呼出元: Supabase pg_cron + pg_net (server-to-server)。 Vault の scheduler secret を
//   `Authorization: Bearer <SECRET>` として送る。
// - AI_HQ_ACCESS_KEY (browser secret URL 用) とは **完全に分離** した secret。
// - 検証失敗 → 404 (存在を隠す)。
//
// body: { slot: 'morning' | 'kpi' | 'progress' | 'daily' }
// 応答: { ok, result }

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { AiHqSupabase, ScheduledSlot } from '@/ai-company/src/types'
import { runScheduledSlot } from '@/ai-company/src/meetings/scheduled'
import { timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function verifySecret(header: string | null): boolean {
  const expected = process.env.AI_HQ_SCHEDULER_SECRET
  if (!expected || expected.length < 32) return false
  const raw = (header ?? '').replace(/^Bearer\s+/, '')
  const a = Buffer.from(raw, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

const VALID_SLOTS: ScheduledSlot[] = ['morning', 'kpi', 'progress', 'daily']

export async function POST(req: NextRequest) {
  if (!verifySecret(req.headers.get('authorization'))) {
    return new NextResponse(null, { status: 404 })
  }
  let body: { slot?: string }
  try {
    body = (await req.json()) as { slot?: string }
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const slot = body.slot as ScheduledSlot
  if (!slot || !VALID_SLOTS.includes(slot)) {
    return NextResponse.json({ error: 'invalid slot' }, { status: 400 })
  }
  const admin = createAdminClient() as unknown as AiHqSupabase
  try {
    const result = await runScheduledSlot(admin, slot)
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    console.error('[api/ai-hq/scheduler/tick] error', err)
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 },
    )
  }
}
