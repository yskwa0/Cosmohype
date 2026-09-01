import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hashOpaqueToken } from '@/lib/hype/tokens'
import { acceptExistingUserInvitationAction } from './actions'
import AcceptButton from './AcceptButton'

/**
 * /brand-admin/invite/accept
 *
 * 既存 Cosmohype user 向けの HYPE Owner 招待受諾ページ。
 * password は変更しない (既存 auth.users は完全保持)。
 *
 * 到達経路:
 *   1. Magic Link email → /api/auth/hype-invite-confirm → session 確立 → 本 page
 *   2. session 切れで再 access → /brand-admin/login?redirect=... → login 後戻る
 *   3. 受諾成功直後: `?saved=accepted` (token なし) → 完了確認画面
 *
 * 表示分岐:
 *   ・ ?saved=accepted   → 「参加が完了しました」 + Brand Admin CTA (受諾直後専用)
 *   ・ token 有 + preview status='ready' → 「HYPE Owner として参加する」button
 *   ・ token 有 + preview status='accepted' → 「既に受諾済みです」 + Brand Admin CTA
 *   ・ その他 preview status                → status 別エラー
 */
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
  email_mismatch: '招待メールアドレスと、現在サインインしているメールアドレスが一致しません。 招待メールに記載されているアカウントでログインし直してください。',
}

export default async function HypeInviteAcceptPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string; err?: string; saved?: string }>
}) {
  const sp = (await searchParams) ?? {}
  const rawToken = sp.token ?? ''
  const errCode = sp.err ?? null
  const savedAccepted = sp.saved === 'accepted'

  // 1) 受諾直後 (Server Action からの redirect) → 完了確認画面
  //    token は URL に載せない設計。 メッセージだけ表示 + Brand Admin CTA。
  if (savedAccepted) {
    return (
      <FullScreen>
        <SuccessCard
          title="参加が完了しました"
          body="このブランドの Owner として登録されました。"
        />
      </FullScreen>
    )
  }

  // 2) token 無し → 案内
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
    // session なし → HYPE login にリダイレクト (raw token 付き returnTo)
    redirect(`/brand-admin/login?redirect=/brand-admin/invite/accept?token=${encodeURIComponent(rawToken)}`)
  }

  const tokenHash = hashOpaqueToken(rawToken)
  const rpcRes = await (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: Preview[] | null; error: { message: string } | null }>
  }).rpc('shop_get_owner_invitation_preview', { p_token_hash: tokenHash })

  if (rpcRes.error) {
    const msg = rpcRes.error.message.toLowerCase()
    let hint = 'この招待を読み込めませんでした。'
    if (msg.includes('invitation_not_found'))     hint = 'この招待リンクは無効です。運営にお問い合わせください。'
    else if (msg.includes('not_authenticated'))   hint = 'サインイン情報が失われました。招待メールのリンクから再度アクセスしてください。'
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
    // accepted の場合は Brand Admin CTA も出す (受諾済 URL を後日再訪した user 向け)
    return (
      <FullScreen>
        <div className="max-w-md mx-auto px-6 py-14">
          <div className="text-[10px] tracking-[0.35em] text-neutral-500 mb-3">HYPE</div>
          <h1 className="text-2xl font-semibold tracking-wide mb-4">{
            preview.out_status === 'accepted' ? '既に受諾済みです'
            : preview.out_status === 'expired' ? '招待の有効期限が切れています'
            : preview.out_status === 'revoked' ? '招待は無効化されています'
            : 'メールアドレスが一致しません'
          }</h1>
          <div className="text-sm text-neutral-400 leading-relaxed">
            {STATUS_HINT[preview.out_status]}
            {preview.out_status === 'accepted' && (
              <div className="mt-6">
                <BrandAdminCTA />
              </div>
            )}
          </div>
        </div>
      </FullScreen>
    )
  }

  // ready 状態 → 「HYPE Owner として参加する」確認カード
  return (
    <FullScreen>
      <div className="max-w-md mx-auto px-6 py-14">
        <div className="text-[10px] tracking-[0.35em] text-neutral-500 mb-3">HYPE</div>
        <h1 className="text-2xl font-semibold tracking-wide mb-3 text-neutral-100">HYPE へようこそ</h1>
        <p className="text-sm text-neutral-400 leading-relaxed mb-8">
          出店の準備ができました。<br />
          既存の Cosmohype アカウントで、HYPE Owner として参加します。<br />
          パスワードは変更されません。
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

        <form action={acceptExistingUserInvitationAction} className="space-y-4">
          <input type="hidden" name="token" value={rawToken} />
          <AcceptButton />
        </form>

        <p className="mt-8 text-[11px] text-neutral-500 leading-relaxed">
          参加を確定すると、このブランドの Owner として登録されます。<br />
          Cosmohype 側のプロフィール / 投稿 / 注文情報は変更されません。
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

function SuccessCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-md mx-auto px-6 py-14">
      <div className="text-[10px] tracking-[0.35em] text-neutral-500 mb-3">HYPE</div>
      <h1 className="text-2xl font-semibold tracking-wide mb-4">{title}</h1>
      <p className="text-sm text-neutral-400 leading-relaxed">{body}</p>
      <div className="mt-6">
        <BrandAdminCTA />
      </div>
    </div>
  )
}

function BrandAdminCTA() {
  return (
    <Link
      href="/brand-admin"
      className={
        'inline-flex items-center justify-center h-11 px-6 rounded-md text-sm font-semibold ' +
        'bg-white text-neutral-900 ' +
        'transition-[transform,opacity,filter] duration-150 ease-out ' +
        'origin-center will-change-transform ' +
        'active:scale-[0.97] active:opacity-90 ' +
        'cursor-pointer select-none touch-manipulation ' +
        '[-webkit-tap-highlight-color:transparent]'
      }
    >
      Brand Admin へ
    </Link>
  )
}

function errorMessage(code: string): string {
  switch (code) {
    case 'invitation_expired':          return '招待の有効期限が切れています。運営に再送を依頼してください。'
    case 'invitation_revoked':          return '招待は無効化されています。運営に再送を依頼してください。'
    case 'invitation_email_mismatch':   return '招待メールアドレスと、現在サインインしているメールが一致しません。'
    case 'invitation_already_accepted': return 'この招待は既に受諾済みです。'
    case 'brand_already_has_owner':     return 'このブランドには既にオーナーが登録されています。'
    case 'accept_failed':               return '受諾に失敗しました。時間をおいて再度お試しください。'
    case 'invitation_missing_token':    return '招待トークンが取得できませんでした。 メール本文のリンクをもう一度開いてください。'
    default:                            return `受諾に失敗しました (${code})`
  }
}
