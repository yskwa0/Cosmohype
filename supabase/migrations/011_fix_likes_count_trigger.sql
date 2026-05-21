-- likes_count トリガーを再作成（冪等）
create or replace function public.update_likes_count()
returns trigger language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'INSERT') then
    update public.posts set likes_count = likes_count + 1 where id = NEW.post_id;
  elsif (TG_OP = 'DELETE') then
    update public.posts set likes_count = greatest(0, likes_count - 1) where id = OLD.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists likes_count_trigger on public.likes;
create trigger likes_count_trigger
  after insert or delete on public.likes
  for each row execute function public.update_likes_count();

-- 既存の likes_count を likes テーブルの実数に同期
update public.posts
set likes_count = (
  select count(*) from public.likes where post_id = posts.id
);
