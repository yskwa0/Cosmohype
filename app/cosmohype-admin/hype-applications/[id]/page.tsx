import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCosmohypeAdminContext } from '@/lib/cosmohypeAdmin'
import { createClient } from '@/lib/supabase/server'
import {
  approveHypeApplicationAction,
  rejectHypeApplicationAction,
  resendOwnerInvitationAction,
} from '../actions'

export const dynamic = 'force-dynamic'

interface Detail {
  id: string
  brand_name: string
  contact_name: string
  contact_email: string
  website_url: string | null
  instagram_url: string | null
  notes: string | null
  status: string
  approved_brand_id: string | null
  approved_by: string | null
  approved_at: string | null
  rejected_by: string | null
  rejected_at: string | null
  rejection_reason: string | null
  created_at: string
  invitation_id: string | null
  invitation_email: string | null
  invitation_expires_at: string | null
  invitation_accepted_at: string | null
  invitation_revoked_at: string | null
  invitation_resend_count: number | null
}

const ERR: Record<string, string> = {
  approve_failed:                    '承認に失敗しました。',
  reject_failed:                     '却下に失敗しました。',
  resend_failed:                     '再送に失敗しました。',
  invite_send_failed:                '招待メール送信に失敗しました。 「再送」から再試行してください。',
  application_not_found:             '申請が見つかりません。',
  application_status_not_pending:    'この申請は既に処理済みです。 一覧を再読み込みしてください。',
  active_invitation_not_found:       'アクティブな招待がありません (既に受諾済みの可能性)。',
  brand_not_found:                   '該当ブランドが見つかりません。',
  resend_limit_exceeded:             '再送上限 (10 回) に達しました。 サポートまでご連絡ください。',
  forbidden:                         '権限がありません。',
  not_authenticated:                 '再ログインしてください。',
}
const SAVED: Record<string, string> = {
  approved: 'ブランドを作成し、Owner 招待を送信しました。',
  rejected: '申請を却下しました。',
  resent:   '招待を再送しました。',
}

function fmt(dt: string | null): string {
  if (!dt) return '—'
  const d = new Date(dt)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default async function HypeApplicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ err?: string; saved?: string }>
}) {
  const { id } = await params
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) notFound()
  const sp = (await searchParams) ?? {}

  await getCosmohypeAdminContext()

  const supabase = await createClient()
  const rpcRes = await (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: Detail[] | null; error: { message: string } | null }>
  }).rpc('shop_hype_admin_get_application', { p_application_id: id })

  if (rpcRes.error) {
    return <div className="p-6 text-sm text-red-700">取得失敗: {rpcRes.error.message}</div>
  }
  const app = rpcRes.data?.[0]
  if (!app) notFound()

  const errText   = sp.err ? (ERR[sp.err] ?? sp.err) : null
  const savedText = sp.saved ? (SAVED[sp.saved] ?? sp.saved) : null

  const invStatus = (() => {
    if (!app.invitation_id) return null
    if (app.invitation_accepted_at) return { label: '受諾済み',  cls: 'bg-emerald-100 text-emerald-800' }
    if (app.invitation_revoked_at)  return { label: '取消済み',  cls: 'bg-neutral-100 text-neutral-500' }
    if (app.invitation_expires_at && new Date(app.invitation_expires_at) <= new Date())
      return { label: '期限切れ', cls: 'bg-rose-100 text-rose-700' }
    return { label: '有効',      cls: 'bg-amber-100 text-amber-800' }
  })()

  return (
    <div className="max-w-3xl">
      <div className="mb-4 text-[11px]">
        <Link href="/cosmohype-admin/hype-applications" className="text-neutral-500 hover:text-neutral-900">← 申請一覧に戻る</Link>
      </div>

      {savedText && (
        <div className="mb-4 text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">{savedText}</div>
      )}
      {errText && (
        <div className="mb-4 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{errText}</div>
      )}

      <h1 className="text-2xl font-semibold mb-1">{app.brand_name}</h1>
      <div className="text-[12px] text-neutral-500 mb-6">申請 ID: {app.id}</div>

      <section className="border border-neutral-200 rounded-lg bg-white p-5 mb-4">
        <h2 className="text-sm font-semibold mb-3">申請内容</h2>
        <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-[13px]">
          <dt className="text-neutral-500">担当者</dt><dd>{app.contact_name}</dd>
          <dt className="text-neutral-500">メール</dt><dd>{app.contact_email}</dd>
          <dt className="text-neutral-500">公式サイト</dt><dd>{app.website_url ?? '—'}</dd>
          <dt className="text-neutral-500">Instagram</dt><dd>{app.instagram_url ?? '—'}</dd>
          <dt className="text-neutral-500">ご要望</dt><dd className="whitespace-pre-wrap">{app.notes ?? '—'}</dd>
          <dt className="text-neutral-500">申請日時</dt><dd>{fmt(app.created_at)}</dd>
          <dt className="text-neutral-500">状態</dt><dd>{app.status}</dd>
        </dl>
      </section>

      {app.status === 'pending' && (
        <section className="border border-neutral-200 rounded-lg bg-white p-5 mb-4">
          <h2 className="text-sm font-semibold mb-3">承認 / 却下</h2>
          <div className="flex flex-wrap gap-3">
            <form action={approveHypeApplicationAction}>
              <input type="hidden" name="application_id" value={app.id} />
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 bg-neutral-900 text-white text-sm font-semibold rounded hover:bg-neutral-800"
              >
                承認して Owner 招待を送信
              </button>
            </form>
            <details className="flex-1 min-w-[240px]">
              <summary className="cursor-pointer text-[13px] text-neutral-700 py-2">却下する</summary>
              <form action={rejectHypeApplicationAction} className="mt-2 space-y-2">
                <input type="hidden" name="application_id" value={app.id} />
                <textarea
                  name="reason" rows={2} maxLength={500}
                  placeholder="却下理由 (内部メモ、任意)"
                  className="w-full text-[13px] px-2 py-1.5 border border-neutral-300 rounded"
                />
                <button
                  type="submit"
                  className="text-[12px] px-3 py-1.5 border border-neutral-300 rounded hover:bg-neutral-50"
                >
                  却下を確定する
                </button>
              </form>
            </details>
          </div>
        </section>
      )}

      {app.status === 'approved' && (
        <section className="border border-neutral-200 rounded-lg bg-white p-5 mb-4">
          <h2 className="text-sm font-semibold mb-3">承認情報</h2>
          <dl className="grid grid-cols-[10rem_1fr] gap-y-2 text-[13px]">
            <dt className="text-neutral-500">承認日時</dt><dd>{fmt(app.approved_at)}</dd>
            <dt className="text-neutral-500">作成 brand_id</dt><dd className="font-mono text-[11px] break-all">{app.approved_brand_id}</dd>
          </dl>

          {app.invitation_id && invStatus && (
            <>
              <hr className="my-4" />
              <h2 className="text-sm font-semibold mb-3">Owner 招待</h2>
              <dl className="grid grid-cols-[10rem_1fr] gap-y-2 text-[13px]">
                <dt className="text-neutral-500">状態</dt>
                <dd><span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${invStatus.cls}`}>{invStatus.label}</span></dd>
                <dt className="text-neutral-500">送信先</dt><dd>{app.invitation_email}</dd>
                <dt className="text-neutral-500">有効期限</dt><dd>{fmt(app.invitation_expires_at)}</dd>
                <dt className="text-neutral-500">受諾日時</dt><dd>{fmt(app.invitation_accepted_at)}</dd>
                <dt className="text-neutral-500">再送回数</dt><dd>{app.invitation_resend_count ?? 0}</dd>
              </dl>

              {!app.invitation_accepted_at && (
                <form action={resendOwnerInvitationAction} className="mt-4">
                  <input type="hidden" name="application_id" value={app.id} />
                  <input type="hidden" name="brand_id" value={app.approved_brand_id ?? ''} />
                  <button
                    type="submit"
                    className="text-[12px] px-3 py-1.5 border border-neutral-300 rounded hover:bg-neutral-50"
                  >
                    招待を再送 (旧 token を無効化)
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      )}

      {app.status === 'rejected' && (
        <section className="border border-neutral-200 rounded-lg bg-white p-5 mb-4">
          <h2 className="text-sm font-semibold mb-3">却下情報</h2>
          <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-[13px]">
            <dt className="text-neutral-500">却下日時</dt><dd>{fmt(app.rejected_at)}</dd>
            <dt className="text-neutral-500">理由</dt><dd className="whitespace-pre-wrap">{app.rejection_reason ?? '—'}</dd>
          </dl>
        </section>
      )}
    </div>
  )
}
