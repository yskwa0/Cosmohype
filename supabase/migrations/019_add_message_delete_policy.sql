-- 自分が送ったメッセージのみ削除可
create policy "messages_delete_own" on public.messages
  for delete using (
    sender_id = auth.uid()
    and conversation_id in (select public.get_my_conversation_ids())
  );
