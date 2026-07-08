import type { Metadata } from 'next'
import { InviteClient } from '@/app/invite/[inviteCode]/InviteClient'
import { isValidInviteCodeFormat } from '@/lib/invite/constants'

export const dynamic = 'force-dynamic'

// ─── 招待 route v2 (Cosmohype アプリからの正式共有 URL) ─────────────
// 実体は既存 v1 (/invite/[inviteCode]) の Landing を完全に再利用する。
// LINE / Twitter の URL preview キャッシュが旧 /invite/{CODE} で固まって
// いる問題への回避として URL prefix を /invite/v2/{CODE} に切り替える。
// Universal Link は AASA `/invite/*` (ワイルドカード) で既にカバーされ、
// AASA 変更不要。iOS 側 InviteShareText はこの v2 path を発行し、
// InviteURLParser は v1 / v2 両方を受け付ける (旧リンク互換維持)。
export const metadata: Metadata = {
  metadataBase: new URL('https://www.cosmohype.jp'),
  title: '友達から Cosmohype に招待されています',
  description: 'Cosmohype をダウンロードして、ファッションで新しくつながろう。',
  openGraph: {
    type: 'website',
    title: '友達から Cosmohype に招待されています',
    description: 'Cosmohype をダウンロードして、ファッションで新しくつながろう。',
    images: [
      {
        url: '/invite-appicon-v1.png',
        width: 1024,
        height: 1024,
        alt: 'Cosmohype',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '友達から Cosmohype に招待されています',
    description: 'Cosmohype をダウンロードして、ファッションで新しくつながろう。',
    images: ['/invite-appicon-v1.png'],
  },
}

export default async function InvitePageV2({
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
