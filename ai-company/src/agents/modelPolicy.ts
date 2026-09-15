// AI HQ Phase 1: central model policy。
//
// 全 agent の model 選択をここに一元管理。 コード各所へ model 文字列をハードコードしない。
// 将来 OpenAI Agents SDK / 別 provider に移行する際も本ファイルだけ差し替えれば済む構造。
//
// User 指定 (2026-09-15):
//   defaultModel    = gpt-5.6-terra  (通常 agent 全員 / JURIN 通常処理)
//   reasoningModel  = gpt-5.6        (JURIN 最終 Decision / 複数意見衝突時)
//
// escalation 条件は shouldUseReasoningModel() で判定 (毎回 reasoning を使わずコスト抑制)。

import type { AgentId } from '../types'

/// 通常時に使うモデル。 大半のケースはこれ。
export const defaultModel = 'gpt-5.6-terra'

/// 高重要度 / 複雑な統合判断のみ使うモデル。 コストが高いので慎重に。
export const reasoningModel = 'gpt-5.6'

/// 環境変数で override 可能 (デプロイ後の model 変更をコード変更なしで行えるように)。
///   OPENAI_DEFAULT_MODEL   → defaultModel override
///   OPENAI_REASONING_MODEL → reasoningModel override
export function resolveDefaultModel(): string {
  return process.env.OPENAI_DEFAULT_MODEL || defaultModel
}
export function resolveReasoningModel(): string {
  return process.env.OPENAI_REASONING_MODEL || reasoningModel
}

/// JURIN が「最終 Decision を出す turn」で reasoning model を使うべきかを判定する。
/// 判定基準 (Phase 1):
///   - agentId が 'jurin' で、かつ以下いずれかを満たす:
///     (a) 呼び出した specialist が 2 人以上いて意見が衝突している
///     (b) CEO の質問文に高影響ワードが含まれる (broken / freeze / crash / 課金 / 広告 / 予算 等)
///     (c) 明示 `forceReasoning: true` が turn context に付与された
///   それ以外は default で通常 model を使う。
export interface EscalationContext {
  agentId: AgentId
  specialistOpinionsCollected: number
  conflictDetected: boolean
  ceoMessage: string
  forceReasoning?: boolean
}

const ESCALATION_KEYWORDS = [
  '固まる',
  'クラッシュ',
  'crash',
  '致命',
  '本番',
  '課金',
  '広告',
  '予算',
  '返金',
  '訴訟',
  'セキュリティ',
  '個人情報',
  'security',
  'privacy',
]

export function shouldUseReasoningModel(ctx: EscalationContext): boolean {
  if (ctx.agentId !== 'jurin') return false
  if (ctx.forceReasoning) return true
  if (ctx.conflictDetected && ctx.specialistOpinionsCollected >= 2) return true
  const msg = ctx.ceoMessage.toLowerCase()
  for (const kw of ESCALATION_KEYWORDS) {
    if (msg.includes(kw.toLowerCase())) return true
  }
  return false
}

/// Agent 個別の default model を返す。 現状は全員 defaultModel だが、
/// 将来 agent ごとに変えたい場合はここで分岐する (例: HINATA = 精度重視で reasoning、 等)。
export function modelForAgent(agentId: AgentId): string {
  void agentId // future: per-agent override
  return resolveDefaultModel()
}
