create or replace function public.remove_follower(p_follower_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 呼び出し者が following_id（フォローされている側）であることを確認
  if not exists (
    select 1 from follows
    where follower_id  = p_follower_id
      and following_id = auth.uid()
  ) then
    raise exception 'not found';
  end if;

  delete from follows
  where follower_id  = p_follower_id
    and following_id = auth.uid();
end;
$$;
