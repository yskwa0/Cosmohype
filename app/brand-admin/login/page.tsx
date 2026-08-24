import BrandAdminLoginForm from './BrandAdminLoginForm'

export const dynamic = 'force-dynamic'

/**
 * /brand-admin/login
 *
 * 通常ユーザーの (auth)/login とは意図的に別画面。共有 Supabase Auth session を
 * 使うため、同 email/password で入る。ただしログイン後の遷移先は /brand-admin。
 * 一般 Web のヘッダーからは絶対に link しない (URL 直打ちのみ)。
 *
 * Dev Bypass は撤去済 (Production Supabase 一本運用のため)。
 */
export default function BrandAdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>
}) {
  return <BrandAdminLoginFormWrapper searchParams={searchParams} />
}

async function BrandAdminLoginFormWrapper({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>
}) {
  const sp = await searchParams
  return <BrandAdminLoginForm initialError={errorMessage(sp.err)} />
}

function errorMessage(code: string | undefined): string | null {
  switch (code) {
    case 'no_membership':
      return 'このアカウントには参加中のブランドがありません。ブランド担当者にご確認ください。'
    case 'fetch_failed':
      return '認証情報の取得に失敗しました。時間をおいて再度お試しください。'
    case undefined:
    case '':
      return null
    default:
      return 'ログインが必要です。'
  }
}
