-- =========================================================
-- 085: ORIGINAL 1000 バッジ (初代 1000 人限定)
-- =========================================================
-- 目的:
--   Cosmohype に最初に参加した 1000 人へ、永久保持の連番バッジ (1〜1000) を付与する。
--   一度付与した番号は profile 物理 DELETE 後も再利用しない (歴史保証)。
--
-- 設計要点:
--   1. `original1000_assignments` (内部台帳、非公開):
--        1..1000 slot を pre-seed。assigned_at IS NOT NULL は永久使用済 marker。
--        profile 物理 DELETE 時は FK CASCADE SET NULL で user_id のみ NULL 化、
--        assigned_at は保持されるため slot は永久に使用済 → 番号再利用は不能。
--        RLS ENABLE + policy 一切なし + 全 role REVOKE で client 非公開。
--        SECURITY DEFINER trigger (table owner postgres 経由で RLS bypass) のみ書き込み可。
--
--   2. `profiles.original1000_number` (denormalized、client 公開):
--        iOS 単純 fetch 用の denormalized column。NULL=非保有、1..1000=保有。
--        UNIQUE partial index + CHECK 制約で二重付与 / 範囲外を防ぐ。
--
--   3. 付与 trigger 2 段構成 (pg_trigger_depth bypass を構造的に排除):
--        * BEFORE INSERT `assign_original1000_before_new_profile`:
--            - client 送信値を NULL に強制 (改ざん耐性)
--            - advisory lock で直列化
--            - 未使用最小 slot を予約 (ledger.assigned_at を set、user_id はまだ)
--            - NEW.original1000_number に代入 (INSERT 実行時にそのまま反映される)
--            → profiles への UPDATE 文は発行しない
--        * AFTER INSERT `link_original1000_after_new_profile`:
--            - profile 行が確立された後、ledger.user_id = NEW.id を後付け UPDATE
--            - ledger 側のみ変更、profiles は UPDATE しない
--
--   4. UPDATE 保護 trigger `protect_original1000_number` (BEFORE UPDATE):
--        - 無条件で original1000_number の変更を拒否 (bypass 経路ゼロ)
--        - assign / link は BEFORE/AFTER INSERT で profiles UPDATE を発行しないため
--          nested trigger からの意図しない改ざんは構造的に不可能
--        - メンテナンス時は ALTER TABLE ... DISABLE TRIGGER で明示的に無効化する
--
--   5. Backfill: profiles を created_at ASC, id ASC で並べ、deleted_at IS NULL の
--        先頭 N 件 (N ≤ 1000、現時点 247) に 1..N を付与。ledger には profile の
--        created_at を assigned_at として保存 (実際の登録時刻を歴史保存)。
--        Backfill は protect trigger 作成の前に実行 (順序で block を回避)。
--
--   6. **既存 profile.updated_at の完全保全**:
--        `set_profiles_updated_at` (BEFORE UPDATE trigger、`set_updated_at()` 関数を実行し
--        `NEW.updated_at = now()` を無条件でセット) が backfill UPDATE 時に発火すると
--        247 人全員の updated_at が現在時刻に書き変わってしまう。これを防ぐため、
--        backfill 直前に `ALTER TABLE ... DISABLE TRIGGER set_profiles_updated_at` で
--        当該 trigger のみを無効化し、backfill 完了後に再有効化する。
--        検証 F で「snapshot と post-backfill の updated_at が完全一致」を確認する。
--        DISABLE は本 TX 内でのみ効果を持ち、ROLLBACK 時は自動で戻る。
--
--   7. 整合性検証 A/B/C/D/E/F を DO block で実施。1 件でも不一致なら
--        RAISE EXCEPTION → migration 全体 ROLLBACK。
--
-- 非破壊:
--   * profiles の既存 column には一切変更なし
--   * 既存 profile の updated_at は完全保全 (検証 F でガード)
--   * 既存 RLS policy (profiles_select_all / profiles_insert_own / profiles_update_own)
--     には一切変更なし
--   * 既存 badge column (is_official / is_cosmohype_creator) には触らない
--   * `set_updated_at()` 関数本体は無変更 (posts / virtual_tryons / dm_conversations /
--     push_tokens の他 trigger と共有されているため)
-- =========================================================


BEGIN;


-- ---------------------------------------------------------
-- 1) profiles.original1000_number (denormalized、client 公開)
-- ---------------------------------------------------------
ALTER TABLE profiles ADD COLUMN original1000_number INT NULL;

ALTER TABLE profiles ADD CONSTRAINT profiles_original1000_number_range
  CHECK (original1000_number IS NULL OR original1000_number BETWEEN 1 AND 1000);

CREATE UNIQUE INDEX profiles_original1000_number_uidx
  ON profiles(original1000_number)
  WHERE original1000_number IS NOT NULL;

COMMENT ON COLUMN profiles.original1000_number IS
  'ORIGINAL 1000 バッジ番号。NULL=非保有、1..1000=保有。付与は assign_original1000_before_new_profile trigger 経由のみ、UPDATE 変更は protect_original1000_number trigger で無条件拒否される。';


-- ---------------------------------------------------------
-- 2) original1000_assignments (内部台帳、client 非公開)
-- ---------------------------------------------------------
CREATE TABLE original1000_assignments (
  number      INT PRIMARY KEY CHECK (number BETWEEN 1 AND 1000),
  user_id     UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NULL,
  CONSTRAINT  assignment_state_consistency CHECK (
    (user_id IS NULL AND assigned_at IS NULL)  -- 未使用 slot
    OR assigned_at IS NOT NULL                  -- 使用済 (user_id NULL でも slot は保持)
  )
);

COMMENT ON TABLE original1000_assignments IS
  'ORIGINAL 1000 番号割当台帳 (内部専用、クライアント非公開)。1..1000 slot が pre-seed される。assigned_at IS NOT NULL は永久使用済 marker、profile 物理 DELETE 後も残るため番号再利用は構造的に不能。';

-- 1..1000 slot を pre-seed (全て未使用状態)
INSERT INTO original1000_assignments (number)
SELECT generate_series(1, 1000);

-- Client 非公開: RLS ENABLE + policy 無し + 全 role REVOKE
--   SECURITY DEFINER trigger は table owner (postgres) として RLS bypass で動作。
--   PostgREST 経由の anon / authenticated アクセスは policy 無しのため全 deny。
ALTER TABLE original1000_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON original1000_assignments FROM PUBLIC;
REVOKE ALL ON original1000_assignments FROM anon;
REVOKE ALL ON original1000_assignments FROM authenticated;


-- ---------------------------------------------------------
-- 3) 既存 profile.updated_at snapshot を採取
--    後の検証 F で「backfill が updated_at を一切変更していないこと」を確認するため。
--    ON COMMIT DROP で本 TX の COMMIT / ROLLBACK 時に自動破棄。
-- ---------------------------------------------------------
CREATE TEMP TABLE _profile_updated_at_snapshot
  ON COMMIT DROP
  AS
    SELECT id, updated_at
      FROM profiles
     WHERE deleted_at IS NULL;


-- ---------------------------------------------------------
-- 4) Backfill (protect trigger 作成の前 + set_profiles_updated_at 一時停止で実行)
-- ---------------------------------------------------------
-- (a) updated_at 自動更新 trigger を一時停止
--     関数 set_updated_at() 本体は他 table と共有のため触らず、profiles 用 trigger のみ無効化
ALTER TABLE profiles DISABLE TRIGGER set_profiles_updated_at;

-- (b) profiles 側: created_at ASC, id ASC の先頭 N 件に 1..N を付与
--     UPDATE には updated_at を含めない → trigger disable と併せて updated_at は変わらない
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
    FROM profiles
   WHERE deleted_at IS NULL
   ORDER BY created_at ASC, id ASC
   LIMIT 1000
)
UPDATE profiles p
   SET original1000_number = o.rn
  FROM ordered o
 WHERE p.id = o.id;

-- (c) ledger 側: 対応 slot を profile と 1:1 で紐付ける
--     assigned_at には profile の created_at を保存 (実際の登録時刻を歴史保存)
UPDATE original1000_assignments a
   SET user_id = p.id,
       assigned_at = p.created_at
  FROM profiles p
 WHERE p.original1000_number IS NOT NULL
   AND a.number = p.original1000_number;

-- (d) updated_at 自動更新 trigger を再有効化
ALTER TABLE profiles ENABLE TRIGGER set_profiles_updated_at;


-- ---------------------------------------------------------
-- 5) Assign trigger (BEFORE INSERT: NEW を直接書き換え、profiles UPDATE 不発行)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION assign_original1000_before_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_number INT;
BEGIN
  -- (a) client 送信値を無効化 (改ざん耐性)
  NEW.original1000_number := NULL;

  -- (b) 席の直列化 (同時 INSERT の race を捌く。TX 終了で自動 release)
  PERFORM pg_advisory_xact_lock(hashtext('cosmohype_original1000_slot'));

  -- (c) 未使用最小 slot を予約: assigned_at IS NULL の中で MIN(number) を UPDATE
  --     WHERE 節に assigned_at IS NULL を含めることで defensive check (advisory lock で
  --     race 自体は防いでいるが、万一の CHECK として二重予約を追加ガード)
  UPDATE original1000_assignments
     SET assigned_at = now()
   WHERE number = (
     SELECT MIN(number) FROM original1000_assignments WHERE assigned_at IS NULL
   )
     AND assigned_at IS NULL
   RETURNING number INTO v_number;

  -- (d) 予約成功なら NEW を書き換え (INSERT 実行時にそのまま反映される)
  --     1001 人目以降は v_number = NULL のまま → NEW.original1000_number NULL のまま
  IF v_number IS NOT NULL THEN
    NEW.original1000_number := v_number;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_assign_original1000_before_insert
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_original1000_before_new_profile();

COMMENT ON FUNCTION assign_original1000_before_new_profile() IS
  'BEFORE INSERT: advisory lock で直列化し、未使用最小 slot を予約 → NEW.original1000_number を上書き。client 送信値は無効化。profiles UPDATE を発行しないため protect trigger と干渉しない。';


-- ---------------------------------------------------------
-- 6) Link trigger (AFTER INSERT: profile 確立後に FK 整合で user_id 後付け)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION link_original1000_after_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.original1000_number IS NOT NULL THEN
    UPDATE original1000_assignments
       SET user_id = NEW.id
     WHERE number = NEW.original1000_number
       AND user_id IS NULL;  -- defensive: 既に埋まっている slot は再上書きしない
  END IF;
  RETURN NULL;  -- AFTER trigger の戻り値は無視される
END $$;

CREATE TRIGGER trg_link_original1000_after_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION link_original1000_after_new_profile();

COMMENT ON FUNCTION link_original1000_after_new_profile() IS
  'AFTER INSERT: BEFORE INSERT で予約済 slot に user_id = NEW.id を後付け UPDATE。profile 行確立後のため FK check 成功。ledger 側のみ変更、profiles は UPDATE しない。';


-- ---------------------------------------------------------
-- 7) Protect trigger (BEFORE UPDATE: 無条件 immutable、bypass 経路ゼロ)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION protect_original1000_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 無条件拒否: assign / link trigger は profiles UPDATE を発行しないため、
  -- ネストした trigger 経路からの意図しない original1000_number 変更もここで止まる。
  IF NEW.original1000_number IS DISTINCT FROM OLD.original1000_number THEN
    RAISE EXCEPTION 'original1000_number is immutable once assigned'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_protect_original1000_number
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_original1000_number();

COMMENT ON FUNCTION protect_original1000_number() IS
  'BEFORE UPDATE: original1000_number の変更を無条件拒否。pg_trigger_depth bypass なし。メンテナンス時は ALTER TABLE ... DISABLE TRIGGER で明示的に無効化する必要がある。';


-- ---------------------------------------------------------
-- 8) 整合性検証 A/B/C/D/E/F (1 件でも不一致なら ROLLBACK)
-- ---------------------------------------------------------
DO $$
DECLARE
  v_profile_count       INT;
  v_ledger_count        INT;
  v_snapshot_count      INT;
  v_mismatch_b          INT;
  v_mismatch_c          INT;
  v_bad_unused          INT;
  v_min                 INT;
  v_max                 INT;
  v_distinct            INT;
  v_updated_at_changed  INT;
BEGIN
  -- =====================================================
  -- A. profiles と ledger の使用済件数一致
  -- =====================================================
  SELECT count(*) INTO v_profile_count
    FROM profiles WHERE original1000_number IS NOT NULL;
  SELECT count(*) INTO v_ledger_count
    FROM original1000_assignments WHERE assigned_at IS NOT NULL;

  IF v_profile_count != v_ledger_count THEN
    RAISE EXCEPTION '[A] count mismatch: profiles.original1000_number NOT NULL = %, ledger.assigned_at NOT NULL = %',
      v_profile_count, v_ledger_count;
  END IF;

  -- =====================================================
  -- B. profile → ledger 完全一致検証
  --    非 NULL profile 全行について、対応 ledger row が
  --    {number = profile.original1000_number, user_id = profile.id, assigned_at IS NOT NULL}
  --    で存在することを確認 (LEFT JOIN で不一致行を数える)
  -- =====================================================
  SELECT count(*) INTO v_mismatch_b
    FROM profiles p
    LEFT JOIN original1000_assignments a
      ON a.number = p.original1000_number
     AND a.user_id = p.id
     AND a.assigned_at IS NOT NULL
   WHERE p.original1000_number IS NOT NULL
     AND a.number IS NULL;

  IF v_mismatch_b > 0 THEN
    RAISE EXCEPTION '[B] profile → ledger mismatch: % profile row(s) have original1000_number but no matching ledger row (same number + same user_id + assigned_at NOT NULL)',
      v_mismatch_b;
  END IF;

  -- =====================================================
  -- C. ledger → profile 完全一致検証
  --    user_id IS NOT NULL の全 ledger row について、対応 profile が
  --    {id = ledger.user_id, original1000_number = ledger.number} で存在することを確認
  -- =====================================================
  SELECT count(*) INTO v_mismatch_c
    FROM original1000_assignments a
    LEFT JOIN profiles p
      ON p.id = a.user_id
     AND p.original1000_number = a.number
   WHERE a.user_id IS NOT NULL
     AND p.id IS NULL;

  IF v_mismatch_c > 0 THEN
    RAISE EXCEPTION '[C] ledger → profile mismatch: % ledger row(s) have user_id but no matching profile',
      v_mismatch_c;
  END IF;

  -- =====================================================
  -- D. 未使用 slot は user_id IS NULL であること
  --    (CHECK 制約でも保証されているが二重確認)
  -- =====================================================
  SELECT count(*) INTO v_bad_unused
    FROM original1000_assignments
   WHERE assigned_at IS NULL
     AND user_id IS NOT NULL;

  IF v_bad_unused > 0 THEN
    RAISE EXCEPTION '[D] unused slot has user_id: % row(s) with assigned_at IS NULL but user_id IS NOT NULL',
      v_bad_unused;
  END IF;

  -- =====================================================
  -- E. Backfill 後の番号連続性 (dynamic N、hardcode なし)
  --    N = 現在 backfill されている profile 数
  --    MIN=1, MAX=N, COUNT DISTINCT=N が成立することを確認
  -- =====================================================
  IF v_profile_count > 0 THEN
    SELECT MIN(original1000_number),
           MAX(original1000_number),
           count(DISTINCT original1000_number)
      INTO v_min, v_max, v_distinct
      FROM profiles
     WHERE original1000_number IS NOT NULL;

    IF v_min != 1 OR v_max != v_profile_count OR v_distinct != v_profile_count THEN
      RAISE EXCEPTION '[E] backfill continuity broken: min=%, max=%, distinct=%, expected 1..%',
        v_min, v_max, v_distinct, v_profile_count;
    END IF;
  END IF;

  -- =====================================================
  -- F. 既存 profile.updated_at が完全保全されていること
  --    snapshot と post-backfill の updated_at を全行で照合する。
  --    * snapshot 件数と現行 profiles (deleted_at IS NULL) 件数の一致
  --    * 全行で updated_at が IS NOT DISTINCT (完全一致)
  --    どちらか失敗なら ROLLBACK。
  -- =====================================================
  SELECT count(*) INTO v_snapshot_count FROM _profile_updated_at_snapshot;

  IF v_snapshot_count != v_profile_count THEN
    RAISE EXCEPTION '[F-1] snapshot size mismatch: snapshot=% , backfilled=%',
      v_snapshot_count, v_profile_count;
  END IF;

  SELECT count(*) INTO v_updated_at_changed
    FROM profiles p
    JOIN _profile_updated_at_snapshot s ON s.id = p.id
   WHERE p.updated_at IS DISTINCT FROM s.updated_at;

  IF v_updated_at_changed > 0 THEN
    RAISE EXCEPTION '[F-2] % profile row(s) had updated_at changed during backfill (expected 0)',
      v_updated_at_changed;
  END IF;

  RAISE NOTICE '[085] ORIGINAL 1000 backfill verified: % profile(s) assigned numbers 1..%, updated_at preserved for all',
    v_profile_count, v_profile_count;
END $$;


COMMIT;


-- ---------------------------------------------------------
-- 適用後 確認 SQL (任意):
--
--   -- 付与状況
--   SELECT count(*) FROM profiles WHERE original1000_number IS NOT NULL;
--     -- 期待: 247 (現時点の profile 総数と一致)
--
--   SELECT count(*) FROM original1000_assignments WHERE assigned_at IS NOT NULL;
--     -- 期待: 247
--
--   SELECT count(*) FROM original1000_assignments WHERE assigned_at IS NULL;
--     -- 期待: 753 (残席)
--
--   SELECT MIN(original1000_number), MAX(original1000_number) FROM profiles;
--     -- 期待: 1, 247
--
--   -- updated_at 保全確認 (max updated_at が backfill 実行日時より古い or 独立):
--   SELECT MAX(updated_at) FROM profiles WHERE original1000_number IS NOT NULL;
--     -- 期待: migration 適用時刻より前の値 (元の updated_at がそのまま保存)
--
--   -- 権限確認 (authenticated / anon が ledger にアクセスできないこと):
--   SELECT grantee, privilege_type
--     FROM information_schema.role_table_grants
--    WHERE table_name = 'original1000_assignments'
--      AND grantee IN ('anon', 'authenticated', 'PUBLIC');
--     -- 期待: 0 rows
--
--   -- Trigger 状態確認:
--   SELECT tgname, tgenabled
--     FROM pg_trigger
--    WHERE tgrelid = 'profiles'::regclass
--      AND NOT tgisinternal;
--     -- 期待: set_profiles_updated_at = 'O' (enabled)、
--            trg_assign_original1000_before_insert = 'O',
--            trg_link_original1000_after_insert = 'O',
--            trg_protect_original1000_number = 'O'
--
--   -- Immutability テスト (実行しない、参考のみ):
--   -- UPDATE profiles SET original1000_number = 999 WHERE id = ...;
--     -- 期待: EXCEPTION 'original1000_number is immutable once assigned'
-- ---------------------------------------------------------
