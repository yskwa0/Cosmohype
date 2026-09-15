// AI HQ Phase 1: OpenAI Chat Completions wrapper。
//
// @openai/agents SDK は使わない (Phase 1 スコープ)。 素の fetch で Chat Completions API を呼び、
// tool_calls を自前ハンドリングする。 既存 `app/api/style-check/route.ts` と同じパターン。
//
// 将来 SDK 移行する場合はこのファイルだけ差し替えれば済むよう、 orchestration 層から
// 直接 OpenAI に依存させない (call() 関数のみを export する)。

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

export type Role = 'system' | 'user' | 'assistant' | 'tool'

export interface ChatMessage {
  role: Role
  content: string | null
  name?: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string // JSON string
  }
}

export interface ToolDef {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required?: string[]
      additionalProperties?: boolean
    }
  }
}

export interface CallParams {
  model: string
  messages: ChatMessage[]
  tools?: ToolDef[]
  toolChoice?: 'auto' | 'none' | 'required'
  temperature?: number
  maxTokens?: number
  /// gpt-5.6 系の reasoning_effort。 function tools を使うには 'none' が必要 (2026-09 時点)。
  /// 未指定なら 'none' (安全 default = tool_calls が確実に発火)。
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high'
}

export interface CallResult {
  content: string | null
  toolCalls: ToolCall[]
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter' | string
}

export class OpenAIError extends Error {
  status: number
  body: unknown
  constructor(status: number, body: unknown, message: string) {
    super(message)
    this.status = status
    this.body = body
  }
}

/// OpenAI Chat Completions API を叩く共通関数。
/// - env `OPENAI_API_KEY` を必須とする。 未設定なら throw。
/// - Phase 1: temperature default 0.7 (人格差を出す)、maxTokens default 800。
/// - リトライは呼び出し側の判断に任せる (本関数は 1 回だけ試みる)。
export async function call(params: CallParams): Promise<CallResult> {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    throw new OpenAIError(0, null, 'OPENAI_API_KEY is not set')
  }

  // ★ 2026-09-15: gpt-5.6 系仕様に合わせる:
  //   ・`max_tokens` は廃止 → `max_completion_tokens`
  //   ・`temperature` は unsupported の可能性があるため明示指定時のみ送信
  //   ・function tools を使う時は `reasoning_effort: "none"` が必要
  //     (未指定 400 error: "Function tools with reasoning_effort are not supported for gpt-5.6-terra")
  //   ・default reasoning_effort = 'none' = tool_calls が確実に発火する
  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    max_completion_tokens: params.maxTokens ?? 800,
    reasoning_effort: params.reasoningEffort ?? 'none',
  }
  if (typeof params.temperature === 'number') {
    body.temperature = params.temperature
  }
  if (params.tools && params.tools.length > 0) {
    body.tools = params.tools
    body.tool_choice = params.toolChoice ?? 'auto'
  }

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new OpenAIError(res.status, errBody, `OpenAI API ${res.status}`)
  }

  const data = await res.json()
  const choice = data.choices?.[0]
  const msg = choice?.message ?? {}
  return {
    content: typeof msg.content === 'string' ? msg.content : null,
    toolCalls: Array.isArray(msg.tool_calls) ? (msg.tool_calls as ToolCall[]) : [],
    usage: data.usage,
    finishReason: choice?.finish_reason ?? 'stop',
  }
}
