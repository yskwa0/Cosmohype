import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hashOpaqueToken } from '@/lib/hype/tokens'
import { setPasswordAndAcceptInvitationAction } from './actions'
import HypeInviteSetupForm from './HypeInviteSetupForm'

export const metadata: Metadata = {
  title: 'HYPE へようこそ',
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'

interface Preview {
  out_brand_id:   string
  out_brand_name: string
  out_email:      string
  out_expires_at: string
  out_status:     'ready' | 'expired' | 'revoked' | 'accepted' | 'email_mismatch'
}

const STATUS_HINT: Record<Preview['out_status'], string> = {
  ready:          '',
  expired:        'この招待は有効期限が切れています。運営に再送を依頼してください。',
  revoked:        'この招待は取消済みです。運営に再送を依頼してください。',
  accepted:       'この招待は既に受諾済みです。Brand Admin にログインしてご利用ください。',
  email_mismatch: '招待メールアドレスと、現在サインインしているメールアドレスが一致しません。',
}

export default async function HypeInviteSetupPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string; err?: string }>
}) {
  const sp = (await searchParams) ?? {}
  const rawToken = sp.token ?? ''
  const errCode = sp.err ?? null

  if (!rawToken) {
    return (
      <FullScreen>
        <ErrorCard title="招待リンクが正しくありません">
          招待リンクをもう一度確認してください。問題が続く場合は Cosmohype サポートまでご連絡ください。
        </ErrorCard>
      </FullScreen>
    )
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) {
    // hype-invite-confirm 経由でない直接アクセス → login 誘導
    redirect(`/brand-admin/login?err=invite_session_missing`)
  }

  const tokenHash = hashOpaqueToken(rawToken)
  const rpcRes = await (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: Preview[] | null; error: { message: string } | null }>
  }).rpc('shop_get_owner_invitation_preview', { p_token_hash: tokenHash })

  if (rpcRes.error) {
    const msg = rpcRes.error.message.toLowerCase()
    let hint = 'この招待を読み込めませんでした。'
    if (msg.includes('invitation_not_found')) hint = 'この招待リンクは無効です。運営にお問い合わせください。'
    else if (msg.includes('not_authenticated')) hint = 'サインイン情報が失われました。招待メールのリンクから再度アクセスしてください。'
    return (
      <FullScreen>
        <ErrorCard title="招待を確認できません">{hint}</ErrorCard>
      </FullScreen>
    )
  }
  const preview = rpcRes.data?.[0]
  if (!preview) {
    return (
      <FullScreen>
        <ErrorCard title="招待を確認できません">
          この招待リンクは無効です。運営にお問い合わせください。
        </ErrorCard>
      </FullScreen>
    )
  }

  if (preview.out_status !== 'ready') {
    return (
      <FullScreen>
        <ErrorCard title={
          preview.out_status === 'accepted' ? '既に登録済みです'
          : preview.out_status === 'expired' ? '招待の有効期限が切れています'
          : preview.out_status === 'revoked' ? '招待は無効化されています'
          : 'メールアドレスが一致しません'
        }>
          {STATUS_HINT[preview.out_status]}
          {preview.out_status === 'accepted' && (
            <div className="mt-4">
              <Link href="/brand-admin" className="inline-block px-4 py-2 bg-neutral-900 text-white text-sm font-semibold rounded">
                Brand Admin へ
              </Link>
            </div>
          )}
        </ErrorCard>
      </FullScreen>
    )
  }

  // ready 状態 → 「HYPE へようこそ」パスワード設定画面
  return (
    <FullScreen>
      <div className="max-w-md mx-auto px-6 py-14">
        <div className="text-[10px] tracking-[0.35em] text-neutral-500 mb-3">HYPE</div>
        <h1 className="text-2xl font-semibold tracking-wide mb-3 text-neutral-100">HYPE へようこそ</h1>
        <p className="text-sm text-neutral-400 leading-relaxed mb-8">
          出店の準備ができました。<br />
          Brand Admin で使用するパスワードを設定してください。
        </p>

        {errCode && (
          <div className="mb-4 text-[13px] text-rose-300 bg-rose-950/40 border border-rose-800 rounded px-3 py-2 leading-relaxed">
            {errorMessage(errCode)}
          </div>
        )}

        <div className="mb-6 rounded border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-[12px] text-neutral-300 leading-relaxed">
          <div><span className="text-neutral-500 mr-2">ブランド名</span>{preview.out_brand_name}</div>
          <div><span className="text-neutral-500 mr-2">メール</span>{preview.out_email}</div>
        </div>

        <HypeInviteSetupForm token={rawToken} action={setPasswordAndAcceptInvitationAction} />

        <p className="mt-8 text-[11px] text-neutral-500 leading-relaxed">
          パスワードは 8 文字以上で設定してください。<br />
          登録が完了すると、Brand Admin にログインします。
        </p>
      </div>
    </FullScreen>
  )
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      {children}
    </main>
  )
}

function ErrorCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto px-6 py-14">
      <div className="text-[10px] tracking-[0.35em] text-neutral-500 mb-3">HYPE</div>
      <h1 className="text-2xl font-semibold tracking-wide mb-4">{title}</h1>
      <div className="text-sm text-neutral-400 leading-relaxed">{children}</div>
    </div>
  )
}

function errorMessage(code: string): string {
  switch (code) {
    case 'password_too_short':     return 'パスワードは 8 文字以上で入力してください。'
    case 'password_mismatch':      return '2 つのパスワードが一致しません。'
    case 'password_update_failed': return 'パスワードの設定に失敗しました。時間をおいて再度お試しください。'
    case 'invitation_expired':     return '招待の有効期限が切れています。運営に再送を依頼してください。'
    case 'invitation_revoked':     return '招待は無効化されています。運営に再送を依頼してください。'
    case 'invitation_email_mismatch': return '招待メールアドレスと、現在サインインしているメールが一致しません。'
    case 'invitation_already_accepted': return 'この招待は既に受諾済みです。'
    case 'brand_already_has_owner': return 'このブランドには既にオーナーが登録されています。'
    case 'setup_failed':           return '登録に失敗しました。時間をおいて再度お試しください。'
    default:                       return `登録に失敗しました (${code})`
  }
}
