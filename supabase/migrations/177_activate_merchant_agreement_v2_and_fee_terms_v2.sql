-- =============================================================================
-- Migration 177: Merchant Agreement v2 + Fee Settlement Terms v2 formal activation
--
-- Phase 4-C.8 (v2 activation)。 Phase 4-B / 4-C.7 (Migration 168 / 172 / 175) で
-- seed した v1 registry + brand fee_term を、日本語化・平文化した v2 に current を
-- 差し替える。 v1 履歴・v1 acceptance・v1 の brand row は保持し、per-brand で
-- v2 row を新規発行する (v2 は未 accept 状態で発行し、owner の accept は本
-- migration の外で clickwrap 経由に委ねる)。
--
-- ==============================================================================
-- 【要件】(user 指示より)
--
--   Merchant Agreement:
--     - shop_merchant_agreement_versions:
--         v1 row は削除禁止 / hash 変更禁止 / is_current を false に flip
--         v2 row を新規 INSERT (is_current=true, agreement_hash=NEW_MA_V2_HASH)
--     - shop_brand_agreement_acceptances:
--         v1 acceptance row は削除・変更禁止 (agreement_hash / accepted_at 全て touch しない)
--         v2 acceptance は 0 のまま (この migration では発行しない)
--
--   Fee Settlement Terms:
--     - shop_fee_settlement_terms_versions:
--         v1 row は保持 / is_current を false に flip
--         v2 row を新規 INSERT (is_current=true, terms_hash=NEW_FT_V2_HASH)
--
--   Brand Fee Term:
--     - shop_brand_fee_settlement_terms:
--         v1 row は削除禁止 / accepted_at / accepted_by_user_id 変更禁止 /
--                 is_active を false に flip
--         v2 row を per-brand で新規 INSERT
--           - is_active=true
--           - platform_fee_rate_bps=1000 (v1 と同率、10%)
--           - accepted_at=NULL, accepted_by_user_id=NULL (未 accept)
--
-- ==============================================================================
-- 【Pre-assert】(いずれか不一致で RAISE EXCEPTION → 全 rollback)
--
--   [1] MA schema 列 assumption (agreement_hash / is_current) が実 schema に存在
--       (本 repo に Migration 168 SQL が無いため information_schema で verify)
--   [2] shop_merchant_agreement_versions に (version='v1', is_current=true) が 1 件
--       かつ agreement_hash = EXPECTED_MA_V1_HASH
--   [3] shop_brand_agreement_acceptances に (agreement_version='v1',
--       agreement_hash=EXPECTED_MA_V1_HASH) が ≥1 件、かつ v1 acceptance で
--       hash 不一致 row が 0 件
--   [4] shop_merchant_agreement_versions に version='v2' row が 0 件 (未 apply)
--   [5] shop_fee_settlement_terms_versions に (version='v1', is_current=true) が 1 件
--       かつ terms_hash = EXPECTED_FT_V1_HASH
--   [6] shop_fee_settlement_terms_versions に version='v2' row が 0 件 (未 apply)
--   [7] shop_brand_fee_settlement_terms:
--       (a) is_active=true かつ terms_version='v1' の row が brand ごとに ≤1 件
--           (重複 active row が無い)
--       (b) is_active=true の row は全て accepted_at IS NULL (要件: 未 accept)
--       (c) is_active=true の row は全て (terms_version='v1',
--           terms_hash=EXPECTED_FT_V1_HASH)
--       (d) terms_version='v2' row が 0 件 (未 apply)
--
-- ==============================================================================
-- 【Post-assert】
--
--   MA:  is_current=true row が (v2, NEW_MA_V2_HASH) の 1 行だけ
--   FT:  is_current=true row が (v2, NEW_FT_V2_HASH) の 1 行だけ
--   Brand Fee Term:
--        - v1 deactivation の UPDATE row 数 = 事前 active v1 row 数
--        - v2 INSERT の row 数 = 事前 active v1 row 数
--        - brand ごとの active row 数 = 1
--        - 全 active row が (v2, NEW_FT_V2_HASH, rate=1000, accepted_at IS NULL,
--          accepted_by_user_id IS NULL) を満たす
--
-- ==============================================================================
-- 【Hashes】(算出方法: lib/{merchantAgreement,feeSettlementTerms}/hash.ts の
--            stableStringify(SHA-256) を content.json v1/v2 に適用)
--
--   EXPECTED_MA_V1_HASH = 69fc73d0a04e532b7343e08d25fdbd0790a707ae2971f7323dbe3f7852c2aad9
--   EXPECTED_FT_V1_HASH = 995fe47866a06a5ebc2c3db6ec208106b6b93c17ae922c518cb6caf6f790a073
--   NEW_MA_V2_HASH      = 56d2d40c69a007aedf36c5ec4e8fd0a9fd4bc19a030c25dba6f5b328fc081e23
--   NEW_FT_V2_HASH      = f1aa6ebf3b9154dfa5bda33fe46ebd4473fba46ed8ee1e165a43f4cbe0ac8cd8
-- =============================================================================

BEGIN;

DO $migration_177$
DECLARE
  -- ----------------------------------------------------------------------------
  -- Constants
  -- ----------------------------------------------------------------------------
  EXPECTED_MA_V1_HASH CONSTANT TEXT :=
    '69fc73d0a04e532b7343e08d25fdbd0790a707ae2971f7323dbe3f7852c2aad9';
  EXPECTED_FT_V1_HASH CONSTANT TEXT :=
    '995fe47866a06a5ebc2c3db6ec208106b6b93c17ae922c518cb6caf6f790a073';
  NEW_MA_V2_HASH      CONSTANT TEXT :=
    '56d2d40c69a007aedf36c5ec4e8fd0a9fd4bc19a030c25dba6f5b328fc081e23';
  NEW_FT_V2_HASH      CONSTANT TEXT :=
    'f1aa6ebf3b9154dfa5bda33fe46ebd4473fba46ed8ee1e165a43f4cbe0ac8cd8';

  -- ----------------------------------------------------------------------------
  -- Working vars
  -- ----------------------------------------------------------------------------
  v_col_ma_reg_hash        INTEGER;
  v_col_ma_reg_is_current  INTEGER;
  v_col_ma_acc_hash        INTEGER;

  v_ma_current_count       INTEGER;
  v_ma_registry_hash       TEXT;
  v_ma_v2_exists           INTEGER;
  v_ma_v1_accept_match     INTEGER;
  v_ma_v1_accept_bad_hash  INTEGER;

  v_ft_current_count       INTEGER;
  v_ft_registry_hash       TEXT;
  v_ft_v2_exists           INTEGER;

  v_brand_dup_v1_active    INTEGER;
  v_brand_active_accepted  INTEGER;
  v_brand_active_bad_hash  INTEGER;
  v_brand_v2_exists        INTEGER;
  v_brand_v1_active_total  INTEGER;

  v_rows_updated           INTEGER;
  v_rows_inserted          INTEGER;

  v_post_dup_active        INTEGER;
  v_post_bad_active        INTEGER;
BEGIN
  ----------------------------------------------------------------------------
  -- [Assert 1] MA schema 列 assumption
  --   本 repo には Migration 168 SQL が commit されていないため、
  --   agreement_hash / is_current の naming assumption を DB 側で verify する。
  ----------------------------------------------------------------------------
  SELECT COUNT(*) INTO v_col_ma_reg_hash
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'shop_merchant_agreement_versions'
    AND column_name  = 'agreement_hash';
  IF v_col_ma_reg_hash = 0 THEN
    RAISE EXCEPTION
      'Migration 177 abort [Assert 1a]: expected column shop_merchant_agreement_versions.agreement_hash not found. Verify Migration 168 schema and rename column reference.';
  END IF;

  SELECT COUNT(*) INTO v_col_ma_reg_is_current
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'shop_merchant_agreement_versions'
    AND column_name  = 'is_current';
  IF v_col_ma_reg_is_current = 0 THEN
    RAISE EXCEPTION
      'Migration 177 abort [Assert 1b]: expected column shop_merchant_agreement_versions.is_current not found.';
  END IF;

  SELECT COUNT(*) INTO v_col_ma_acc_hash
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'shop_brand_agreement_acceptances'
    AND column_name  = 'agreement_hash';
  IF v_col_ma_acc_hash = 0 THEN
    RAISE EXCEPTION
      'Migration 177 abort [Assert 1c]: expected column shop_brand_agreement_acceptances.agreement_hash not found. Verify Migration 168 acceptance schema and rename column reference.';
  END IF;

  ----------------------------------------------------------------------------
  -- [Assert 2] MA v1 registry: exactly 1 (v1, is_current=true) with hash match
  ----------------------------------------------------------------------------
  SELECT COUNT(*) INTO v_ma_current_count
  FROM shop_merchant_agreement_versions
  WHERE version    = 'v1'
    AND is_current = true;
  IF v_ma_current_count <> 1 THEN
    RAISE EXCEPTION
      'Migration 177 abort [Assert 2a]: expected exactly 1 shop_merchant_agreement_versions row (version=v1, is_current=true), found %',
      v_ma_current_count;
  END IF;

  SELECT agreement_hash INTO v_ma_registry_hash
  FROM shop_merchant_agreement_versions
  WHERE version    = 'v1'
    AND is_current = true;
  IF v_ma_registry_hash IS DISTINCT FROM EXPECTED_MA_V1_HASH THEN
    RAISE EXCEPTION
      'Migration 177 abort [Assert 2b]: MA v1 registry hash mismatch. expected=%, actual=%',
      EXPECTED_MA_V1_HASH, COALESCE(v_ma_registry_hash, '(null)');
  END IF;

  ----------------------------------------------------------------------------
  -- [Assert 3] MA v1 acceptance: ≥1 matched row, 0 mismatched row
  ----------------------------------------------------------------------------
  SELECT COUNT(*) INTO v_ma_v1_accept_match
  FROM shop_brand_agreement_acceptances
  WHERE agreement_version = 'v1'
    AND agreement_hash    = EXPECTED_MA_V1_HASH;
  IF v_ma_v1_accept_match < 1 THEN
    RAISE EXCEPTION
      'Migration 177 abort [Assert 3a]: expected at least 1 shop_brand_agreement_acceptances row with (agreement_version=v1, agreement_hash=EXPECTED_MA_V1_HASH), found 0';
  END IF;

  SELECT COUNT(*) INTO v_ma_v1_accept_bad_hash
  FROM shop_brand_agreement_acceptances
  WHERE agreement_version = 'v1'
    AND agreement_hash IS DISTINCT FROM EXPECTED_MA_V1_HASH;
  IF v_ma_v1_accept_bad_hash > 0 THEN
    RAISE EXCEPTION
      'Migration 177 abort [Assert 3b]: found % v1 acceptance row(s) with agreement_hash != EXPECTED_MA_V1_HASH. Investigate before proceeding.',
      v_ma_v1_accept_bad_hash;
  END IF;

  ----------------------------------------------------------------------------
  -- [Assert 4] MA v2 registry not yet present (idempotency)
  ----------------------------------------------------------------------------
  SELECT COUNT(*) INTO v_ma_v2_exists
  FROM shop_merchant_agreement_versions
  WHERE version = 'v2';
  IF v_ma_v2_exists <> 0 THEN
    RAISE EXCEPTION
      'Migration 177 abort [Assert 4]: shop_merchant_agreement_versions v2 already exists (% row(s)). Migration 177 is not idempotent by design; investigate before re-run.',
      v_ma_v2_exists;
  END IF;

  ----------------------------------------------------------------------------
  -- [Assert 5] FT v1 registry: exactly 1 (v1, is_current=true) with hash match
  ----------------------------------------------------------------------------
  SELECT COUNT(*) INTO v_ft_current_count
  FROM shop_fee_settlement_terms_versions
  WHERE version    = 'v1'
    AND is_current = true;
  IF v_ft_current_count <> 1 THEN
    RAISE EXCEPTION
      'Migration 177 abort [Assert 5a]: expected exactly 1 shop_fee_settlement_terms_versions row (version=v1, is_current=true), found %',
      v_ft_current_count;
  END IF;

  SELECT terms_hash INTO v_ft_registry_hash
  FROM shop_fee_settlement_terms_versions
  WHERE version    = 'v1'
    AND is_current = true;
  IF v_ft_registry_hash IS DISTINCT FROM EXPECTED_FT_V1_HASH THEN
    RAISE EXCEPTION
      'Migration 177 abort [Assert 5b]: FT v1 registry hash mismatch. expected=%, actual=%',
      EXPECTED_FT_V1_HASH, COALESCE(v_ft_registry_hash, '(null)');
  END IF;

  ----------------------------------------------------------------------------
  -- [Assert 6] FT v2 registry not yet present (idempotency)
  ----------------------------------------------------------------------------
  SELECT COUNT(*) INTO v_ft_v2_exists
  FROM shop_fee_settlement_terms_versions
  WHERE version = 'v2';
  IF v_ft_v2_exists <> 0 THEN
    RAISE EXCEPTION
      'Migration 177 abort [Assert 6]: shop_fee_settlement_terms_versions v2 already exists (% row(s)). Migration 177 is not idempotent; investigate before re-run.',
      v_ft_v2_exists;
  END IF;

  ----------------------------------------------------------------------------
  -- [Assert 7] Brand Fee Term (per-brand invariants)
  --   (a) 各 brand につき active v1 row は 0 or 1 件
  --   (b) 全 active row は accepted_at IS NULL
  --   (c) 全 active row は (v1, EXPECTED_FT_V1_HASH)
  --   (d) v2 row 未存在
  ----------------------------------------------------------------------------
  -- (a)
  SELECT COUNT(*) INTO v_brand_dup_v1_active
  FROM (
    SELECT brand_id
    FROM shop_brand_fee_settlement_terms
    WHERE is_active = true
      AND terms_version = 'v1'
    GROUP BY brand_id
    HAVING COUNT(*) > 1
  ) dup;
  IF v_brand_dup_v1_active > 0 THEN
    RAISE EXCEPTION
      'Migration 177 abort [Assert 7a]: % brand(s) have more than one active v1 shop_brand_fee_settlement_terms row',
      v_brand_dup_v1_active;
  END IF;

  -- (b)
  SELECT COUNT(*) INTO v_brand_active_accepted
  FROM shop_brand_fee_settlement_terms
  WHERE is_active   = true
    AND accepted_at IS NOT NULL;
  IF v_brand_active_accepted > 0 THEN
    RAISE EXCEPTION
      'Migration 177 abort [Assert 7b]: % active shop_brand_fee_settlement_terms row(s) have accepted_at IS NOT NULL. Requirement: v1 brand fee_term is un-accepted before migration.',
      v_brand_active_accepted;
  END IF;

  -- (c)
  SELECT COUNT(*) INTO v_brand_active_bad_hash
  FROM shop_brand_fee_settlement_terms
  WHERE is_active = true
    AND (terms_version IS DISTINCT FROM 'v1'
      OR terms_hash    IS DISTINCT FROM EXPECTED_FT_V1_HASH);
  IF v_brand_active_bad_hash > 0 THEN
    RAISE EXCEPTION
      'Migration 177 abort [Assert 7c]: % active row(s) have (terms_version, terms_hash) != (v1, EXPECTED_FT_V1_HASH)',
      v_brand_active_bad_hash;
  END IF;

  -- (d)
  SELECT COUNT(*) INTO v_brand_v2_exists
  FROM shop_brand_fee_settlement_terms
  WHERE terms_version = 'v2';
  IF v_brand_v2_exists <> 0 THEN
    RAISE EXCEPTION
      'Migration 177 abort [Assert 7d]: shop_brand_fee_settlement_terms already has % v2 row(s). Migration 177 is not idempotent; investigate before re-run.',
      v_brand_v2_exists;
  END IF;

  -- Capture active v1 count for post-assert
  SELECT COUNT(*) INTO v_brand_v1_active_total
  FROM shop_brand_fee_settlement_terms
  WHERE is_active     = true
    AND terms_version = 'v1';

  ----------------------------------------------------------------------------
  -- [Mutation 1] MA registry: v1 is_current → false, INSERT v2 as is_current
  ----------------------------------------------------------------------------
  UPDATE shop_merchant_agreement_versions
  SET is_current = false
  WHERE version    = 'v1'
    AND is_current = true;
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated <> 1 THEN
    RAISE EXCEPTION
      'Migration 177 abort [Mutation 1a]: MA v1 is_current flip updated % row(s) (expected 1)',
      v_rows_updated;
  END IF;

  -- 必須列のみを列挙 (version / agreement_hash / is_current)。
  -- 任意列 (created_at, effective_at 等) は DB 側の DEFAULT に委ねる。
  INSERT INTO shop_merchant_agreement_versions (version, agreement_hash, is_current)
  VALUES ('v2', NEW_MA_V2_HASH, true);

  ----------------------------------------------------------------------------
  -- [Post-assert MA]  is_current=true row が (v2, NEW_MA_V2_HASH) の 1 行だけ
  ----------------------------------------------------------------------------
  SELECT COUNT(*) INTO v_ma_current_count
  FROM shop_merchant_agreement_versions
  WHERE is_current = true;
  IF v_ma_current_count <> 1 THEN
    RAISE EXCEPTION
      'Migration 177 abort [Post-assert MA-count]: expected exactly 1 MA current row after activation, found %',
      v_ma_current_count;
  END IF;

  SELECT agreement_hash INTO v_ma_registry_hash
  FROM shop_merchant_agreement_versions
  WHERE version = 'v2';
  IF v_ma_registry_hash IS DISTINCT FROM NEW_MA_V2_HASH THEN
    RAISE EXCEPTION
      'Migration 177 abort [Post-assert MA-hash]: MA v2 registry hash != NEW_MA_V2_HASH after INSERT';
  END IF;

  ----------------------------------------------------------------------------
  -- [Mutation 2] FT registry: v1 is_current → false, INSERT v2 as is_current
  ----------------------------------------------------------------------------
  UPDATE shop_fee_settlement_terms_versions
  SET is_current = false
  WHERE version    = 'v1'
    AND is_current = true;
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated <> 1 THEN
    RAISE EXCEPTION
      'Migration 177 abort [Mutation 2a]: FT v1 is_current flip updated % row(s) (expected 1)',
      v_rows_updated;
  END IF;

  INSERT INTO shop_fee_settlement_terms_versions (version, terms_hash, is_current)
  VALUES ('v2', NEW_FT_V2_HASH, true);

  ----------------------------------------------------------------------------
  -- [Post-assert FT]
  ----------------------------------------------------------------------------
  SELECT COUNT(*) INTO v_ft_current_count
  FROM shop_fee_settlement_terms_versions
  WHERE is_current = true;
  IF v_ft_current_count <> 1 THEN
    RAISE EXCEPTION
      'Migration 177 abort [Post-assert FT-count]: expected exactly 1 FT current row after activation, found %',
      v_ft_current_count;
  END IF;

  SELECT terms_hash INTO v_ft_registry_hash
  FROM shop_fee_settlement_terms_versions
  WHERE version = 'v2';
  IF v_ft_registry_hash IS DISTINCT FROM NEW_FT_V2_HASH THEN
    RAISE EXCEPTION
      'Migration 177 abort [Post-assert FT-hash]: FT v2 registry hash != NEW_FT_V2_HASH after INSERT';
  END IF;

  ----------------------------------------------------------------------------
  -- [Mutation 3] Brand Fee Term:
  --   v1 → is_active=false (accepted_at, accepted_by_user_id は touch しない)
  --   v2 row を per-brand で INSERT
  ----------------------------------------------------------------------------
  UPDATE shop_brand_fee_settlement_terms
  SET is_active = false
  WHERE is_active     = true
    AND terms_version = 'v1';
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated <> v_brand_v1_active_total THEN
    RAISE EXCEPTION
      'Migration 177 abort [Mutation 3a]: brand fee_term v1 deactivation updated % row(s) (expected %)',
      v_rows_updated, v_brand_v1_active_total;
  END IF;

  INSERT INTO shop_brand_fee_settlement_terms
    (brand_id, platform_fee_rate_bps, terms_version, terms_hash,
     accepted_at, accepted_by_user_id, is_active)
  SELECT
    prev.brand_id,
    1000,               -- rate=1000 (v1 と同率、10 %)
    'v2',
    NEW_FT_V2_HASH,
    NULL,               -- accepted_at  (未 accept)
    NULL,               -- accepted_by_user_id
    true                -- is_active
  FROM shop_brand_fee_settlement_terms prev
  WHERE prev.terms_version = 'v1'
    -- 直前の UPDATE で is_active=false になった v1 row を per-brand で 1:1 に v2 化。
    -- (v1 は brand ごとに ≤1 件を Assert 7a で保証済)
    AND prev.is_active = false;
  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;
  IF v_rows_inserted <> v_brand_v1_active_total THEN
    RAISE EXCEPTION
      'Migration 177 abort [Mutation 3b]: brand fee_term v2 INSERT wrote % row(s) (expected %)',
      v_rows_inserted, v_brand_v1_active_total;
  END IF;

  ----------------------------------------------------------------------------
  -- [Post-assert Brand Fee Term]
  --   brand ごとに active row = 1、全て (v2, NEW_FT_V2_HASH, rate=1000,
  --   accepted_at IS NULL, accepted_by_user_id IS NULL)
  ----------------------------------------------------------------------------
  SELECT COUNT(*) INTO v_post_dup_active
  FROM (
    SELECT brand_id
    FROM shop_brand_fee_settlement_terms
    WHERE is_active = true
    GROUP BY brand_id
    HAVING COUNT(*) > 1
  ) dup;
  IF v_post_dup_active > 0 THEN
    RAISE EXCEPTION
      'Migration 177 abort [Post-assert BFT-dup]: % brand(s) have more than one active row after activation',
      v_post_dup_active;
  END IF;

  SELECT COUNT(*) INTO v_post_bad_active
  FROM shop_brand_fee_settlement_terms
  WHERE is_active = true
    AND (terms_version         IS DISTINCT FROM 'v2'
      OR terms_hash            IS DISTINCT FROM NEW_FT_V2_HASH
      OR platform_fee_rate_bps IS DISTINCT FROM 1000
      OR accepted_at           IS NOT NULL
      OR accepted_by_user_id   IS NOT NULL);
  IF v_post_bad_active > 0 THEN
    RAISE EXCEPTION
      'Migration 177 abort [Post-assert BFT-shape]: % active row(s) do not satisfy v2 invariants (version=v2, hash=NEW_FT_V2_HASH, rate=1000, accepted_at/by IS NULL)',
      v_post_bad_active;
  END IF;

  RAISE NOTICE
    'Migration 177 v2 activation OK. MA v2 hash=%, FT v2 hash=%, brand_fee_term v2 rows=%',
    NEW_MA_V2_HASH, NEW_FT_V2_HASH, v_brand_v1_active_total;
END
$migration_177$;

COMMIT;
