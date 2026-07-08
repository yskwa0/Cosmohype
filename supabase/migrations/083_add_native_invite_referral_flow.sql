-- =========================================================
-- 083: ネイティブアプリ経由の招待 referral 適用フロー
-- =========================================================
-- 目的:
--   iOS Universal Link 経由の招待キャンペーン (Phase 3) の DB 側実装。
--
--   経路:
--     招待者が https://www.cosmohype.jp/invite/{code} を共有
--       → 被招待者が Universal Link 経由でアプリ起動
--       → PendingInviteStore に code 保存
--       → InitialProfileSetup の直前に本 RPC を呼ぶ
--         (`profiles.initial_setup_completed = false` の状態で referral 作成)
--       → その後 completeInitialSetup で `= true` に flip
--       → 以後は本 RPC が initial_setup_already_completed で拒否
--
-- 変更内容:
--   1. 新 RPC `apply_referral_by_invite_code(p_invite_code TEXT)` (SECURITY DEFINER)
--      - Web 側 finish_invited_signup と役割は近いが、Cookie/intent token を使わず
--        invite_code 文字列を直接受け取る。Swift はネイティブなので Cookie を持てないため。
--   2. `fetch_active_referral_count()` を CREATE OR REPLACE で active 条件強化
--      - 従来: referrals 行数のみ集計
--      - 新: invited user の profiles.initial_setup_completed = TRUE のみ集計
--      - 初期設定を完了せず離脱したユーザーは招待人数から除外
--   3. `apply_for_invite_reward()` を CREATE OR REPLACE で count 判定を同じ active 条件に強化
--      - クライアント表示の 10 人到達を信用せず、サーバで再計算
--
-- 判定式の根拠 (remote 実データ調査 2026-07-08 実施):
--   * profiles.initial_setup_completed は boolean NOT NULL DEFAULT false
--   * NULL 行は物理的に存在しない (NOT NULL 制約)
--   * false + display_name non_empty の row が 6 件実在 (SNS OAuth 経由の新規ユーザー推定)
--   → display_name を判定条件に使わず、`initial_setup_completed = TRUE / FALSE` の
--     strict 等値のみで新規/既存を判別する。
--
-- 時間ベース (auth.users.created_at ±24h 等) の判定は一切使わない (誤検出リスク回避)。
--
-- 既存の invite_signup_intents / create_invite_signup_intent / finish_invited_signup
-- は Web 経路用に残置 (dormant、iOS からは呼ばない)。
-- =========================================================


-- ---------------------------------------------------------
-- 事前確認 SQL (Supabase SQL Editor で手動実行、apply 前確認用)
--   SELECT proname FROM pg_proc WHERE proname IN (
--     'apply_referral_by_invite_code',
--     'fetch_active_referral_count',
--     'apply_for_invite_reward'
--   );
--   期待:
--     apply_referral_by_invite_code → 0 rows (新規、これから作成)
--     fetch_active_referral_count / apply_for_invite_reward → 1 row 存在
-- ---------------------------------------------------------


BEGIN;


-- ============================================================================
-- 1. 新規 RPC: apply_referral_by_invite_code(p_invite_code TEXT) RETURNS JSONB
-- ============================================================================
-- Swift の SupabaseReferralService.applyReferralByInviteCode(_ code:) から呼ばれる。
-- JWT で auth.uid() を解決するため、client から invited_user_id を受け取らない (信用しない)。
--
-- 判定順 (全て server 側で決定):
--   ① auth.uid() が NULL           → not_authenticated
--   ② invite_code の形式検証        → invalid_invite_code
--   ③ inviter 存在確認 (invite_code 一致 profile)
--                                    → invalid_invite_code
--   ④ 自己招待拒否 (inviter = auth.uid()) → self_invite_not_allowed
--   ⑤ 呼び出し元 profile 存在確認    → profile_not_found
--   ⑥ 既存 referral 存在拒否
--      (referrals に invited_user_id = auth.uid() が既にある) → already_referred
--   ⑦ 呼び出し元 profile の initial_setup_completed = TRUE 拒否
--                                    → initial_setup_already_completed
--      ★ display_name は判定に使わない
--      ★ 時間ベース (created_at ±24h 等) は使わない
--   ⑧ INSERT INTO referrals
--      unique_violation catch      → already_referred_race
--   ⑨ 成功                          → {ok: true}
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_referral_by_invite_code(p_invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
  v_normalized      TEXT;
  v_inviter_id      UUID;
  v_profile         RECORD;
  v_campaign_key CONSTANT TEXT := 'fashion_invite_10_paypay_3000_v1';
BEGIN
  -- ① Auth check
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  -- ② 形式検証 (081 で trigger が生成する 25 文字集合 + 8 文字と完全一致)
  --    大文字化して照合。空白 / NULL / 別長さ / charset 外はすべて拒否。
  IF p_invite_code IS NULL OR length(trim(p_invite_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_invite_code');
  END IF;
  v_normalized := upper(trim(p_invite_code));
  IF v_normalized !~ '^[ACDEFGHJKMNPQRTUVWXY34679]{8}$' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_invite_code');
  END IF;

  -- ③ inviter 解決 (profiles.invite_code は UNIQUE、1 件以下)
  SELECT id INTO v_inviter_id
    FROM profiles
   WHERE invite_code = v_normalized;
  IF v_inviter_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_invite_code');
  END IF;

  -- ④ 自己招待拒否
  IF v_inviter_id = v_current_user_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'self_invite_not_allowed');
  END IF;

  -- ⑤ 呼び出し元 profile 取得
  --    profiles.id は auth.users.id と 1:1、ensureProfileExists で必ず作成される想定。
  --    存在しないなら profile_not_found (通常起こらない、遭遇したら client 側で再実行)。
  SELECT id, initial_setup_completed
    INTO v_profile
    FROM profiles
   WHERE id = v_current_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'profile_not_found');
  END IF;

  -- ⑥ 既存 referral 拒否
  --    UNIQUE(invited_user_id) 制約と重複するが、reason を分けたいため事前チェック。
  IF EXISTS (SELECT 1 FROM referrals WHERE invited_user_id = v_current_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_referred');
  END IF;

  -- ⑦ 初期設定完了済ユーザー拒否
  --    * strict 等値 TRUE のみ拒否 (NOT NULL 制約により NULL は物理的に不在、
  --      Swift 側 dbSetupDone 判定の nil case は防御的 optional decode 用のみ)
  --    * display_name の状態は判定条件に含めない (SNS OAuth 経由で display_name が
  --      事前埋めされた新規ユーザーが false のまま存在するため、追加すると誤拒否になる)
  IF v_profile.initial_setup_completed = TRUE THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'initial_setup_already_completed');
  END IF;

  -- ⑧ referrals INSERT
  --    campaign_key は referrals 側の DEFAULT ('fashion_invite_10_paypay_3000_v1') に任せ、
  --    Swift から campaign_key を受け取らない。
  BEGIN
    INSERT INTO referrals (inviter_id, invited_user_id, invite_code)
    VALUES (v_inviter_id, v_current_user_id, v_normalized);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_referred_race');
  END;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION apply_referral_by_invite_code(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION apply_referral_by_invite_code(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION apply_referral_by_invite_code(TEXT) TO authenticated;

COMMENT ON FUNCTION apply_referral_by_invite_code(TEXT) IS
  'iOS Universal Link 経由の招待 referral 記録。JWT で auth.uid() 解決、initial_setup_completed=FALSE のときのみ referrals に INSERT。';


-- ============================================================================
-- 2. fetch_active_referral_count() を CREATE OR REPLACE で active 条件強化
-- ============================================================================
-- 従来 (081): referrals 行数のみ集計 (invited user の状態に無関心)
-- 新 (083)  : invited user の profiles.initial_setup_completed = TRUE のみ集計
--
-- 初期設定を完了せずに離脱したユーザーは招待人数から除外される。
-- 「本当にアプリを始めた実ユーザー」だけを 10 人カウントに含める。
-- ============================================================================

CREATE OR REPLACE FUNCTION fetch_active_referral_count()
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::INT
    FROM referrals r
    JOIN profiles p ON p.id = r.invited_user_id
   WHERE r.inviter_id = auth.uid()
     AND r.invalidated_at IS NULL
     AND p.initial_setup_completed = TRUE;
$$;

-- 権限は 081 で GRANT 済のため CREATE OR REPLACE では再宣言不要。
-- 念のため一度 REVOKE してから GRANT し直す (冪等性確保)。
REVOKE ALL ON FUNCTION fetch_active_referral_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION fetch_active_referral_count() FROM anon;
GRANT EXECUTE ON FUNCTION fetch_active_referral_count() TO authenticated;

COMMENT ON FUNCTION fetch_active_referral_count() IS
  'active referral 数を返す。initial_setup_completed=TRUE の invited user のみ加算 (initial setup 完了ユーザーのみ)。';


-- ============================================================================
-- 3. apply_for_invite_reward() を CREATE OR REPLACE で count 判定同期
-- ============================================================================
-- 報酬申請時もサーバー側で active count を再計算する。
-- クライアント表示の 10 人到達 (activeReferralCount) を信用しない。
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_for_invite_reward()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_campaign_key CONSTANT TEXT := 'fashion_invite_10_paypay_3000_v1';
  v_required CONSTANT INT := 10;
  v_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  -- ★ fetch_active_referral_count と同じ active 条件で再計算。
  --   単なる referrals 行数ではなく initial_setup_completed=TRUE のみ集計する。
  SELECT count(*) INTO v_count
    FROM referrals r
    JOIN profiles p ON p.id = r.invited_user_id
   WHERE r.inviter_id = v_user_id
     AND r.invalidated_at IS NULL
     AND p.initial_setup_completed = TRUE;

  IF v_count < v_required THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'not_enough_referrals',
      'current', v_count,
      'required', v_required
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM invite_reward_applications
      WHERE user_id = v_user_id
        AND campaign_key = v_campaign_key
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_applied');
  END IF;

  INSERT INTO invite_reward_applications (user_id, campaign_key, status)
    VALUES (v_user_id, v_campaign_key, 'pending');

  RETURN jsonb_build_object('ok', true);

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_applied_race');
END;
$$;

REVOKE ALL ON FUNCTION apply_for_invite_reward() FROM PUBLIC;
REVOKE ALL ON FUNCTION apply_for_invite_reward() FROM anon;
GRANT EXECUTE ON FUNCTION apply_for_invite_reward() TO authenticated;

COMMENT ON FUNCTION apply_for_invite_reward() IS
  '招待報酬申請。サーバ側で active referral count を再計算し、10 人以上のときのみ申請を受け付ける。';


COMMIT;


-- ---------------------------------------------------------
-- 適用後 確認 SQL
--
-- ① 新 RPC が存在するか
--   SELECT proname FROM pg_proc
--    WHERE proname = 'apply_referral_by_invite_code';
--   期待: 1 row
--
-- ② 権限が正しいか
--   SELECT grantee, privilege_type FROM information_schema.role_routine_grants
--    WHERE routine_name = 'apply_referral_by_invite_code'
--      AND grantee IN ('anon', 'authenticated', 'PUBLIC');
--   期待: authenticated=EXECUTE のみ、anon/PUBLIC は無し
--
-- ③ 既存 RPC の CREATE OR REPLACE が反映されているか (source_code に JOIN profiles を含むか)
--   SELECT prosrc FROM pg_proc WHERE proname = 'fetch_active_referral_count';
--   SELECT prosrc FROM pg_proc WHERE proname = 'apply_for_invite_reward';
--   期待: いずれも "JOIN profiles p" と "initial_setup_completed = TRUE" を含む
--
-- ④ 動作テスト (Swift E2E 実施後):
--   ・inviter A の invite_code で被招待者 B が signup → apply_referral_by_invite_code(A の code) → ok
--   ・B の initial_setup_completed=TRUE 後、再 apply → initial_setup_already_completed
--   ・A が自分の code で apply → self_invite_not_allowed
--   ・不正 code → invalid_invite_code
--   ・存在しない code → invalid_invite_code
-- ---------------------------------------------------------
