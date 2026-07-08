import type { Metadata } from 'next'
import { InviteClient } from './InviteClient'
import { isValidInviteCodeFormat } from '@/lib/invite/constants'

export const dynamic = 'force-dynamic'

// ─── 招待 route 専用 OGP metadata ──────────────────────────────────
// root layout.tsx の metadata (「Cosmohype — ファッションSNS」+ /icon.jpg fallback = 旧紫ハンガー) を
// このページだけ上書きする。
//
// og:image / twitter:image は現行 iOS AppIcon (Cosmohype ブランドアイコン、1024×1024) を
// public/invite-appicon-v1.png として配置したものを直接指すこと。
// (元 asset は CosmohypeNative/Assets.xcassets/AppIcon.appiconset の primary PNG。
//  SHA-256 一致で verify 済み、リサイズ・トリミング・再生成一切なし)
// LINE / Twitter の URL キャッシュ対策として、ファイル名に -v1 を付与している。
export const metadata: Metadata = {
  metadataBase: new URL('https://www.cosmohype.jp'),
  title: '友達からCosmohypeに誘われています🪐',
  description: 'Cosmohype をダウンロードして、ファッションで新しくつながろう。',
  openGraph: {
    type: 'website',
    title: '友達からCosmohypeに誘われています🪐',
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
    title: '友達からCosmohypeに誘われています🪐',
    description: 'Cosmohype をダウンロードして、ファッションで新しくつながろう。',
    images: ['/invite-appicon-v1.png'],
  },
}

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
