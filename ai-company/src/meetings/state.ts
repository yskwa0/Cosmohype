// AI HQ Phase 2A: Meeting state — meeting 内の制約カウンタ管理。
//
// participants / round / peer_requests / chain_depth の限度チェック。
// 状態は agent_threads.metadata.meeting_state に永続化 (別 table を作らない)。

import { MEETING_LIMITS, type AgentId, type AiHqSupabase, type MeetingState, type ScheduledSlot } from '../types'
import { createHash } from 'node:crypto'

export async function loadMeetingState(admin: AiHqSupabase, threadId: string): Promise<MeetingState> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('agent_threads')
    .select('metadata')
    .eq('id', threadId)
    .maybeSingle()
  const m = (data?.metadata ?? {}) as Record<string, unknown>
  const ms = (m.meeting_state ?? {}) as Partial<MeetingState> & { question_hashes?: Record<string, string[]> }
  return {
    participants: (ms.participants as AgentId[]) ?? [],
    round: (ms.round as number) ?? 0,
    peer_requests: (ms.peer_requests as Partial<Record<AgentId, number>>) ?? {},
    chain_depth: (ms.chain_depth as number) ?? 0,
    triggered_by_event_id: (ms.triggered_by_event_id as string | null) ?? null,
    slot: ms.slot as ScheduledSlot | undefined,
    // 拡張フィールド: (requester → target) の question hash 履歴。 duplicate reject 用。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(ms.question_hashes ? { question_hashes: ms.question_hashes } : {}) as any,
  }
}

function questionKey(requester: AgentId, target: AgentId): string {
  return `${requester}->${target}`
}
export function hashQuestion(q: string): string {
  return createHash('sha256').update(q.trim().toLowerCase()).digest('base64url').slice(0, 12)
}
export function isDuplicateQuestion(
  state: MeetingState & { question_hashes?: Record<string, string[]> },
  requester: AgentId,
  target: AgentId,
  question: string,
): boolean {
  const key = questionKey(requester, target)
  const hs = state.question_hashes?.[key] ?? []
  return hs.includes(hashQuestion(question))
}
export function recordQuestion(
  state: MeetingState & { question_hashes?: Record<string, string[]> },
  requester: AgentId,
  target: AgentId,
  question: string,
): MeetingState & { question_hashes?: Record<string, string[]> } {
  const key = questionKey(requester, target)
  const map = { ...(state.question_hashes ?? {}) }
  const arr = map[key] ?? []
  map[key] = [...arr, hashQuestion(question)].slice(-5)
  return { ...state, question_hashes: map }
}

export async function saveMeetingState(admin: AiHqSupabase, threadId: string, state: MeetingState) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from('agent_threads')
    .select('metadata')
    .eq('id', threadId)
    .maybeSingle()
  const meta = (data?.metadata ?? {}) as Record<string, unknown>
  meta.meeting_state = state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('agent_threads').update({ metadata: meta }).eq('id', threadId)
}

export type LimitReason =
  | 'max_participants'
  | 'max_rounds'
  | 'max_peer_requests'
  | 'max_chain_depth'
  | 'duplicate_question'
export type LimitCheck = { ok: true } | { ok: false; reason: LimitReason }

/// peer add 時の限度チェック。
export function checkAddPeer(
  state: MeetingState & { question_hashes?: Record<string, string[]> },
  requester: AgentId,
  target: AgentId,
  question?: string,
): LimitCheck {
  if (state.participants.length >= MEETING_LIMITS.maxParticipants && !state.participants.includes(target)) {
    return { ok: false, reason: 'max_participants' }
  }
  if (state.round >= MEETING_LIMITS.maxRounds) return { ok: false, reason: 'max_rounds' }
  const reqCount = state.peer_requests[requester] ?? 0
  if (reqCount >= MEETING_LIMITS.maxPeerRequestsPerAgent) return { ok: false, reason: 'max_peer_requests' }
  if (state.chain_depth >= MEETING_LIMITS.maxChainDepth) return { ok: false, reason: 'max_chain_depth' }
  if (question && isDuplicateQuestion(state, requester, target, question)) {
    return { ok: false, reason: 'duplicate_question' }
  }
  return { ok: true }
}

export function applyAddPeer(state: MeetingState, requester: AgentId, target: AgentId): MeetingState {
  const newParticipants = state.participants.includes(target)
    ? state.participants
    : [...state.participants, target]
  const newPeerRequests = { ...state.peer_requests }
  newPeerRequests[requester] = (newPeerRequests[requester] ?? 0) + 1
  // requester 自身が already peer と呼ばれた人なら chain_depth +1
  const isRequesterAlsoPeer = state.chain_depth > 0 || state.participants.length > 1
  return {
    ...state,
    participants: newParticipants,
    peer_requests: newPeerRequests,
    chain_depth: isRequesterAlsoPeer ? state.chain_depth + 1 : state.chain_depth,
    round: state.round + 1,
  }
}
