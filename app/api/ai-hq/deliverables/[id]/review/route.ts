// AI HQ Phase 2C: CEO review action (approve/revise/reject)、cookie 認証。

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import type { AiHqSupabase } from '@/ai-company/src/types'
import { AIHQ_COOKIE_NAME, verifySessionToken } from '@/lib/ai-hq/session'
import { reviewDeliverable } from '@/ai-company/src/deliverables/reviewer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Body {
  action?: 'approve' | 'revise' | 'reject'
  feedback?: string
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const tok = cookieStore.get(AIHQ_COOKIE_NAME)?.value
  if (!verifySessionToken(tok)) return new NextResponse(null, { status: 404 })
  const { id } = await ctx.params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'bad id' }, { status: 400 })
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  if (!body.action || !['approve', 'revise', 'reject'].includes(body.action)) {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 })
  }
  const admin = createAdminClient() as unknown as AiHqSupabase
  const r = await reviewDeliverable({
    admin,
    deliverableId: id,
    action: body.action,
    feedback: body.feedback,
  })
  return NextResponse.json(r, { status: r.status })
}
