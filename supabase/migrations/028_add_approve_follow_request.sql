-- フォローリクエスト承認用 RPC
-- 承認者 (target_id) が follower_id = requester_id の follows 行を作成できるよう
-- security definer で実行する（クライアント側 RLS を迂回）

create or replace function public.approve_follow_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req record;
begin
  select * into req
  from public.follow_requests
  where id = p_request_id;

  if not found then
    raise exception 'follow_request_not_found';
  end if;

  -- 実行者が申請先本人であることを確認
  if req.target_id != auth.uid() then
    raise exception 'not_authorized';
  end if;

  -- follows に追加（重複は無視）
  insert into public.follows (follower_id, following_id)
  values (req.requester_id, req.target_id)
  on conflict do nothing;

  -- リクエストを削除
  delete from public.follow_requests where id = p_request_id;
end;
$$;
