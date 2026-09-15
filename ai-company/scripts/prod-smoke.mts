// AI HQ Phase 1: Prod smoke test。
//
// Prod Supabase (pyrxyhyjzufefobcjqnc) に対して:
//  1. Realtime subscribe を張り、UI が受け取るはずの INSERT event を実測
//  2. 軽量 CEO message を 1 件 invoke (specialist を大量招集させない意図)
//  3. duplicates 0 / thought=0 / final message 保存 を確認
//  4. Task が生成された場合は requires_approval=true のまま (実行なし = Phase 1 仕様)
//
// 実行:
//   source /tmp/aihq-prod-env.sh
//   npx tsx ai-company/scripts/prod-smoke.mts

import { createClient } from '@supabase/supabase-js'
import { runJurinTurn } from '../src/orchestration/jurin.ts'
import type { AiHqSupabase } from '../src/types.ts'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.SUPABASE_ANON_KEY
if (!supabaseUrl || !serviceRoleKey || !anonKey || !process.env.OPENAI_API_KEY) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY / OPENAI_API_KEY required')
  process.exit(1)
}
if (!supabaseUrl.includes('pyrxyhyjzufefobcjqnc')) {
  console.error(`SAFETY: SUPABASE_URL must point at Prod (pyrxyhyjzufefobcjqnc). Got: ${supabaseUrl}`)
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
}) as unknown as AiHqSupabase

const observer = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { params: { eventsPerSecond: 20 } },
})
observer.realtime.setAuth(serviceRoleKey)

const CEO_TEXT = 'AI HQの動作確認。現在の状態を簡潔に報告して'
const CHANNEL = 'general'

type Ev = { id: string; message_type: string; sender_type: string; sender_agent: string | null; monotonic: number }
const observed: Ev[] = []
const seen = new Set<string>()
const dups: string[] = []

async function main() {
  console.log('========== Prod AI HQ smoke test ==========')
  console.log(`Prod URL: ${supabaseUrl}`)
  console.log(`CEO: ${CEO_TEXT}`)

  const { data: t, error } = await (admin as any)
    .from('agent_threads')
    .insert({ title: CEO_TEXT.slice(0, 60), channel: CHANNEL, status: 'open' })
    .select('id')
    .single()
  if (error || !t) {
    console.error('thread create failed', error)
    process.exit(1)
  }
  const threadId: string = t.id
  console.log(`thread_id = ${threadId}`)

  const channel = observer
    .channel(`agent_messages:${threadId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'agent_messages', filter: `thread_id=eq.${threadId}` },
      (payload) => {
        const row = payload.new as any
        const e: Ev = {
          id: row.id,
          message_type: row.message_type,
          sender_type: row.sender_type,
          sender_agent: row.sender_agent,
          monotonic: performance.now(),
        }
        if (seen.has(e.id)) {
          dups.push(e.id)
          console.log(`[RT-DUP] ${e.id}`)
        } else {
          seen.add(e.id)
          const who = e.sender_agent ? e.sender_agent.toUpperCase() : e.sender_type.toUpperCase()
          console.log(`[RT] +${e.monotonic.toFixed(0)}ms  ${e.message_type}  ${who}`)
        }
        observed.push(e)
      },
    )
    .subscribe((s) => console.log(`[RT] subscription: ${s}`))

  await new Promise((r) => setTimeout(r, 4000))

  const t0 = Date.now()
  const result = await runJurinTurn({ admin, threadId, ceoMessage: CEO_TEXT })
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`\n--- runJurinTurn result (${elapsed}s) ---`)
  console.log(JSON.stringify(result, null, 2))

  await new Promise((r) => setTimeout(r, 3000))
  await channel.unsubscribe()

  const { data: msgs } = await (admin as any)
    .from('agent_messages')
    .select('id, message_type, sender_type, sender_agent, content, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  console.log(`\n--- DB messages (${msgs?.length ?? 0}) ---`)
  for (const m of msgs ?? []) {
    const who = m.sender_agent ? m.sender_agent.toUpperCase() : m.sender_type.toUpperCase()
    console.log(`  [${who}] (${m.message_type}) ${m.content.slice(0, 220)}${m.content.length > 220 ? '…' : ''}`)
  }

  const dbIds = new Set((msgs ?? []).map((m: any) => m.id))
  const rtIds = new Set(observed.map((o) => o.id))
  const missing = [...dbIds].filter((id) => !rtIds.has(id as string))
  const extra = [...rtIds].filter((id) => !dbIds.has(id))
  const orderMatch =
    (msgs ?? []).length === observed.length &&
    (msgs ?? []).every((m: any, i: number) => m.id === observed[i].id)
  console.log('\n--- Realtime vs DB reconciliation ---')
  console.log(`DB rows: ${dbIds.size} / RT events: ${rtIds.size}`)
  console.log(`missing from RT: ${missing.length} ${JSON.stringify(missing)}`)
  console.log(`extra in RT: ${extra.length} ${JSON.stringify(extra)}`)
  console.log(`duplicates: ${dups.length}`)
  console.log(`order match: ${orderMatch}`)

  const { data: dec } = await (admin as any)
    .from('agent_decisions').select('summary, reason, decided_by').eq('thread_id', threadId)
  console.log(`\n--- decisions (${dec?.length ?? 0}) ---`)
  for (const d of dec ?? []) console.log(`  [${d.decided_by}] ${d.summary}`)

  const { data: tasks } = await (admin as any)
    .from('agent_tasks').select('title, assigned_to, priority, requires_approval, status').gte('created_at', new Date(t0 - 1000).toISOString())
  console.log(`\n--- tasks created since smoke start (${tasks?.length ?? 0}) ---`)
  for (const tk of tasks ?? []) {
    console.log(`  [P${tk.priority}] ${tk.title} → ${tk.assigned_to} (status=${tk.status}, approval=${tk.requires_approval})`)
    if (tk.requires_approval !== true) {
      console.log(`  ⚠ WARN: task has requires_approval=false — Phase 1 policy violation`)
    }
  }

  const { count: thoughtCount } = await (admin as any)
    .from('agent_messages').select('*', { count: 'exact', head: true }).eq('message_type', 'thought')
  console.log(`\n--- invariants ---`)
  console.log(`thought rows across Prod DB: ${thoughtCount}`)
  console.log(`duplicates: ${dups.length}`)
  console.log(`missing/extra: ${missing.length}/${extra.length}`)

  process.exit(0)
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
