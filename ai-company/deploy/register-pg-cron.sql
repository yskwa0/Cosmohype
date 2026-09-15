-- AI HQ Phase 2A: pg_cron / pg_net registration (Prod cutover 用、operational SQL)。
--
-- ★ この SQL は migration ではなく、Prod にリリースする直前に Supabase SQL Editor
--    (または Supabase CLI) で 1 度だけ手動実行する。
-- ★ 事前に Vault へ `ai_hq_scheduler_secret` を格納しておくこと (下記 STEP 0)。
-- ★ 既存 `cosmohype_transfer_worker_secret` / `marketplace_transfer_worker_secret` と
--    同じパターンを踏襲。 Cronは URL に対する pg_net.http_post、認証は Vault decrypt。

-- ---------------------------------------------------------------------
-- STEP 0: Vault へ scheduler secret を追加 (SQL Editor で 1 度だけ)。
--   ⚠ value は Vercel Production env の AI_HQ_SCHEDULER_SECRET と完全一致すること。
--   ⚠ SQL Editor から Vault へ insert する時は、value を SQL literal として入力する。
--     ここではプレースホルダのみ記載。 実際の値は Vercel env と手動で照合してから貼る。
-- ---------------------------------------------------------------------
-- INSERT INTO vault.secrets (name, secret)
--   VALUES ('ai_hq_scheduler_secret', '<PASTE_SAME_VALUE_AS_VERCEL_AI_HQ_SCHEDULER_SECRET>')
--   ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;

-- ---------------------------------------------------------------------
-- STEP 1: 既存の同名 cron を削除 (idempotent)。
-- ---------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT jobid FROM cron.job WHERE jobname LIKE 'ai_hq_%' LOOP
    PERFORM cron.unschedule(r.jobid);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- STEP 2: 4 slot を JST 基準で登録 (Supabase pg_cron の TZ は UTC。 JST=UTC+9)。
--   08:00 JST → 23:00 UTC 前日
--   12:00 JST → 03:00 UTC 当日
--   18:00 JST → 09:00 UTC 当日
--   22:00 JST → 13:00 UTC 当日
-- ---------------------------------------------------------------------
SELECT cron.schedule(
  'ai_hq_morning',
  '0 23 * * *',
  $$
    SELECT net.http_post(
      url := 'https://www.cosmohype.jp/api/ai-hq/scheduler/tick',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ai_hq_scheduler_secret' LIMIT 1)
      ),
      body := jsonb_build_object('slot','morning'),
      timeout_milliseconds := 30000
    );
  $$
);

SELECT cron.schedule(
  'ai_hq_kpi',
  '0 3 * * *',
  $$
    SELECT net.http_post(
      url := 'https://www.cosmohype.jp/api/ai-hq/scheduler/tick',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ai_hq_scheduler_secret' LIMIT 1)
      ),
      body := jsonb_build_object('slot','kpi'),
      timeout_milliseconds := 30000
    );
  $$
);

SELECT cron.schedule(
  'ai_hq_progress',
  '0 9 * * *',
  $$
    SELECT net.http_post(
      url := 'https://www.cosmohype.jp/api/ai-hq/scheduler/tick',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ai_hq_scheduler_secret' LIMIT 1)
      ),
      body := jsonb_build_object('slot','progress'),
      timeout_milliseconds := 30000
    );
  $$
);

SELECT cron.schedule(
  'ai_hq_daily',
  '0 13 * * *',
  $$
    SELECT net.http_post(
      url := 'https://www.cosmohype.jp/api/ai-hq/scheduler/tick',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ai_hq_scheduler_secret' LIMIT 1)
      ),
      body := jsonb_build_object('slot','daily'),
      timeout_milliseconds := 30000
    );
  $$
);

-- ---------------------------------------------------------------------
-- STEP 3: 確認 (cutover 時に select で結果を見る)。
-- ---------------------------------------------------------------------
-- SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname LIKE 'ai_hq_%' ORDER BY jobid;
