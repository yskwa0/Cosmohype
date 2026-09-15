// AI HQ Phase 3A.1: execution reject (cookie 認証、Origin 検証)。

import { NextRequest, NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import type { AiHqSupabase } from '@/ai-company/src/types'
import { AIHQ_COOKIE_NAME, verifySessionToken } from '@/lib/ai-hq/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function verifyOrigin(originHeader: string | null, refererHeader: string | null): boolean {
  const allowedHosts = new Set(['www.cosmohype.jp', 'cosmohype.jp', 'localhost:3000', 'localhost:3002'])
  const check = (raw: string | null): boolean => {
    if (!raw) return false
    try { return allowedHosts.has(new URL(raw).host) } catch { return false }
  }
  return check(originHeader) || check(refererHeader)
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const tok = cookieStore.get(AIHQ_COOKIE_NAME)?.value
  if (!verifySessionToken(tok)) return new NextResponse(null, { status: 404 })

  const hdrs = await headers()
  if (!verifyOrigin(hdrs.get('origin'), hdrs.get('referer'))) {
    return NextResponse.json({ error: 'invalid origin' }, { status: 403 })
  }

  const { id } = await ctx.params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 })

  const admin = createAdminClient() as unknown as AiHqSupabase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyAdmin = admin as any
  const now = new Date().toISOString()

  const { data } = await anyAdmin
    .from('agent_execution_requests')
    .update({ status: 'cancelled', updated_at: now })
    .eq('id', id)
    .in('status', ['waiting_for_approval', 'draft'])
    .select('id')
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'invalid state or not found' }, { status: 409 })
  }
  return NextResponse.json({ ok: true, status: 200 })
}
