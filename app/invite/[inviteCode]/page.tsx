import type { Metadata } from 'next'
import { InviteClient } from './InviteClient'
import { isValidInviteCodeFormat } from '@/lib/invite/constants'

export const dynamic = 'force-dynamic'

// ─── 招待 route 専用 OGP metadata ──────────────────────────────────
// root layout.tsx の metadata (「Cosmohype — ファッションSNS」+ /icon.jpg fallback = 旧紫ハンガー) を
// このページだけ上書きする。
//
// og:image は同 dir の opengraph-image.tsx (Next.js file convention) が動的に
// 1200x630 PNG を生成する。file convention による og:image meta 自動注入と
// 明示的な openGraph.images が競合しないように、ここでは images を書かない。
// twitter:image も明示指定しない: 現行 crawler (LINE 含む) は og:image を
// fallback として使うため、単一 opengraph-image で LINE / Twitter 両対応する。
export const metadata: Metadata = {
  metadataBase: new URL('https://www.cosmohype.jp'),
  title: '友達から Cosmohype に招待されています',
  description: 'Cosmohype をダウンロードして、ファッションで新しくつながろう。',
  openGraph: {
    type: 'website',
    title: '友達から Cosmohype に招待されています',
    description: 'Cosmohype をダウンロードして、ファッションで新しくつながろう。',
    // images: opengraph-image.tsx (file convention) が担当
  },
  twitter: {
    card: 'summary_large_image',
    title: '友達から Cosmohype に招待されています',
    description: 'Cosmohype をダウンロードして、ファッションで新しくつながろう。',
    // images: og:image を fallback として利用
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
