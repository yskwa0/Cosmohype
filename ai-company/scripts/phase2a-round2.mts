// AI HQ Phase 2A round-2 検証:
//   C2: MAYA → JURIA 自発 peer 呼出 (Marketing 連携必須な research_signal)
//   F-1..F-5: loop protection 実 reject 確認
//
// 実行:
//   source /tmp/aihq-testenv.sh
//   npx tsx ai-company/scripts/phase2a-round2.mts
//
// F 系は checkAddPeer / handleRequestPeer に対する unit 相当の direct 検証で OpenAI cost 0。
// C2 のみ実 OpenAI 呼び出しあり。

import { createClient } from '@supabase/supabase-js'
import type { AgentEventRow, AiHqSupabase, MeetingState } from '../src/types.ts'
import { runSpontaneousMeeting } from '../src/meetings/spontaneous.ts'
import { checkAddPeer, hashQuestion } from '../src/meetings/state.ts'

function need(k: string) {
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
const admin = createClient(url, sr, {
  auth: { autoRefreshToken: false, persistSession: false },
}) as unknown as AiHqSupabase

async function ensureEvent(fields: Partial<AgentEventRow> & { event_type: AgentEventRow['event_type']; title: string; summary: string; severity: AgentEventRow['severity'] }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('agent_events').insert({ source: 'phase2a-round2', payload: {}, ...fields })
    .select('*').single()
  if (error) throw error
  return data as AgentEventRow
}

async function testC2_MayaJuria() {
  console.log('\n===== TEST C2: MAYA が Marketing 連携必要と判断 → JURIA 呼出 =====')
  // Marketing 側 (JURIA) の判断がないと結論を出せない事項 (ブランド トーン & 具体クリエイティブ) を含める。
  const ev = await ensureEvent({
    event_type: 'research_signal',
    severity: 'medium',
    title: 'STYLE ID SNS 展開: 海外トレンド → 日本 Cosmohype 実施可否は Marketing 判断が必要',
    summary:
      '観察: US/EU で "ファッション診断 15秒動画" が急伸。 私 (MAYA) はトレンド観測はできるが、Cosmohype ブランド トーンにこの表現が合うか、既存投稿ユーザーへの見せ方、コピーの温度感、公式アカウントで具体的にどのフォーマットを採用するか、は Marketing 側 (JURIA) の判断領域。 自分だけでは "ブランド適合性" と "具体クリエイティブ方針" を確定できない。 request_peer で JURIA に確認したい。',
    payload: { region: 'US/EU', platforms: ['TikTok', 'Instagram Reels'], relevant_feature: 'STYLE ID', maya_can_answer_alone: false, need_marketing_call: true },
  })
  const meeting = await runSpontaneousMeeting(admin, ev)
  console.log('meeting result:', meeting)
  if (!meeting) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: msgs } = await (admin as any)
    .from('agent_messages')
    .select('sender_agent, message_type, content, metadata')
    .eq('thread_id', meeting.threadId)
    .order('created_at', { ascending: true })
  const participants = new Set(msgs?.filter((m: any) => m.sender_agent).map((m: any) => m.sender_agent))
  const jurinInParticipants = participants.has('jurin')
  console.log('participants:', [...participants])
  console.log('MAYA 発言:', !!msgs?.find((m: any) => m.sender_agent === 'maya'))
  console.log('JURIA 発言:', !!msgs?.find((m: any) => m.sender_agent === 'juria'))
  console.log('JURIN 参加 (medium sev で不参加 期待):', jurinInParticipants)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: thread } = await (admin as any)
    .from('agent_threads').select('metadata').eq('id', meeting.threadId).single()
  console.log('meeting_state after:', JSON.stringify(thread?.metadata?.meeting_state))
}

function testF1_maxParticipants() {
  console.log('\n===== TEST F-1: max_participants (5 人目 reject) =====')
  const state: MeetingState = {
    participants: ['harvey', 'hinata', 'juria', 'chisa'],
    round: 1,
    peer_requests: {},
    chain_depth: 1,
  }
  const r = checkAddPeer(state, 'harvey', 'cocona')
  console.log('  result:', r, '  expected: {ok:false, reason:max_participants}')
}

function testF2_peerRequestPerAgent() {
  console.log('\n===== TEST F-2: max_peer_requests (同一 agent 3 回目 reject) =====')
  const state: MeetingState = {
    participants: ['harvey', 'hinata'],
    round: 2,
    peer_requests: { harvey: 2 },
    chain_depth: 1,
  }
  const r = checkAddPeer(state, 'harvey', 'chisa')
  console.log('  result:', r, '  expected: {ok:false, reason:max_peer_requests}')
}

function testF3_duplicateQuestion() {
  console.log('\n===== TEST F-3: duplicate_question (同一 requester→target への同一質問 reject) =====')
  const q = 'onboarding step2 で離脱が増えている、UX 側原因の推定を'
  const state = {
    participants: ['harvey', 'chisa'],
    round: 1,
    peer_requests: { harvey: 1 },
    chain_depth: 0,
    question_hashes: { 'harvey->chisa': [hashQuestion(q)] },
  } as MeetingState
  const r = checkAddPeer(state, 'harvey', 'chisa', q)
  console.log('  result:', r, '  expected: {ok:false, reason:duplicate_question}')
}

function testF4_chainDepth() {
  console.log('\n===== TEST F-4: max_chain_depth (chain_depth=2 で reject) =====')
  const state: MeetingState = {
    participants: ['harvey', 'hinata', 'juria'],
    round: 2,
    peer_requests: { harvey: 1 },
    chain_depth: 2,
  }
  const r = checkAddPeer(state, 'juria', 'cocona')
  console.log('  result:', r, '  expected: {ok:false, reason:max_chain_depth}')
}

function testF5_rounds() {
  console.log('\n===== TEST F-5: max_rounds (round=3 で reject → force conclude) =====')
  const state: MeetingState = {
    participants: ['harvey', 'hinata'],
    round: 3,
    peer_requests: { harvey: 1 },
    chain_depth: 1,
  }
  const r = checkAddPeer(state, 'harvey', 'chisa')
  console.log('  result:', r, '  expected: {ok:false, reason:max_rounds}')
  console.log('  → 実装は tool result で reject を返すのみ、specialist は自ら結論を書いて終わる (=force conclude)')
}

async function main() {
  const cases = process.argv[2] ? process.argv[2].split(',') : ['C2', 'F1', 'F2', 'F3', 'F4', 'F5']
  for (const c of cases) {
    try {
      if (c === 'C2') await testC2_MayaJuria()
      if (c === 'F1') testF1_maxParticipants()
      if (c === 'F2') testF2_peerRequestPerAgent()
      if (c === 'F3') testF3_duplicateQuestion()
      if (c === 'F4') testF4_chainDepth()
      if (c === 'F5') testF5_rounds()
    } catch (err) {
      console.error(`TEST ${c} FAILED:`, err)
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
