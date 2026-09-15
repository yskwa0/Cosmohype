// AI HQ Phase 1: 共通型定義。
//
// agent_* テーブルの enum と 1:1 対応。 SoT は Supabase migration 側の CHECK 制約。

import type { SupabaseClient } from '@supabase/supabase-js'

/// AI HQ 用の Supabase client 型。
/// `types/database.ts` (generated) には agent_* テーブルがまだ含まれていないため、
/// ai-company 内では permissive な `SupabaseClient<any, any, any>` を採用する。
/// 型安全性は DB 側 CHECK 制約 / RLS / 本ファイル内 enum で担保する。
/// types 再生成後に必要ならタイト化する。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AiHqSupabase = SupabaseClient<any, any, any>

export const AGENT_IDS = [
  'jurin',
  'chisa',
  'hinata',
  'harvey',
  'juria',
  'maya',
  'cocona',
] as const
export type AgentId = (typeof AGENT_IDS)[number]

export const CHANNELS = [
  'general',
  'product',
  'engineering',
  'growth',
  'marketing',
  'research',
  'business',
] as const
export type Channel = (typeof CHANNELS)[number]

export type SenderType = 'human' | 'agent' | 'system'
/// ★ 2026-09-15 policy: **hidden thought / private chain-of-thought は DB に保存しない**。
/// 内部推論は OpenAI API 呼び出し中のみに留め、DB へ永続化する message_type は
/// 「他 Agent / CEO へ共有可能な要約・結論・根拠」に限定する。
/// 旧 `'thought'` case は本 union から撤廃 (Migration 238 で CHECK 制約からも削除)。
export type MessageType =
  | 'message'
  | 'tool_call'
  | 'decision_ref'
  | 'task_ref'

export type MemoryCategory =
  | 'company'
  | 'product'
  | 'engineering'
  | 'growth'
  | 'marketing'
  | 'research'
  | 'finance'
  | 'decision'

export interface AgentMessageRow {
  id: string
  thread_id: string
  sender_type: SenderType
  sender_agent: AgentId | null
  content: string
  message_type: MessageType
  metadata: Record<string, unknown>
  created_at: string
}

export interface AgentThreadRow {
  id: string
  title: string
  channel: Channel
  status: 'open' | 'resolved' | 'archived'
  created_at: string
  updated_at: string
}

export interface AgentMemoryRow {
  id: string
  category: MemoryCategory
  title: string
  content: string
  importance: number
  tags: string[]
  created_by: AgentId | null
  created_at: string
  updated_at: string
}

/// Agent の role 概要 (UI 表示 + prompt build 時に使う)。
export interface AgentDefinition {
  id: AgentId
  displayName: string
  role: string
  personaMarkdown: string // persona .md の全文
  /// この agent が default で使う model。 modelPolicy が override 可能。
  defaultModel?: string
}

/// 1 turn の tool 実行結果 (turn.ts が返す)。
export interface TurnResult {
  finalText: string
  toolCallsExecuted: number
  reasoningModelUsed: boolean
}
