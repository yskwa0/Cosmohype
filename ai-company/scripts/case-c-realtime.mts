// AI HQ Phase 1: CASE C (COCONA / ROI 判断) + Supabase Realtime observer。
//
// このスクリプトは：
//  1. Test env の agent_messages に対して Supabase Realtime subscribe を張り、
//     UI が受け取るはずの INSERT event を実測ログする。
//  2. その状態で runJurinTurn() を叩いて CASE C を実 invoke。
//  3. Realtime で受信した順序 / 重複 / 全件到達を検証、DB 上の最終状態を突合。
//
// 実行:
//   source /tmp/aihq-testenv.sh
//   OPENAI_API_KEY=$OPENAI_API_KEY \
//   SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
//   SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
//   SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
//   npx tsx ai-company/scripts/case-c-realtime.mts

import { createClient } from '@supabase/supabase-js'
import { runJurinTurn } from '../src/orchestration/jurin.ts'
import type { AiHqSupabase } from '../src/types.ts'

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.SUPABASE_ANON_KEY
if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY required')
  process.exit(1)
}
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY required')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
}) as unknown as AiHqSupabase

// Realtime observer は service_role でも subscribe できるが、
// 実運用の admin ブラウザに近づけるため anon key ベースで subscribe し、
// realtime.set_auth() で service_role の JWT を渡して RLS を bypass する。
const observer = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { params: { eventsPerSecond: 20 } },
})
// service_role JWT を Realtime に注入 (RLS bypass)。
observer.realtime.setAuth(serviceRoleKey)

type Observed = {
  id: string
  message_type: string
  sender_type: string
  sender_agent: string | null
  created_at: string
  received_at: string
  monotonic: number
}

const observed: Observed[] = []
const seenIds = new Set<string>()
const duplicates: string[] = []
let subscribeStatus = 'unknown'

const CEO_TEXT =
  '広告で新規HYPE獲得に10万円を投じる提案が来てる。回すべきか？ROIと回収可能性、downsideリスク、今やるべきかまだ早いか、あなたたち全員で判断して。'
// channel 定義 (schema check): general/product/engineering/growth/marketing/research/business。
// COCONA は Finance/Strategy 担当のため business channel を使用。
const CHANNEL = 'business'

async function main() {
  console.log('========== CASE C: COCONA ROI 判断 ==========')
  console.log(`CEO: ${CEO_TEXT}`)

  // 1. thread 作成
  const { data: t, error: tErr } = await (admin as any)
    .from('agent_threads')
    .insert({ title: CEO_TEXT.slice(0, 60), channel: CHANNEL, status: 'open' })
    .select('id')
    .single()
  if (tErr || !t) {
    console.error('thread create failed', tErr)
    process.exit(1)
  }
  const threadId: string = t.id
  console.log(`thread_id = ${threadId}`)

  // 2. Realtime subscribe (thread filter)
  const channel = observer
    .channel(`agent_messages:${threadId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'agent_messages',
        filter: `thread_id=eq.${threadId}`,
      },
      (payload) => {
        const row = payload.new as any
        const ev: Observed = {
          id: row.id,
          message_type: row.message_type,
          sender_type: row.sender_type,
          sender_agent: row.sender_agent,
          created_at: row.created_at,
          received_at: new Date().toISOString(),
          monotonic: performance.now(),
        }
        if (seenIds.has(ev.id)) {
          duplicates.push(ev.id)
          console.log(`[RT-DUP] id=${ev.id} type=${ev.message_type} sender=${ev.sender_agent ?? ev.sender_type}`)
        } else {
          seenIds.add(ev.id)
          const who = ev.sender_agent ? ev.sender_agent.toUpperCase() : ev.sender_type.toUpperCase()
          console.log(`[RT] +${ev.monotonic.toFixed(0)}ms  ${ev.message_type}  ${who}`)
        }
        observed.push(ev)
      },
    )
    .subscribe((status) => {
      subscribeStatus = status
      console.log(`[RT] subscription status: ${status}`)
    })

  // subscribe 確立を待つ (WS handshake が SUBSCRIBED emit 後も完了していないケース対応)
  await new Promise((r) => setTimeout(r, 4000))

  // 3. runJurinTurn 実行
  const t0 = Date.now()
  const result = await runJurinTurn({ admin, threadId, ceoMessage: CEO_TEXT })
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`\n--- runJurinTurn result (${elapsed}s) ---`)
  console.log(JSON.stringify(result, null, 2))

  // Realtime の遅延吸収
  await new Promise((r) => setTimeout(r, 3000))
  await channel.unsubscribe()

  // 4. DB 上の全 messages を取得して Realtime との突合
  const { data: dbMsgs } = await (admin as any)
    .from('agent_messages')
    .select('id, message_type, sender_type, sender_agent, content, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  console.log(`\n--- DB messages (${dbMsgs?.length ?? 0}) ---`)
  for (const m of dbMsgs ?? []) {
    const who = m.sender_agent ? m.sender_agent.toUpperCase() : m.sender_type.toUpperCase()
    console.log(`  [${who}] (${m.message_type}) ${m.content.slice(0, 220)}${m.content.length > 220 ? '…' : ''}`)
  }

  // 5. Realtime received vs DB actual
  const dbIds = new Set((dbMsgs ?? []).map((m: any) => m.id))
  const rtIds = new Set(observed.map((o) => o.id))
  const missing = [...dbIds].filter((id) => !rtIds.has(id as string))
  const extra = [...rtIds].filter((id) => !dbIds.has(id))
  console.log('\n--- Realtime vs DB reconciliation ---')
  console.log(`DB rows: ${dbIds.size} / RT events: ${rtIds.size} / duplicates: ${duplicates.length}`)
  console.log(`missing from RT (in DB but not received): ${missing.length}`, missing)
  console.log(`extra in RT (received but not in DB): ${extra.length}`, extra)

  // Order check
  const dbOrder = (dbMsgs ?? []).map((m: any) => m.id)
  const rtOrder = observed.map((o) => o.id)
  const orderMatch =
    dbOrder.length === rtOrder.length && dbOrder.every((id: string, i: number) => id === rtOrder[i])
  console.log(`order match: ${orderMatch}`)

  // 6. decisions / tasks
  const { data: dec } = await (admin as any)
    .from('agent_decisions')
    .select('summary, reason, decided_by, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
  console.log('\n--- decisions ---')
  for (const d of dec ?? []) {
    console.log(`[${d.decided_by}] ${d.summary}`)
    console.log(`  reason: ${d.reason}`)
  }
  // agent_tasks に thread_id column が無いので、CASE C 直後の created_at で絞る
  const { data: tasks } = await (admin as any)
    .from('agent_tasks')
    .select('title, assigned_to, priority, requires_approval, created_at, created_by')
    .gte('created_at', new Date(t0 - 1000).toISOString())
    .order('created_at', { ascending: true })
  console.log(`\n--- tasks created since CASE C start (${tasks?.length ?? 0}) ---`)
  for (const tk of tasks ?? []) {
    console.log(`  [P${tk.priority}] ${tk.title} → ${tk.assigned_to} (approval=${tk.requires_approval}, by=${tk.created_by})`)
  }

  // 7. thought / duplicate 全 DB 検証
  const { count: thoughtCount } = await (admin as any)
    .from('agent_messages')
    .select('*', { count: 'exact', head: true })
    .eq('message_type', 'thought')
  console.log(`\n--- global invariants ---`)
  console.log(`thought rows across DB: ${thoughtCount}`)
  console.log(`duplicates within this thread's RT stream: ${duplicates.length}`)

  process.exit(0)
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
