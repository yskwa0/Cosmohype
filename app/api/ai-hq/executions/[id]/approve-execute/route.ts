// AI HQ Phase 3A.1: Approve & Execute (1 API 1 shot)。
// CEO の「実行してよい」を受けて、server-side executor で GitHub API を呼ぶ。
// Draft の Approve とは完全に分離、外部 EXECUTE はここでのみ発火。

import { NextRequest, NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import type { AiHqSupabase } from '@/ai-company/src/types'
import { AIHQ_COOKIE_NAME, verifySessionToken } from '@/lib/ai-hq/session'
import { executeExecutionRequest, markExecuting, recordResult, type ExecutionRow } from '@/ai-company/src/executions/executor'
import { isExecutableRisk, type RiskLevel } from '@/ai-company/src/executions/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function verifyOrigin(originHeader: string | null, refererHeader: string | null): boolean {
  const allowedHosts = new Set([
    'www.cosmohype.jp',
    'cosmohype.jp',
    'localhost:3000',
    'localhost:3002',
  ])
  const check = (raw: string | null): boolean => {
    if (!raw) return false
    try {
      const u = new URL(raw)
      return allowedHosts.has(u.host)
    } catch {
      return false
    }
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

  const { data: current } = await anyAdmin
    .from('agent_execution_requests')
    .select('id, execution_type, payload, status, result, idempotency_key, retry_count, risk_level, expires_at')
    .eq('id', id)
    .maybeSingle()
  if (!current) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const nowIso = new Date().toISOString()

  // expiration check
  if (new Date(current.expires_at as string).getTime() <= Date.now()) {
    // lazy update to expired
    await anyAdmin.from('agent_execution_requests').update({ status: 'expired', updated_at: nowIso }).eq('id', id).eq('status', 'waiting_for_approval')
    return NextResponse.json({ error: 'expired' }, { status: 410 })
  }

  // status transition validation: waiting_for_approval のみ受け付ける
  if (current.status !== 'waiting_for_approval') {
    // 既 succeeded は 409 で拒否
    if (current.status === 'succeeded') return NextResponse.json({ error: 'already succeeded', result: current.result }, { status: 409 })
    if (current.status === 'expired') return NextResponse.json({ error: 'expired' }, { status: 410 })
    if (current.status === 'cancelled') return NextResponse.json({ error: 'cancelled' }, { status: 409 })
    return NextResponse.json({ error: `invalid status ${current.status}` }, { status: 409 })
  }

  // risk level check
  if (!isExecutableRisk(current.risk_level as RiskLevel)) {
    return NextResponse.json({ error: `risk ${current.risk_level} not executable` }, { status: 403 })
  }

  // Atomic transition to approved+executing (compare-and-swap 相当)
  const { data: transitioned, error: txErr } = await anyAdmin
    .from('agent_execution_requests')
    .update({ status: 'executing', approved_by_ceo_at: nowIso, updated_at: nowIso })
    .eq('id', id)
    .eq('status', 'waiting_for_approval')
    .select('id')
  if (txErr || !transitioned || transitioned.length === 0) {
    return NextResponse.json({ error: 'transition failed' }, { status: 409 })
  }

  // Execute
  const row: ExecutionRow = {
    id: current.id as string,
    execution_type: current.execution_type as string,
    payload: current.payload as Record<string, unknown>,
    status: 'executing',
    result: (current.result as Record<string, unknown> | null) ?? null,
    idempotency_key: current.idempotency_key as string,
    retry_count: (current.retry_count as number) ?? 0,
  }
  const res = await executeExecutionRequest(admin, row)
  await recordResult(admin, id, res)

  const status = res.ok ? 200 : 502
  return NextResponse.json({ ok: res.ok, ...(res.ok ? { external_id: res.external_id, external_url: res.external_url, duplicate: res.duplicate_found ?? false } : { failure_reason: res.failure_reason }) }, { status })
}
