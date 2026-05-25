-- 参加者が2人未満になった conversations を自動削除するトリガー
-- アカウント削除やその他の経路で conversation_participants が減った時に発火する
-- conversations を削除すると cascade で残りの参加者行・メッセージも全削除される

create or replace function public.cleanup_empty_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining int;
begin
  -- 会話がすでに削除済みの場合はスキップ（cascade の二重発火防止）
  if not exists (
    select 1 from public.conversations where id = OLD.conversation_id
  ) then
    return null;
  end if;

  select count(*) into remaining
  from public.conversation_participants
  where conversation_id = OLD.conversation_id;

  -- 1対1DM なので参加者が2人未満になったら会話ごと削除
  if remaining < 2 then
    delete from public.conversations where id = OLD.conversation_id;
  end if;

  return null;
end;
$$;

create trigger conversation_cleanup_trigger
  after delete on public.conversation_participants
  for each row
  execute function public.cleanup_empty_conversation();
