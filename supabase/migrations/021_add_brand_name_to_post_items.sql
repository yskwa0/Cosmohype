-- brand_name カラムを追加し、category を任意に変更
alter table public.post_items add column if not exists brand_name text;
alter table public.post_items alter column category drop not null;
alter table public.post_items alter column category set default null;
