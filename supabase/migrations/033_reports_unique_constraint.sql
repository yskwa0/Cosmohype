-- reporter_id + target_type + target_id の組み合わせを一意にする（重複通報防止）
alter table public.reports
  add constraint reports_unique_per_target
  unique (reporter_id, target_type, target_id);
