// AI HQ Phase 2A: spontaneous meeting orchestrator。
//
// event を owner_agent が受けて thread を立て、必要なら peer を呼び、
// JURIN escalation 条件を満たせば JURIN が締めに入る。
// 会議終了時に event.status='handled' + handled_by_thread_id を書く。

import type { AgentEventRow, AgentId, AiHqSupabase, Channel, Severity } from '../types'
import { loadMeetingState, saveMeetingState } from './state'
import { callSpecialistOnce } from '../orchestration/specialist'
import { runJurinTurn } from '../orchestration/jurin'
import { isQuietHoursJst } from '../quiet-hours'

// event_type → 主担当 agent / channel の default mapping。
export const EVENT_OWNERS: Record<string, { agent: AgentId; channel: Channel }> = {
  kpi_anomaly: { agent: 'harvey', channel: 'growth' },
  research_signal: { agent: 'maya', channel: 'research' },
  technical_issue: { agent: 'hinata', channel: 'engineering' },
  product_signal: { agent: 'chisa', channel: 'product' },
  business_risk: { agent: 'cocona', channel: 'business' },
  task_blocked: { agent: 'jurin', channel: 'general' },
  manual: { agent: 'jurin', channel: 'general' },
}

function shouldEscalateToJurin(sev: Severity, participants: number, forceCross: boolean): boolean {
  if (sev === 'high' || sev === 'critical') return true
  if (participants >= 3) return true
  if (forceCross) return true
  return false
}

export interface SpontaneousResult {
  threadId: string
  ownerAgent: AgentId
  participants: AgentId[]
  jurinEscalated: boolean
  concluded: boolean
}

export async function runSpontaneousMeeting(
  admin: AiHqSupabase,
  event: AgentEventRow,
): Promise<SpontaneousResult | null> {
  // Quiet Hours + non-critical → dispatch を skip、pending にとどめる (呼び出し側で判定済想定)
  if (isQuietHoursJst() && event.severity !== 'critical') {
    return null
  }

  const owner = EVENT_OWNERS[event.event_type] ?? { agent: 'jurin', channel: 'general' as Channel }

  // thread を作成、meeting_state を初期化
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: t, error } = await (admin as any)
    .from('agent_threads')
    .insert({
      title: `[${event.event_type}] ${event.title}`.slice(0, 60),
      channel: owner.channel,
      status: 'open',
      metadata: {
        meeting_state: {
          participants: [owner.agent],
          round: 0,
          peer_requests: {},
          chain_depth: 0,
          triggered_by_event_id: event.id,
        },
        event_id: event.id,
        severity: event.severity,
      },
    })
    .select('id')
    .single()
  if (error || !t) throw new Error(`spontaneous thread create failed: ${(error as Error)?.message}`)
  const threadId = (t as { id: string }).id

  // event を dispatched に更新
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('agent_events')
    .update({ status: 'dispatched', dispatched_at: new Date().toISOString() })
    .eq('id', event.id)

  // 系イベントを thread へ system として痕跡
  await admin.from('agent_messages').insert({
    thread_id: threadId,
    sender_type: 'system',
    sender_agent: null,
    content: `【Event】 ${event.title}\n${event.summary}`,
    message_type: 'message',
    metadata: { event_id: event.id, severity: event.severity, source: event.source },
  })

  // owner の initial statement。 owner=JURIN の場合 (manual / task_blocked) は
  // specialist mode でなく直接 runJurinTurn (JURIN は specialist ではないため)。
  const ownerQuestion = event.summary
  const payloadStr = JSON.stringify(event.payload ?? {}).slice(0, 400)
  const contextSummary = `イベント種別: ${event.event_type} / severity: ${event.severity}\n${event.title}\npayload: ${payloadStr}`

  let jurinDirectDone = false
  if (owner.agent === 'jurin') {
    const ceoLike = `【自然発生: ${event.event_type} / ${event.severity}】\n${event.title}\n${event.summary}\n\n${contextSummary}\n\n必要なら call_specialist で 1〜3 人だけ呼び、Decision / Task を作って締めてください。`
    const r = await runJurinTurn({ admin, threadId, ceoMessage: ceoLike })
    jurinDirectDone = r.ok
  } else {
    await callSpecialistOnce({
      admin,
      threadId,
      specialistId: owner.agent,
      question: `以下の event に対して、あなたの担当領域から観察・仮説・次に確認すべき点を短くまとめてください。必要なら request_peer で 1〜2 名だけ相談してください。`,
      contextSummary: `${ownerQuestion}\n\n${contextSummary}`,
      model: 'gpt-5.6-terra',
      enablePeerTool: true,
    })
  }

  // 現状の meeting_state を再ロード
  const state = await loadMeetingState(admin, threadId)
  const forceCross = new Set(state.participants).size >= 3

  const jurinNeeded = !jurinDirectDone && shouldEscalateToJurin(event.severity, state.participants.length, forceCross)
  let concluded = jurinDirectDone

  if (jurinNeeded) {
    // JURIN に締めさせる (Phase 1 の runJurinTurn を再利用)
    const ceoLikeSummary = `【自然発生ミーティング】\n${event.title}\n参加者: ${state.participants.join(', ')}\nseverity: ${event.severity}\n\n${event.summary}\n\n${owner.agent} 以下、必要な specialist の意見が既に thread に記録されています。3 人の要点を統合し、Decision と (必要なら) Task を作って締めてください。`
    const res = await runJurinTurn({ admin, threadId, ceoMessage: ceoLikeSummary })
    concluded = res.ok
  }

  // event を handled に更新
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any)
    .from('agent_events')
    .update({
      status: 'handled',
      handled_at: new Date().toISOString(),
      handled_by_thread_id: threadId,
    })
    .eq('id', event.id)

  // meeting_state 最終保存 (JURIN が入ったなら participants に jurin 追加)
  if (jurinNeeded) {
    const newState = { ...state, participants: Array.from(new Set([...state.participants, 'jurin' as AgentId])) }
    await saveMeetingState(admin, threadId, newState)
  }

  return {
    threadId,
    ownerAgent: owner.agent,
    participants: state.participants,
    jurinEscalated: jurinNeeded,
    concluded,
  }
}
