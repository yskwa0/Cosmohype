// AI HQ 秘密 URL エントリ (Server Component)。
//
// - accessKey 検証 & HttpOnly session cookie 発行は proxy.ts (middleware) 側で行う。
//   Next.js の Server Component からは cookies().set() が禁じられているため。
// - page.tsx はここでは cookie 存在の再確認 + 初期 threads の SSR fetch のみに責務を絞る。
// - middleware が accessKey 不一致 & cookie 無し のリクエストを 404 で弾く。
// - 例外的に middleware を通過して cookie も無い状態 (edge case) では notFound()。

import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { AIHQ_COOKIE_NAME, verifySessionToken } from '@/lib/ai-hq/session'
import type { AiHqSupabase } from '@/ai-company/src/types'
import HQClient from './HQClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AiHqSecretPage() {
  const cookieStore = await cookies()
  const tok = cookieStore.get(AIHQ_COOKIE_NAME)?.value
  if (!verifySessionToken(tok)) {
    notFound()
  }

  // 初期 thread 一覧を SSR で取得 (service_role で RLS bypass)。
  const admin = createAdminClient() as unknown as AiHqSupabase
  const { data: threads } = await admin
    .from('agent_threads')
    .select('id, title, channel, status, updated_at')
    .order('updated_at', { ascending: false })
    .limit(20)

  return (
    <main className="min-h-[100dvh] bg-neutral-950 text-neutral-100">
      <div className="max-w-6xl mx-auto px-3 py-4 md:p-6">
        <header className="mb-3 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold tracking-wide">COSMOHYPE AI HQ</h1>
          <p className="text-xs md:text-sm text-neutral-400 mt-1">
            エージェントの読取・下書き作業は自動です。 実行は必ず CEO 承認が必要です。
          </p>
        </header>
        <HQClient initialThreads={threads ?? []} />
      </div>
    </main>
  )
}
