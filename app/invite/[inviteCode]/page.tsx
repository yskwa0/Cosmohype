import { InviteClient } from './InviteClient'
import { isValidInviteCodeFormat } from '@/lib/invite/constants'

export const dynamic = 'force-dynamic'

/**
 * 招待経由の landing page。
 *
 * ここでは DB 書き込みを一切行わない (bot / crawler / GET / reload での intent 作成を防ぐ)。
 * ユーザーが Apple / Google / メールの CTA を押した瞬間に Server Action が発火して
 * intent 作成 + HttpOnly Cookie 保存 + redirect が行われる。
 */
export default async function InvitePage({
  params
}: {
  params: Promise<{ inviteCode: string }>
}) {
  const { inviteCode } = await params
  const normalized = (inviteCode ?? '').trim().toUpperCase()
  const validFormat = isValidInviteCodeFormat(normalized)

  return (
    <>
      <style>{`html, body { background-color: #FFFFFF !important; }`}</style>
      <InviteClient inviteCode={normalized} validFormat={validFormat} />
    </>
  )
}
