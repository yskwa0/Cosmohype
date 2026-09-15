// AI HQ Phase 2B: Research Watch endpoint (pg_cron から server-to-server 発火)。
// Bearer AI_HQ_SCHEDULER_SECRET 必須、invalid → 404。

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { AiHqSupabase } from '@/ai-company/src/types'
import { runResearchWatch } from '@/ai-company/src/research/watcher'
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

export async function POST(req: NextRequest) {
  if (!verifySecret(req.headers.get('authorization'))) {
    return new NextResponse(null, { status: 404 })
  }
  const admin = createAdminClient() as unknown as AiHqSupabase
  try {
    const result = await runResearchWatch(admin)
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    console.error('[watch/research] error', err)
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
