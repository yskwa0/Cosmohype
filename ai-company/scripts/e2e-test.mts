// AI HQ Phase 1: end-to-end test script (Node.js standalone、Next.js dev server 不要)。
//
// このスクリプトは Test env (`scrddddtgvnbptkwgqml`) に対して、
// admin auth を bypass して直接 JURIN orchestration を叩き、実 OpenAI API 呼び出しを行う。
//
// 実行:
//   OPENAI_API_KEY=... SUPABASE_URL=https://scrddddtgvnbptkwgqml.supabase.co \
//     SUPABASE_SERVICE_ROLE_KEY=... node --experimental-strip-types ai-company/scripts/e2e-test.mts
//
// admin auth は本 script では bypass (service_role が RLS を bypass するため直接書き込み可)。
// UI 経路の auth check は既に別途 route.ts / layout.tsx で SSR 済み。

import { createClient } from '@supabase/supabase-js'
import { runJurinTurn } from '../src/orchestration/jurin.ts'
import type { AiHqSupabase } from '../src/types.ts'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY required')
  process.exit(1)
}
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY required')
  process.exit(1)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
}) as unknown as AiHqSupabase

async function runCase(label: string, ceoMessage: string, channel = 'general') {
  console.log(`\n========== ${label} ==========`)
  console.log(`CEO: ${ceoMessage}`)

  const t0 = Date.now()

  // thread 新規作成
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: t, error: tErr } = await (admin as any)
    .from('agent_threads')
    .insert({ title: ceoMessage.slice(0, 60), channel, status: 'open' })
    .select('id')
    .single()
  if (tErr) {
    console.error('thread create failed', tErr)
    return
  }
  const threadId = t.id
  console.log(`thread_id = ${threadId}`)

  const result = await runJurinTurn({
    admin,
    threadId,
    ceoMessage,
  })
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`\n--- result (${elapsed}s) ---`)
  console.log(JSON.stringify(result, null, 2))

  // 保存された messages を order で取得
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: msgs } = await (admin as any)
    .from('agent_messages')
    .select('sender_type, sender_agent, message_type, content, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  console.log(`\n--- agent_messages in this thread (${msgs?.length ?? 0}) ---`)
  for (const m of msgs ?? []) {
    const who =
      m.sender_type === 'human'
        ? 'CEO'
        : m.sender_type === 'system'
          ? 'SYSTEM'
          : (m.sender_agent ?? 'agent').toUpperCase()
    console.log(`[${who}] (${m.message_type}) ${m.content.slice(0, 200)}${m.content.length > 200 ? '…' : ''}`)
  }

  // decisions / tasks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: dec } = await (admin as any)
    .from('agent_decisions')
    .select('summary, reason, decided_by')
    .eq('thread_id', threadId)
  if (dec && dec.length > 0) {
    console.log('\n--- decisions ---')
    dec.forEach((d: { summary: string; reason: string; decided_by: string }) =>
      console.log(`  * [${d.decided_by}] ${d.summary}`),
    )
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tasks } = await (admin as any)
    .from('agent_tasks')
    .select('title, assigned_to, priority, requires_approval')
    .order('created_at', { ascending: false })
    .limit(10)
  if (tasks && tasks.length > 0) {
    console.log('\n--- tasks (latest 10 across all threads) ---')
    tasks.forEach((t: { title: string; assigned_to: string; priority: number; requires_approval: boolean }) =>
      console.log(`  * [P${t.priority}] ${t.title} → ${t.assigned_to ?? '-'} (approval=${t.requires_approval})`),
    )
  }

  return { threadId, result, msgCount: msgs?.length ?? 0 }
}

async function main() {
  await runCase('CASE A: 新規登録伸び悩み', '最近新規登録が伸びてない。原因を考えて')
  await runCase('CASE B: iOS 固まる', 'iOSで画面が固まる。原因を考えて', 'engineering')
  console.log('\n========== ALL CASES DONE ==========')
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
