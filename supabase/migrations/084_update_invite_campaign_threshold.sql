-- =========================================================
-- 084: 招待キャンペーン達成閾値変更 10 → 5
-- =========================================================
-- 目的:
--   招待キャンペーン仕様を「10 人 / PayPay 3,000 円分」から
--   「5 人 / PayPay 1,000 円分」へ変更する。
--
--   本 migration では **RPC の閾値のみ** 変更する。
--     * apply_for_invite_reward.v_required : 10 → 5
--
--   意図的に変更しないもの:
--     * campaign_key 値 ('fashion_invite_10_paypay_3000_v1')
--         - ユーザーに表示されない内部識別子。文字列中の "10_paypay_3000" は
--           旧仕様の名残だが、referrals / invite_reward_applications /
--           invite_signup_intents の既存行との整合性維持のため rename しない。
--         - rename すると既存 referrals (campaign_key DEFAULT) との照合で
--           active count 集計が 0 になるリスク、および pending 申請の孤立リスクがある。
--     * referrals / invite_reward_applications の既存 row (data touch なし)
--         - 現在 8 人招待済のユーザーは新閾値で自動的に達成済扱いになる。
--         - 現在 2 人招待済のユーザーはあと 3 人で達成となる。
--         - 招待人数の reset は一切行わない。
--     * apply_referral_by_invite_code RPC (閾値を持たない、campaign_key のみ参照)
--     * fetch_active_referral_count RPC (閾値を持たない、count のみ返す)
--     * SECURITY DEFINER / SET search_path = public
--     * GRANT / REVOKE (authenticated のみ EXECUTE)
--     * JOIN profiles WHERE initial_setup_completed=TRUE の active 条件
--     * UNIQUE(user_id, campaign_key) による重複申請防止
--     * invite_signup_intents の DEFAULT campaign_key (Web dormant 経路用、残置)
--
--   081 / 083 は remote 適用済 (supabase migration list で確認済) のため
--   直接編集は禁止。CREATE OR REPLACE で apply_for_invite_reward のみ上書きする。
-- =========================================================


-- ---------------------------------------------------------
-- 事前確認 SQL (Supabase SQL Editor で手動実行、apply 前確認用)
--   ① 現行 v_required = 10 か
--     SELECT prosrc FROM pg_proc WHERE proname = 'apply_for_invite_reward';
--     期待: "v_required CONSTANT INT := 10" を含む
--
--   ② 現行 fetch_active_referral_count が JOIN profiles を含むか (083 適用済確認)
--     SELECT prosrc FROM pg_proc WHERE proname = 'fetch_active_referral_count';
--     期待: "JOIN profiles p" と "initial_setup_completed = TRUE" を含む
--
--   ③ 既存 pending 申請の有無 (backfill 不要の確認)
--     SELECT count(*) FROM invite_reward_applications
--      WHERE status = 'pending';
--     期待: 数を確認、閾値引き下げにより新規申請が可能になるユーザー分の増加を予想
-- ---------------------------------------------------------


BEGIN;


-- ============================================================================
-- apply_for_invite_reward() を CREATE OR REPLACE で v_required のみ 10 → 5
-- ============================================================================
-- 083 の関数と同一構造。v_required 定数のみ 5 に変更。
-- campaign_key / JOIN profiles active 条件 / UNIQUE 重複拒否は完全維持。
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
  v_required CONSTANT INT := 5;
  v_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  -- fetch_active_referral_count と同じ active 条件で再計算。
  -- 単なる referrals 行数ではなく initial_setup_completed=TRUE のみ集計する
  -- (083 で導入した active 条件を維持)。
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

-- 権限は 081 で GRANT 済のため CREATE OR REPLACE では再宣言不要だが、
-- 冪等性確保のため一度 REVOKE してから GRANT し直す (083 と同方針)。
REVOKE ALL ON FUNCTION apply_for_invite_reward() FROM PUBLIC;
REVOKE ALL ON FUNCTION apply_for_invite_reward() FROM anon;
GRANT EXECUTE ON FUNCTION apply_for_invite_reward() TO authenticated;

COMMENT ON FUNCTION apply_for_invite_reward() IS
  '招待報酬申請。サーバ側で active referral count を再計算し、5 人以上のときのみ申請を受け付ける (現行キャンペーン: 5 人 / PayPay 1,000 円分)。campaign_key は旧命名のまま維持。';


COMMIT;


-- ---------------------------------------------------------
-- 適用後 確認 SQL
--
-- ① v_required = 5 に更新されたか
--   SELECT prosrc FROM pg_proc WHERE proname = 'apply_for_invite_reward';
--   期待: "v_required CONSTANT INT := 5" を含む
--
-- ② campaign_key 変更なしを確認 (retain)
--   SELECT prosrc FROM pg_proc WHERE proname = 'apply_for_invite_reward';
--   期待: "'fashion_invite_10_paypay_3000_v1'" を含む
--
-- ③ 権限が正しいか
--   SELECT grantee, privilege_type FROM information_schema.role_routine_grants
--    WHERE routine_name = 'apply_for_invite_reward'
--      AND grantee IN ('anon', 'authenticated', 'PUBLIC');
--   期待: authenticated=EXECUTE のみ、anon/PUBLIC は無し
--
-- ④ COMMENT が新仕様反映されているか
--   SELECT obj_description('apply_for_invite_reward()'::regprocedure);
--   期待: "5 人以上" を含む
--
-- ⑤ 動作テスト (Swift E2E 実施後):
--   ・active count 4 のユーザーが apply → not_enough_referrals, required=5, current=4
--   ・active count 5 のユーザーが apply → ok=true (pending row 作成)
--   ・active count 8 のユーザーが apply → ok=true (pending row 作成、既存招待が 5 超で達成扱い)
--   ・同ユーザーが再 apply → already_applied
-- ---------------------------------------------------------
