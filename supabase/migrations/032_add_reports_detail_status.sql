-- reports テーブルに detail（その他の詳細）と status（処理状態）を追加
alter table public.reports
  add column if not exists detail text,
  add column if not exists status text not null default 'pending';
