-- Phase 3: DM機能 — テーブル定義のみ（RLSは別マイグレーションで追加）

-- conversations: 1対1のDMスレッド
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_updated_at_idx on public.conversations(updated_at desc);

create trigger set_conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- conversation_participants: スレッド参加者（1スレッドにつき2人）
create table if not exists public.conversation_participants (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  last_read_at    timestamptz,
  joined_at       timestamptz not null default now(),
  unique (conversation_id, user_id)
);

create index if not exists conv_participants_conversation_id_idx on public.conversation_participants(conversation_id);
create index if not exists conv_participants_user_id_idx         on public.conversation_participants(user_id);

-- messages: DMメッセージ本文
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on public.messages(conversation_id, created_at);
create index if not exists messages_sender_id_idx       on public.messages(sender_id);

-- user_blocks: DMブロック（1対1DM用）
-- ※ 汎用ブロックは public.blocks (007) で管理。DM固有のブロック制御に使う想定。
create table if not exists public.user_blocks (
  id         uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

create index if not exists user_blocks_blocker_id_idx on public.user_blocks(blocker_id);
create index if not exists user_blocks_blocked_id_idx on public.user_blocks(blocked_id);
