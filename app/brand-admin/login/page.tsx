import BrandAdminLoginForm from './BrandAdminLoginForm'
import { safeRedirect } from '@/lib/hype/safeRedirect'

export const dynamic = 'force-dynamic'

/**
 * /brand-admin/login
 *
 * 通常ユーザーの (auth)/login とは意図的に別画面。共有 Supabase Auth session を
 * 使うため、同 email/password で入る。ただしログイン後の遷移先は /brand-admin。
 * 一般 Web のヘッダーからは絶対に link しない (URL 直打ちのみ)。
 *
 * `?redirect=/brand-admin/invite/...` が付いていれば、
 *   HYPE Owner 招待 flow (既存 user 経路 or session 切れ) からの誘導。
 *   safeRedirect() で同一 origin & prefix allowlist のみ通す (open redirect 対策)。
 *
 * Dev Bypass は撤去済 (Production Supabase 一本運用のため)。
 */
export default function BrandAdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; redirect?: string }>
}) {
  return <BrandAdminLoginFormWrapper searchParams={searchParams} />
}

async function BrandAdminLoginFormWrapper({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; redirect?: string }>
}) {
  const sp = await searchParams
  const redirect = safeRedirect(sp.redirect ?? null)
  // safeRedirect の fallback は /brand-admin。 明示指定なし = 従来通り。
  return (
    <BrandAdminLoginForm
      initialError={errorMessage(sp.err)}
      redirectPath={redirect}
    />
  )
}

function errorMessage(code: string | undefined): string | null {
  switch (code) {
    case 'no_membership':
      return 'このアカウントには参加中のブランドがありません。ブランド担当者にご確認ください。'
    case 'fetch_failed':
      return '認証情報の取得に失敗しました。時間をおいて再度お試しください。'
    case 'invite_missing_token':
      return '招待リンクが不完全です。 メール本文のリンクをそのまま開いてください。'
    case 'invite_invalid_link':
      return '招待リンクが無効です。 運営にお問い合わせください。'
    case 'invite_invalid_next':
      return '招待リンクの遷移先が不正です。 運営にお問い合わせください。'
    case 'invite_verify_failed':
      return '招待リンクの検証に失敗しました。 リンクの有効期限切れの可能性があります。'
    case 'invite_session_missing':
      return 'サインインが必要です。 招待メールに記載されているアカウントでログインしてください。'
    case undefined:
    case '':
      return null
    default:
      return 'ログインが必要です。'
  }
}
