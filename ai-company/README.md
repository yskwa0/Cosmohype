# Cosmohype AI Company (Phase 1)

7 人の AI 社員 (JURIN + 6 specialists) + AI HQ Web UI で、CEO 1 人の会社運営を補助する
社内システムの Phase 1 実装。

## 構成

```
ai-company/
├─ agents/                # persona SoT (Markdown、runtime に読み込む)
│  ├─ jurin.md            # Chief of Staff (manager)
│  ├─ chisa.md            # Product / UX (関西弁)
│  ├─ hinata.md           # Engineering (静か・お淑やか)
│  ├─ harvey.md           # Growth (元気・標準語)
│  ├─ juria.md            # Marketing / SNS (優しい)
│  ├─ maya.md             # Research / Trend (元気・妹的)
│  └─ cocona.md           # Finance / Business (静か・クール)
├─ src/
│  ├─ agents/registry.ts        # Agent registry (TS 側、persona.md loader)
│  ├─ agents/modelPolicy.ts     # central model policy (通常 / reasoning 使い分け)
│  ├─ orchestration/jurin.ts    # JURIN manager orchestration
│  ├─ orchestration/turn.ts     # 1 turn 実行 helper
│  ├─ memory/session.ts         # 短期記憶 (thread 履歴)
│  ├─ memory/longterm.ts        # 長期記憶 repository (agent_memory)
│  ├─ tools/definitions.ts      # OpenAI tool 定義 (JSON schema)
│  ├─ tools/handlers.ts         # tool 実装 (READ / DRAFT)
│  ├─ types.ts                  # 共通型
│  └─ providers/openai.ts       # OpenAI Chat Completions wrapper
└─ README.md
```

## Phase 1 スコープ

- READ: DB / thread / decisions / memory を agent が読める
- DRAFT: agent_tasks / agent_decisions を agent が INSERT できる (実行はしない)
- EXECUTE: 一切なし (Phase 2 で human approval flow を追加)

## Model Policy

- 通常 agent (CHISA / HINATA / HARVEY / JURIA / MAYA / COCONA): `defaultModel` (gpt-5.6-terra)
- JURIN 最終 Decision / 複数意見衝突時: `reasoningModel` (gpt-5.6)
- ハードコードせず `src/agents/modelPolicy.ts` に一元化

## セキュリティ

- OpenAI API key: server-side only (`process.env.OPENAI_API_KEY`)
- Supabase service_role key: server-side only (`process.env.SUPABASE_SERVICE_ROLE_KEY`)
- agent_* テーブルは admin-only RLS (`profiles.role = 'admin'`)
- client bundle には secret が絶対に出ない

## 使い方 (Web AI HQ)

`/cosmohype-admin/ai-hq` を admin ログイン状態で開き、CEO input から
質問を送ると JURIN が受け取り、必要な specialist を呼んで返答する。

## Phase 2 で追加予定

- EXECUTE tool + human approval flow
- Cron / scheduled agent activity (朝会 / 夕会 / 日報)
- Embedding / vector search による memory (現在は tag + trigram)
- SNS / GitHub 実連携 (READ)
- 承認済み task の実行 handler
