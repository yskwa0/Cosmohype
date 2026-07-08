import type { Metadata } from 'next'
import { InviteClient } from './InviteClient'
import { isValidInviteCodeFormat } from '@/lib/invite/constants'

export const dynamic = 'force-dynamic'

// ─── 招待 route 専用 OGP metadata ──────────────────────────────────
// root layout.tsx の metadata (「Cosmohype — ファッションSNS」+ /icon.jpg fallback = 旧紫ハンガー) を
// このページだけ上書きする。og:image は最新ブランド asset の /image.png (wordmark) を使う。
// 画像 aspect は 1358:313 で 1200×630 の推奨とは合わないが、白背景 + 中央 wordmark 表示で
// LINE / Twitter カード上でも「文字ロゴが中央に見える」という無害な見え方に収まる。
// 将来的に専用 1200×630 OGP asset が作られたら差し替え推奨。
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
        url: '/image.png',
        width: 1358,
        height: 313,
        alt: 'Cosmohype',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '友達から Cosmohype に招待されています',
    description: 'Cosmohype をダウンロードして、ファッションで新しくつながろう。',
    images: ['/image.png'],
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
