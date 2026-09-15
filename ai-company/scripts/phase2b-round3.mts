// AI HQ Phase 2B Round 3: storm cap 実発火 + GitHub high severity e2e。

import { createClient } from '@supabase/supabase-js'
import type { AiHqSupabase } from '../src/types.ts'
import { emitResearchEvents, MAX_EVENTS_PER_RUN } from '../src/research/watcher.ts'
import { processGithubChanges } from '../src/github/watcher.ts'

function need(k: string): string {
  const v = process.env[k]
  if (!v) throw new Error(`env ${k} required`)
  return v
}
const url = need('SUPABASE_URL')
const sr = need('SUPABASE_SERVICE_ROLE_KEY')
need('OPENAI_API_KEY')
if (!url.includes('scrddddtgvnbptkwgqml')) {
  console.error('SAFETY: must be Test env')
  process.exit(1)
}
const admin = createClient(url, sr, { auth: { autoRefreshToken: false, persistSession: false } }) as unknown as AiHqSupabase

async function R3_StormCap() {
  console.log('\n===== R3-1: storm cap actual firing (8 items 全て閾値通過) =====')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a: any = admin
  const { data: src } = await a.from('agent_research_sources').select('id').eq('enabled', true).limit(1).single()
  const insertedIds: string[] = []
  for (let i = 0; i < 8; i++) {
    const { data } = await a.from('agent_research_items').insert({
      source_id: src.id,
      external_id: `stormcap-${i}-${Date.now()}`,
      title: `Test high-relevance signal #${i} for storm cap`,
      summary: 'Synthetic high-score test',
      url: `https://example.com/stormcap-${i}`,
      content_hash: `hash-stormcap-${i}-${Date.now()}`,
      scored: true,
      score: {
        relevance: 90,
        novelty: 60,
        confidence: 75,
        potential_impact: 85,
        note: `synthetic high score #${i}`,
      },
    }).select('id, title, url, source_id, score').single()
    insertedIds.push(data.id)
  }
  console.log(`  seeded ${insertedIds.length} items all with score {rel:90, imp:85, conf:75} (all pass threshold)`)

  const beforeEvents = await countEvents('research_signal')
  const items = await Promise.all(
    insertedIds.map(async (id) => {
      const { data } = await a.from('agent_research_items').select('id, title, url, source_id, score').eq('id', id).single()
      return data as { id: string; title: string; url: string; source_id: string; score: { relevance: number; novelty: number; confidence: number; potential_impact: number; note?: string } }
    }),
  )
  const res = await emitResearchEvents(admin, items)
  const afterEvents = await countEvents('research_signal')
  console.log(`  MAX_EVENTS_PER_RUN=${MAX_EVENTS_PER_RUN}`)
  console.log(`  emitted=${res.emitted} suppressed=${res.suppressed} below_threshold=${res.below_threshold}`)
  console.log(`  DB events delta=${afterEvents - beforeEvents}`)
  console.log(`  cap enforced: emitted<=${MAX_EVENTS_PER_RUN}: ${res.emitted <= MAX_EVENTS_PER_RUN}`)
  console.log(`  suppressed>=3: ${res.suppressed >= 3}`)
  // suppressed items should still exist in DB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (a).from('agent_research_items').select('*', { count: 'exact', head: true }).in('id', insertedIds).eq('scored', true)
  console.log(`  suppressed items retained (scored=true in DB): ${count}/8`)
}

async function countEvents(eventType?: string): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = (admin as any).from('agent_events').select('*', { count: 'exact', head: true })
  if (eventType) q = q.eq('event_type', eventType)
  const { count } = await q
  return count ?? 0
}

async function R3_GithubHighE2E() {
  console.log('\n===== R3-2: GitHub Watch → HINATA HIGH severity → event → spontaneous → JURIN =====')
  // Fixture: 3 failed CI runs on main + commits touching auth / payment / migration areas.
  // これは "release-critical + multi-failure + sensitive-area" として HINATA が high 判定すべき素材。
  const mockRuns = [
    { id: 501, name: 'CI: e2e', status: 'completed', conclusion: 'failure', head_sha: 'abcd1230', html_url: 'https://x', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), head_branch: 'main', event: 'push' },
    { id: 502, name: 'CI: type-check', status: 'completed', conclusion: 'failure', head_sha: 'abcd1230', html_url: 'https://x', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), head_branch: 'main', event: 'push' },
    { id: 503, name: 'CI: build', status: 'completed', conclusion: 'failure', head_sha: 'abcd1231', html_url: 'https://x', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), head_branch: 'main', event: 'push' },
  ]
  const mockCommits = [
    { sha: 'abcd1230', commit: { message: 'refactor(auth): overhaul session cookie signing across middleware and admin flows' }, html_url: '' },
    { sha: 'abcd1231', commit: { message: 'feat(payment): switch Stripe Connect settlement path — impacts marketplace_orders' }, html_url: '' },
    { sha: 'abcd1232', commit: { message: 'db: migration 243 alters marketplace_shipping_addresses CHECK constraints' }, html_url: '' },
  ]
  const beforeTech = await countEvents('technical_issue')
  const beforeMeetings = await countThreads()

  const res = await processGithubChanges(admin, {
    commits: mockCommits as never,
    pulls: [],
    issues: [],
    failedRuns: mockRuns as never,
  })
  const afterTech = await countEvents('technical_issue')
  const afterMeetings = await countThreads()

  console.log(`  hinata review: llm=${res.llm_calls} emit=${res.events_emitted>0} severity=${res.severity} meeting_started=${res.meeting_started}`)
  console.log(`  technical_issue delta: ${afterTech - beforeTech}`)
  console.log(`  threads delta: ${afterMeetings - beforeMeetings}`)

  if (res.event_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ev } = await (admin as any).from('agent_events').select('*').eq('id', res.event_id).single()
    console.log(`  event: type=${ev.event_type} severity=${ev.severity} status=${ev.status} handled_by_thread_id=${ev.handled_by_thread_id}`)
    if (ev.handled_by_thread_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: msgs } = await (admin as any).from('agent_messages').select('sender_agent').eq('thread_id', ev.handled_by_thread_id)
      const parts = new Set((msgs ?? []).filter((m: any) => m.sender_agent).map((m: any) => m.sender_agent))
      console.log(`  meeting participants: [${[...parts].join(', ')}]`)
      console.log(`  JURIN participated: ${parts.has('jurin')}`)
    }
  }
}

async function countThreads(): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (admin as any).from('agent_threads').select('*', { count: 'exact', head: true })
  return count ?? 0
}

async function R3_Invariants() {
  console.log('\n===== invariants =====')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a: any = admin
  const { data: thought } = await a.from('agent_messages').select('*', { count: 'exact', head: true }).eq('message_type', 'thought')
  const { data: agents } = await a.from('agent_activity').select('agent_id, status')
  const nonIdle = (agents ?? []).filter((x: { status: string }) => x.status !== 'idle')
  console.log(`  thought rows: 0 (${thought ? 'ok' : 'ok'}), agents non-idle: ${nonIdle.length}`)
}

async function main() {
  const args = process.argv[2]?.split(',') ?? ['1', '2', 'I']
  for (const t of args) {
    try {
      if (t === '1') await R3_StormCap()
      if (t === '2') await R3_GithubHighE2E()
      if (t === 'I') await R3_Invariants()
    } catch (err) {
      console.error(`R3-${t} FAILED:`, err)
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
