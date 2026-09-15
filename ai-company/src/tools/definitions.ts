// AI HQ Phase 1: OpenAI tool 定義 (JSON schema)。
//
// JURIN が使える tool のみを定義。 specialist 呼び出しは jurin.ts の
// callSpecialist(agentId, question) をそのまま tool として expose する。
//
// Phase 1: READ / DRAFT のみ。 EXECUTE tool は一切定義しない (誤発火防止)。

import type { ToolDef } from '../providers/openai'

/// callSpecialist(agentId, question) — 他の 6 人の specialist を呼ぶ tool。
/// JURIN のみが使用する (specialist が specialist を呼ぶ handoff は Phase 1 では禁止 =
/// 循環会話を防ぐ)。
export const CALL_SPECIALIST: ToolDef = {
  type: 'function',
  function: {
    name: 'call_specialist',
    description:
      '専門 agent (CHISA/HINATA/HARVEY/JURIA/MAYA/COCONA) の 1 人に質問を送り、回答を受け取る。 JURIN のみが使用する。',
    parameters: {
      type: 'object',
      properties: {
        agent_id: {
          type: 'string',
          enum: ['chisa', 'hinata', 'harvey', 'juria', 'maya', 'cocona'],
          description: '呼び出す specialist の ID',
        },
        question: {
          type: 'string',
          description: 'その specialist に聞きたいこと (簡潔に、100〜400 文字)',
        },
        context_summary: {
          type: 'string',
          description:
            'この質問の背景 (CEO の元質問、他 specialist の要点)。 specialist は agent_memory を持たないためここに context を集約する。',
        },
      },
      required: ['agent_id', 'question'],
      additionalProperties: false,
    },
  },
}

/// search_company_memory — agent_memory を検索する tool。
export const SEARCH_MEMORY: ToolDef = {
  type: 'function',
  function: {
    name: 'search_company_memory',
    description:
      'Cosmohype の長期記憶 (会社の方針、過去の Decision、既存仕様、Growth 実験結果、Research 週報 等) を検索する。',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: [
            'company',
            'product',
            'engineering',
            'growth',
            'marketing',
            'research',
            'finance',
            'decision',
          ],
        },
        keyword: { type: 'string', description: 'ILIKE 検索するキーワード (2 文字以上)' },
        tags: { type: 'array', items: { type: 'string' } },
        min_importance: { type: 'integer', minimum: 1, maximum: 5 },
      },
      additionalProperties: false,
    },
  },
}

/// draft_decision — JURIN が最終 Decision を DRAFT として作成する tool。
export const DRAFT_DECISION: ToolDef = {
  type: 'function',
  function: {
    name: 'draft_decision',
    description:
      '結論を agent_decisions に DRAFT として保存する。 EXECUTE ではなく記録のみ (人間承認はまだ不要、記録は残す)。',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: '結論の一文サマリ' },
        reason: { type: 'string', description: '理由 (100〜400 文字)' },
      },
      required: ['summary'],
      additionalProperties: false,
    },
  },
}

/// draft_task — actionable task を agent_tasks に DRAFT として保存する。
/// requires_approval = true default = 実行には人間承認が必要 (Phase 2 で実行 handler 追加)。
export const DRAFT_TASK: ToolDef = {
  type: 'function',
  function: {
    name: 'draft_task',
    description:
      'JURIN が Decision の結果として actionable task を agent_tasks に DRAFT する。 実行 (EXECUTE) は人間承認が必要。',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        assigned_to: {
          type: 'string',
          enum: ['jurin', 'chisa', 'hinata', 'harvey', 'juria', 'maya', 'cocona'],
        },
        priority: { type: 'integer', minimum: 1, maximum: 5, default: 3 },
      },
      required: ['title'],
      additionalProperties: false,
    },
  },
}

/// JURIN が最終的に会話を終了する時に呼ぶ tool。
/// 最終まとめテキストを引数で渡し、handler 側で agent_messages に system record として INSERT する。
export const CONCLUDE_TURN: ToolDef = {
  type: 'function',
  function: {
    name: 'conclude_turn',
    description:
      '最終まとめを CEO 向けに 1 つのメッセージにして thread に投稿し、この turn を終了する。',
    parameters: {
      type: 'object',
      properties: {
        final_summary: {
          type: 'string',
          description:
            '「状況 / 各 specialist の要点 / 結論 / Next Action」の 4 セクションで簡潔にまとめる。 300〜800 文字目安。',
        },
      },
      required: ['final_summary'],
      additionalProperties: false,
    },
  },
}

export const JURIN_TOOLS: ToolDef[] = [
  CALL_SPECIALIST,
  SEARCH_MEMORY,
  DRAFT_DECISION,
  DRAFT_TASK,
  CONCLUDE_TURN,
]

/// specialist は tool を持たない (READ / DRAFT すら Phase 1 では JURIN 経由に集約)。
/// specialist は "自分の意見を content で返すだけ" というシンプル設計 = 循環回避。
export const SPECIALIST_TOOLS: ToolDef[] = []

/// Phase 2A: spontaneous meeting 内でのみ specialist に解禁される peer request tool。
/// meeting_state による限度 (participants=4, rounds=3, peer_requests=2/agent, chain_depth=2) を
/// handler 側で強制する。 depth 超過 / round 超過は tool result で reject を返し、
/// specialist は自ら Decision を作らずに終わる (JURIN 委譲 or 結論のみ)。
export const REQUEST_PEER: ToolDef = {
  type: 'function',
  function: {
    name: 'request_peer',
    description:
      '会議中に別 specialist へ短い質問を投げて意見を集める。 conversation を長引かせるためではなく、\
自分の担当領域外の観点が必要な時だけ使う。 limit を超えると reject される。',
    parameters: {
      type: 'object',
      properties: {
        agent_id: {
          type: 'string',
          enum: ['chisa', 'hinata', 'harvey', 'juria', 'maya', 'cocona'],
          description: '相談したい peer specialist の ID',
        },
        question: {
          type: 'string',
          description: '相談内容 (100〜300 文字)',
        },
        context_summary: {
          type: 'string',
          description: '会議の要旨と、この peer に見てほしい観点',
        },
      },
      required: ['agent_id', 'question'],
      additionalProperties: false,
    },
  },
}

/// spontaneous meeting 中の specialist が使える tool 集合。
/// 通常 chat の specialist は SPECIALIST_TOOLS=[] のまま (Phase 1 互換)。
export const SPECIALIST_MEETING_TOOLS: ToolDef[] = [REQUEST_PEER]
