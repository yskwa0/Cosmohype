// AI HQ Phase 3A.1: execution list (Execution Inbox 用、cookie 認証)。
// expires_at < now() の waiting_for_approval は lazy に expired 扱いにして返す。

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import type { AiHqSupabase } from '@/ai-company/src/types'
import { AIHQ_COOKIE_NAME, verifySessionToken } from '@/lib/ai-hq/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const tok = cookieStore.get(AIHQ_COOKIE_NAME)?.value
  if (!verifySessionToken(tok)) return new NextResponse(null, { status: 404 })
  const admin = createAdminClient() as unknown as AiHqSupabase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyAdmin = admin as any

  const nowIso = new Date().toISOString()
  // lazy expire: expires_at < now かつ status=waiting_for_approval を expired に更新
  await anyAdmin
    .from('agent_execution_requests')
    .update({ status: 'expired', updated_at: nowIso })
    .eq('status', 'waiting_for_approval')
    .lt('expires_at', nowIso)

  const status = req.nextUrl.searchParams.get('status')
  let q = anyAdmin
    .from('agent_execution_requests')
    .select('id, deliverable_id, task_id, agent_id, execution_type, title, summary, risk_level, status, expires_at, approved_by_ceo_at, executed_at, failed_at, failure_reason, result, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(50)
  if (status) q = q.eq('status', status)
  const { data } = await q
  return NextResponse.json({ executions: data ?? [] })
}
