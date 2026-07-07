/**
 * Invite campaign 定数。文言・URL・Cookie 名を集約する。
 * SQL migration 081 の campaign_key と一致させること。
 */
export const INVITE_CAMPAIGN_KEY = 'fashion_invite_10_paypay_3000_v1'

/**
 * HttpOnly Cookie 名。raw invite intent token を保存する唯一の場所。
 * DB (invite_signup_intents.token_hash) には SHA-256 hex を保存する。
 */
export const INVITE_INTENT_COOKIE_NAME = 'invite_intent_token'

/**
 * Cookie の有効期間 (秒)。
 * 「時間制限は設けない」原則を守るための実用的な上限として 180 日。
 * intent 側の expires_at も同じ 180 日。
 */
export const INVITE_INTENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 180

/**
 * 招待コード書式: 8 文字英数、25 charset。
 * migration 081 の generate_invite_code_for_new_profile と一致させる。
 */
export const INVITE_CODE_REGEX = /^[ACDEFGHJKMNPQRTUVWXY34679]{8}$/

/**
 * 招待コードが書式的に妥当か。
 */
export function isValidInviteCodeFormat(code: string): boolean {
  return INVITE_CODE_REGEX.test(code.toUpperCase())
}
