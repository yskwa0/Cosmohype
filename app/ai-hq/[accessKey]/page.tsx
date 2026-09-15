// AI HQ 秘密 URL エントリ (Server Component)。
//
// - path segment `accessKey` を env AI_HQ_ACCESS_KEY と timing-safe 比較
// - 不一致 → notFound() (HTTP 404)
// - 一致   → HttpOnly / Secure / SameSite=Lax の HMAC 署名済 session cookie を発行し、
//            初期 threads を SSR で fetch して HQClient に渡す
//
// accessKey は URL path のみに存在し、cookie には保存しない。
// cookie は cookie 単体で「AI HQ session あり」を証明する短寿命 signed token。

import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import {
  AIHQ_COOKIE_MAX_AGE_SEC,
  AIHQ_COOKIE_NAME,
  accessKeyMatches,
  createSessionToken,
} from '@/lib/ai-hq/session'
import type { AiHqSupabase } from '@/ai-company/src/types'
import HQClient from './HQClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AiHqSecretPage({
  params,
}: {
  params: Promise<{ accessKey: string }>
}) {
  const { accessKey } = await params
  if (!accessKey || !accessKeyMatches(accessKey)) {
    notFound()
  }

  // access key 一致 → session cookie を発行 (accessKey 自体は cookie に含めない)。
  const cookieStore = await cookies()
  cookieStore.set(AIHQ_COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: AIHQ_COOKIE_MAX_AGE_SEC,
  })

  // 初期 thread 一覧を SSR で取得 (service_role で RLS bypass)。
  const admin = createAdminClient() as unknown as AiHqSupabase
  const { data: threads } = await admin
    .from('agent_threads')
    .select('id, title, channel, status, updated_at')
    .order('updated_at', { ascending: false })
    .limit(20)

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-6xl mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-wide">COSMOHYPE AI HQ</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Phase 1 — READ / DRAFT only. EXECUTE は人間承認が必要です。
          </p>
        </header>
        <HQClient initialThreads={threads ?? []} />
      </div>
    </main>
  )
}
