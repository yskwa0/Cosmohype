-- =========================================================
-- 086: ORIGINAL 1000 検証用 read-only 診断 RPC
-- =========================================================
-- 目的:
--   085 で実装した ORIGINAL 1000 の 2 項目 (ledger 権限、trigger 状態) を
--   service_role 経由で empirically verify するための read-only 診断 RPC を追加する。
--
--   pg_catalog / information_schema は PostgREST 経由で公開されず、
--   supabase db dump は Docker 必須、local に DB password なし、
--   本番ユーザーの authenticated JWT も local に無いという制約下で
--   empirical verification の最小経路として提供する。
--
-- 特徴:
--   * SECURITY DEFINER (postgres として実行、has_table_privilege / pg_trigger にアクセス)
--   * データ変更なし、読み取り専用
--   * service_role のみ EXECUTE 可能 (anon / authenticated / PUBLIC は REVOKE)
--   * 返す情報は権限メタデータと trigger 状態のみ (user data leak なし)
--   * 永続 (今後の運用診断でも利用可)
-- =========================================================


BEGIN;


-- ---------------------------------------------------------
-- 1) Ledger 権限診断 RPC
--    anon / authenticated / service_role について
--    original1000_assignments への SELECT/INSERT/UPDATE/DELETE 権限を返す
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION _diag_check_original1000_ledger_privileges()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'table', 'original1000_assignments',
    'anon', jsonb_build_object(
      'select', has_table_privilege('anon',          'public.original1000_assignments', 'SELECT'),
      'insert', has_table_privilege('anon',          'public.original1000_assignments', 'INSERT'),
      'update', has_table_privilege('anon',          'public.original1000_assignments', 'UPDATE'),
      'delete', has_table_privilege('anon',          'public.original1000_assignments', 'DELETE')
    ),
    'authenticated', jsonb_build_object(
      'select', has_table_privilege('authenticated', 'public.original1000_assignments', 'SELECT'),
      'insert', has_table_privilege('authenticated', 'public.original1000_assignments', 'INSERT'),
      'update', has_table_privilege('authenticated', 'public.original1000_assignments', 'UPDATE'),
      'delete', has_table_privilege('authenticated', 'public.original1000_assignments', 'DELETE')
    ),
    'service_role', jsonb_build_object(
      'select', has_table_privilege('service_role',  'public.original1000_assignments', 'SELECT'),
      'insert', has_table_privilege('service_role',  'public.original1000_assignments', 'INSERT'),
      'update', has_table_privilege('service_role',  'public.original1000_assignments', 'UPDATE'),
      'delete', has_table_privilege('service_role',  'public.original1000_assignments', 'DELETE')
    ),
    'rls_enabled', (
      SELECT relrowsecurity
        FROM pg_class
       WHERE relname = 'original1000_assignments'
    ),
    'policy_count', (
      SELECT count(*)
        FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'original1000_assignments'
    )
  );
$$;

REVOKE ALL ON FUNCTION _diag_check_original1000_ledger_privileges() FROM PUBLIC;
REVOKE ALL ON FUNCTION _diag_check_original1000_ledger_privileges() FROM anon;
REVOKE ALL ON FUNCTION _diag_check_original1000_ledger_privileges() FROM authenticated;
-- service_role は Supabase の internal role で service_key 経由で invoke 可能

COMMENT ON FUNCTION _diag_check_original1000_ledger_privileges() IS
  '診断用 (read-only): original1000_assignments に対する各 role の権限、RLS enabled 状態、policy 数を返す。service_role のみ invoke 可能。';


-- ---------------------------------------------------------
-- 2) Trigger 状態診断 RPC
--    profiles の ORIGINAL 1000 系 3 trigger の存在・timing・event・enabled を返す
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION _diag_check_original1000_triggers()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_agg(
    jsonb_build_object(
      'trigger_name', t.tgname,
      'target_table', c.relname,
      'timing', CASE WHEN (t.tgtype::int & 2) = 2 THEN 'BEFORE' ELSE 'AFTER' END,
      'event',
        CASE
          WHEN (t.tgtype::int & 4)  = 4  THEN 'INSERT'
          WHEN (t.tgtype::int & 8)  = 8  THEN 'DELETE'
          WHEN (t.tgtype::int & 16) = 16 THEN 'UPDATE'
          ELSE 'OTHER'
        END,
      'enabled_state',
        CASE t.tgenabled
          WHEN 'O' THEN 'ENABLED'
          WHEN 'D' THEN 'DISABLED'
          WHEN 'R' THEN 'REPLICA'
          WHEN 'A' THEN 'ALWAYS'
          ELSE 'UNKNOWN'
        END,
      'function', p.proname,
      'is_internal', t.tgisinternal
    )
    ORDER BY t.tgname
  )
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_proc  p ON p.oid = t.tgfoid
   WHERE c.relname = 'profiles'
     AND t.tgname IN (
       'trg_assign_original1000_before_insert',
       'trg_link_original1000_after_insert',
       'trg_protect_original1000_number'
     )
     AND NOT t.tgisinternal;
$$;

REVOKE ALL ON FUNCTION _diag_check_original1000_triggers() FROM PUBLIC;
REVOKE ALL ON FUNCTION _diag_check_original1000_triggers() FROM anon;
REVOKE ALL ON FUNCTION _diag_check_original1000_triggers() FROM authenticated;

COMMENT ON FUNCTION _diag_check_original1000_triggers() IS
  '診断用 (read-only): profiles の ORIGINAL 1000 系 3 trigger の存在・timing・event・enabled 状態を返す。service_role のみ invoke 可能。';


COMMIT;
