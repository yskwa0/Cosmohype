// AI HQ Phase 2C: deliverable list (CEO INBOX 用、cookie 認証)。

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
  const status = req.nextUrl.searchParams.get('status')
  const admin = createAdminClient() as unknown as AiHqSupabase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = (admin as any)
    .from('agent_deliverables')
    .select('id, task_id, thread_id, agent_id, deliverable_type, title, summary, status, version, submitted_at, reviewed_at, created_at, review_notes')
    .order('created_at', { ascending: false })
    .limit(50)
  if (status) query = query.eq('status', status)
  const { data } = await query
  return NextResponse.json({ deliverables: data ?? [] })
}
