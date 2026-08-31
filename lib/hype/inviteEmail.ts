// =============================================================================
// lib/hype/inviteEmail.ts
//
// Supabase Auth admin invite / generateLink をラップ。
// Test 環境では generateLink (メール非送信) を使い、Production では
// inviteUserByEmail (Supabase 標準メール送信) を使う分岐。
//
// - Service role key は server-only の createAdminClient() 経由のみ利用
// - raw opaque_token は Web 側で生成し、redirectTo クエリに埋め込む
// - Supabase が invite email に埋め込むリンクは自ドメインの
//   /api/auth/confirm に着地し、そこから /brand-admin/invite/setup に遷移する
// =============================================================================

import 'server-only'
import { createAdminClient } from '@/lib/supabase/server'

function appBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (raw && /^https?:\/\//i.test(raw)) return raw.replace(/\/+$/, '')
  return 'http://localhost:3002'
}

function isEmailSendEnabled(): boolean {
  // 本 phase では NEXT_PUBLIC_HYPE_INVITE_SEND_EMAIL=true が明示された時のみ実メール送信
  // Test 環境 (screenshot / e2e) では未設定を default にして generateLink で action_link を得る
  return process.env.HYPE_INVITE_SEND_EMAIL === 'true'
}

interface IssueInviteInput {
  email:        string
  rawToken:     string     // opaque token (URL-safe base64)
  brandName:    string
}
export interface IssueInviteResult {
  emailSent:   boolean
  actionLink?: string      // Supabase の verify link (generateLink 経由の場合のみ)
  supabaseUserId?: string
}

/** Owner 招待メールを送信 (or Test 環境では action_link を返す)。 */
export async function issueOwnerInvitation(input: IssueInviteInput): Promise<IssueInviteResult> {
  const admin = createAdminClient()
  const base  = appBaseUrl()
  // Auth callback → invite setup へ (opaque token をクエリで渡す)
  const nextPath   = `/brand-admin/invite/setup?token=${encodeURIComponent(input.rawToken)}`
  const redirectTo = `${base}/api/auth/hype-invite-confirm?next=${encodeURIComponent(nextPath)}`

  const adminAuth = (admin as unknown as {
    auth: {
      admin: {
        inviteUserByEmail: (email: string, options?: { redirectTo?: string; data?: Record<string, unknown> })
          => Promise<{ data: { user: { id: string } | null } | null; error: { message: string } | null }>
        generateLink: (params: { type: 'invite'; email: string; options?: { redirectTo?: string; data?: Record<string, unknown> } })
          => Promise<{ data: { user: { id: string } | null; properties: { action_link: string } } | null; error: { message: string } | null }>
      }
    }
  }).auth.admin

  if (isEmailSendEnabled()) {
    const { data, error } = await adminAuth.inviteUserByEmail(input.email, {
      redirectTo,
      data: { hype_brand_name: input.brandName },
    })
    if (error) throw new Error(`supabase_invite_failed: ${error.message}`)
    return { emailSent: true, supabaseUserId: data?.user?.id }
  }

  const { data, error } = await adminAuth.generateLink({
    type: 'invite',
    email: input.email,
    options: { redirectTo, data: { hype_brand_name: input.brandName } },
  })
  if (error) throw new Error(`supabase_generate_link_failed: ${error.message}`)
  return {
    emailSent: false,
    actionLink: data?.properties?.action_link,
    supabaseUserId: data?.user?.id,
  }
}
