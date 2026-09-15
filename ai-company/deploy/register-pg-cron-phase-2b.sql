-- AI HQ Phase 2B: Watch cron 登録 (Prod cutover 用 operational SQL)。
--
-- 前提: Phase 2A で ai_hq_scheduler_secret が Vault にセット済。 同じ secret を再利用する。
-- 追加ジョブ:
--   ai_hq_watch_research: JST 09:00/15:00/21:00 = UTC 00:00 / 06:00 / 12:00
--   ai_hq_watch_github  : 30 分ごと。 handler 側で Quiet Hours 判定して fetch skip。

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT jobid FROM cron.job WHERE jobname IN ('ai_hq_watch_research','ai_hq_watch_github') LOOP
    PERFORM cron.unschedule(r.jobid);
  END LOOP;
END $$;

SELECT cron.schedule(
  'ai_hq_watch_research',
  '0 0,6,12 * * *',
  $$
    SELECT net.http_post(
      url := 'https://www.cosmohype.jp/api/ai-hq/watch/research',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ai_hq_scheduler_secret' LIMIT 1)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 45000
    );
  $$
);

SELECT cron.schedule(
  'ai_hq_watch_github',
  '*/30 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://www.cosmohype.jp/api/ai-hq/watch/github',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ai_hq_scheduler_secret' LIMIT 1)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 45000
    );
  $$
);
