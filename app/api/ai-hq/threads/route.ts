// AI HQ: recent thread 一覧を取得 (secret URL session cookie 認証)。

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { AIHQ_COOKIE_NAME, verifySessionToken } from '@/lib/ai-hq/session'
import type { AiHqSupabase } from '@/ai-company/src/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = await cookies()
  const tok = cookieStore.get(AIHQ_COOKIE_NAME)?.value
  if (!verifySessionToken(tok)) {
    // 404 で存在自体を隠す (403 だと URL 発見の副次情報になる)。
    return new NextResponse(null, { status: 404 })
  }
  const admin = createAdminClient() as unknown as AiHqSupabase
  const { data } = await admin
    .from('agent_threads')
    .select('id, title, channel, status, updated_at')
    .order('updated_at', { ascending: false })
    .limit(20)
  return NextResponse.json({ threads: data ?? [] })
}
