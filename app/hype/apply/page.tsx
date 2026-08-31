import type { Metadata } from 'next'
import { submitHypeApplicationAction } from './actions'
import HypeApplyForm from './HypeApplyForm'

export const metadata: Metadata = {
  title: 'HYPE に出店する — Cosmohype',
  description: 'HYPE への出店をご検討のブランド様向けの申請フォームです。',
}

export const dynamic = 'force-dynamic'

const ERROR_MESSAGES: Record<string, string> = {
  brand_name_invalid:            'ブランド名を 100 文字以内で入力してください。',
  contact_name_invalid:          '担当者名を 100 文字以内で入力してください。',
  contact_email_invalid:         '正しいメールアドレスを入力してください。',
  website_url_invalid:           '公式サイト URL は http:// または https:// で始まる 500 文字以内の URL を入力してください。',
  instagram_url_invalid:         'Instagram URL は http:// または https:// で始まる 500 文字以内の URL を入力してください。',
  notes_too_long:                'メモは 500 文字以内で入力してください。',
  duplicate_pending_application: 'このメールアドレスでは既に申請中です。 内容を確認後、Cosmohype よりご連絡いたします。',
  ip_burst_limit:                '短時間に多くの申請が続いたため、しばらく時間をおいてから再度お試しください。',
  ip_hourly_limit:               '同一環境からの申請上限に達しました。 時間をおいて再度お試しください。',
  captcha_required:              'セキュリティチェックを完了してから送信してください。',
  captcha_failed:                'セキュリティチェックに失敗しました。 ページを再読み込みしてから再度お試しください。',
  submit_failed:                 '申請の送信に失敗しました。 時間をおいて再度お試しください。',
}

// Test 環境デフォルト: Cloudflare 公式 always-pass site key
// Production: NEXT_PUBLIC_TURNSTILE_SITE_KEY に Cloudflare dashboard 発行の real key を設定
const TURNSTILE_TEST_PASS_KEY = '1x00000000000000000000AA'
function getTurnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || TURNSTILE_TEST_PASS_KEY
}

export default async function HypeApplyPage({
  searchParams,
}: {
  searchParams?: Promise<{ err?: string }>
}) {
  const sp = (await searchParams) ?? {}
  const errCode = sp.err ?? null
  const errorText = errCode ? (ERROR_MESSAGES[errCode] ?? '入力内容をご確認ください。') : null

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-xl mx-auto px-6 py-16">
        <div className="text-[10px] tracking-[0.35em] text-neutral-500 mb-3">HYPE</div>
        <h1 className="text-2xl font-semibold tracking-wide mb-3">HYPE に出店する</h1>
        <p className="text-sm text-neutral-400 leading-relaxed mb-8">
          必要事項を入力してお申し込みください。
          内容を確認後、Cosmohype より登録のご案内をお送りします。
        </p>

        {errorText && (
          <div className="mb-6 text-[13px] text-rose-300 bg-rose-950/40 border border-rose-800 rounded px-3 py-2 leading-relaxed">
            {errorText}
          </div>
        )}

        <HypeApplyForm action={submitHypeApplicationAction} siteKey={getTurnstileSiteKey()} />

        <div className="mt-10 text-[11px] text-neutral-500 leading-relaxed">
          お預かりする情報は Cosmohype プライバシーポリシーに沿って審査に利用します。
          審査完了までお時間をいただく場合があります。
        </div>
      </div>
    </main>
  )
}
