// AI HQ Phase 2B: Watch health summary (UI 用、cookie 認証)。

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import type { AiHqSupabase } from '@/ai-company/src/types'
import { AIHQ_COOKIE_NAME, verifySessionToken } from '@/lib/ai-hq/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = await cookies()
  const tok = cookieStore.get(AIHQ_COOKIE_NAME)?.value
  if (!verifySessionToken(tok)) return new NextResponse(null, { status: 404 })
  const admin = createAdminClient() as unknown as AiHqSupabase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyAdmin = admin as any
  const [srcRes, ghRes] = await Promise.all([
    anyAdmin
      .from('agent_research_sources')
      .select('name, enabled, priority, last_checked_at, last_success_at, consecutive_failures, last_error')
      .order('priority', { ascending: false }),
    anyAdmin.from('agent_watch_state').select('key, value, updated_at').in('key', ['github', 'health:github']),
  ])
  return NextResponse.json({
    research_sources: srcRes.data ?? [],
    github_state: ghRes.data ?? [],
  })
}
