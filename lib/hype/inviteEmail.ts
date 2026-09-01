// =============================================================================
// lib/hype/inviteEmail.ts
//
// HYPE Owner 招待メール発行の 2 分岐 wrapper。
//
//   CASE 1  新規 email
//     └─ Supabase Auth admin.inviteUserByEmail
//        (Supabase が Invite Email Template で email 送信)
//        redirectTo → /api/auth/hype-invite-confirm?next=/brand-admin/invite/setup?token=OPAQUE
//        callback で verifyOtp(type='invite') → session → password 設定 → owner
//
//   CASE 2  既存 auth.users (Cosmohype user)
//     └─ 上を先に試行 → 422 "already been registered" を catch
//        └─ supabase.auth.signInWithOtp({shouldCreateUser:false})
//           (Supabase が Magic Link Template で email 送信)
//           emailRedirectTo → /api/auth/hype-invite-confirm?next=/brand-admin/invite/accept?token=OPAQUE
//           callback で verifyOtp(type='email') → session (password 未変更) → 受諾 → owner
//
// Test 環境 (HYPE_INVITE_SEND_EMAIL != 'true'):
//   実 SMTP は使わず admin.generateLink で action_link (+ hashed_token) を戻り値で返す。
//   E2E script は hashed_token を使って我々の Template と等価な callback URL を組み立てて
//   直接 fetch する (実 inbox 不要)。
//
// 秘密:
//   raw opaque token は Server Action 内 (呼び出し側) のみで保持し、
//   redirectTo クエリにのみ埋め込む。 このモジュールは DB や log に書かない。
// =============================================================================

import 'server-only'
import { createAdminClient, createAnonServerClient } from '@/lib/supabase/server'

/**
 * Production の base URL。 未設定 / localhost fallback は禁止 (fail-closed)。
 * Test では NEXT_PUBLIC_APP_URL を明示 (http://localhost:3002 等) に設定する。
 */
function appBaseUrlStrict(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!raw) {
    throw new Error('hype_app_url_missing')
  }
  if (!/^https?:\/\//i.test(raw)) {
    throw new Error('hype_app_url_invalid')
  }
  return raw.replace(/\/+$/, '')
}

function isEmailSendEnabled(): boolean {
  return process.env.HYPE_INVITE_SEND_EMAIL === 'true'
}

/**
 * Supabase Auth の "user already registered" error を識別する。
 * gotrue の err message / status を defensive に判定。
 */
function isUserAlreadyExistsError(err: { message?: string; status?: number } | null | undefined): boolean {
  if (!err) return false
  const status = typeof err.status === 'number' ? err.status : 0
  const msg = (err.message ?? '').toLowerCase()
  if (msg.includes('already been registered')) return true
  if (msg.includes('already registered')) return true
  if (msg.includes('user_already_exists')) return true
  if (msg.includes('email_exists')) return true
  if (msg.includes('user already exists')) return true
  if (status === 422 && msg.includes('email')) return true
  return false
}

interface IssueInviteInput {
  email:     string
  rawToken:  string    // opaque token (URL-safe base64)
  brandName: string
}

export interface IssueInviteResult {
  /** 実 SMTP 送信を試行済かどうか (Test の generateLink は false) */
  emailSent:      boolean
  /** どの経路を使ったか (audit 用、raw token を含まない) */
  path:           'invite' | 'magiclink'
  /** Test / generateLink 経路でのみ返す (Prod 実送信では常に undefined) */
  actionLink?:    string
  supabaseUserId?: string
}

/**
 * Owner 招待通知 email を発行する。
 * 新規 email → invite、既存 auth.users → magic link に自動 dispatch。
 * error は throw する (Server Action 側で catch して err code に redirect)。
 */
export async function issueOwnerInvitation(input: IssueInviteInput): Promise<IssueInviteResult> {
  const base = appBaseUrlStrict()

  const setupNext  = `/brand-admin/invite/setup?token=${encodeURIComponent(input.rawToken)}`
  const acceptNext = `/brand-admin/invite/accept?token=${encodeURIComponent(input.rawToken)}`
  const inviteRedirectTo = `${base}/api/auth/hype-invite-confirm?next=${encodeURIComponent(setupNext)}`
  const otpRedirectTo    = `${base}/api/auth/hype-invite-confirm?next=${encodeURIComponent(acceptNext)}`

  if (!isEmailSendEnabled()) {
    // Test 経路: generateLink(invite) → 既存なら fallback generateLink(magiclink)。 実 SMTP なし。
    return issueViaGenerateLink({
      email:        input.email,
      brandName:    input.brandName,
      inviteRedirect: inviteRedirectTo,
      otpRedirect:    otpRedirectTo,
    })
  }

  // ---- Production 経路 ----
  const admin = createAdminClient()

  const inviteRes = await (admin as unknown as {
    auth: { admin: {
      inviteUserByEmail: (email: string, options?: { redirectTo?: string; data?: Record<string, unknown> })
        => Promise<{ data: { user: { id: string } | null } | null; error: (Error & { status?: number }) | null }>
    } }
  }).auth.admin.inviteUserByEmail(input.email, {
    redirectTo: inviteRedirectTo,
    data:       { hype_brand_name: input.brandName },
  })

  if (!inviteRes.error) {
    return {
      emailSent:       true,
      path:            'invite',
      supabaseUserId:  inviteRes.data?.user?.id,
    }
  }

  if (!isUserAlreadyExistsError(inviteRes.error)) {
    throw new Error(`supabase_invite_failed: ${inviteRes.error.message}`)
  }

  // 既存 user fallback: signInWithOtp で Magic Link email 送信
  const otpClient = createAnonServerClient()
  const otpRes = await otpClient.auth.signInWithOtp({
    email: input.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo:  otpRedirectTo,
    },
  })

  if (otpRes.error) {
    throw new Error(`supabase_otp_failed: ${otpRes.error.message}`)
  }

  return {
    emailSent: true,
    path:      'magiclink',
  }
}

// ---------------------------------------------------------------------------
// Test-only: generateLink 経路 (実 SMTP なし、action_link を戻す)
// ---------------------------------------------------------------------------
async function issueViaGenerateLink(args: {
  email:          string
  brandName:      string
  inviteRedirect: string
  otpRedirect:    string
}): Promise<IssueInviteResult> {
  const admin = createAdminClient()

  const gen = (admin as unknown as {
    auth: { admin: {
      generateLink: (params: {
        type: 'invite' | 'magiclink'
        email: string
        options?: { redirectTo?: string; data?: Record<string, unknown> }
      }) => Promise<{
        data: {
          user: { id: string } | null
          properties: { action_link: string; hashed_token?: string }
        } | null
        error: (Error & { status?: number }) | null
      }>
    } }
  }).auth.admin.generateLink

  const inviteRes = await gen({
    type:  'invite',
    email: args.email,
    options: { redirectTo: args.inviteRedirect, data: { hype_brand_name: args.brandName } },
  })
  if (!inviteRes.error) {
    return {
      emailSent:      false,
      path:           'invite',
      actionLink:     inviteRes.data?.properties?.action_link,
      supabaseUserId: inviteRes.data?.user?.id,
    }
  }
  if (!isUserAlreadyExistsError(inviteRes.error)) {
    throw new Error(`supabase_invite_failed: ${inviteRes.error.message}`)
  }

  const magicRes = await gen({
    type:  'magiclink',
    email: args.email,
    options: { redirectTo: args.otpRedirect, data: { hype_brand_name: args.brandName } },
  })
  if (magicRes.error) {
    throw new Error(`supabase_generate_link_failed: ${magicRes.error.message}`)
  }
  return {
    emailSent:      false,
    path:           'magiclink',
    actionLink:     magicRes.data?.properties?.action_link,
    supabaseUserId: magicRes.data?.user?.id,
  }
}
