import type { Metadata } from 'next'

// LINE / Twitter link preview キャッシュ切り分け専用テスト route。
//
// 目的: 既存の /invite/[inviteCode] は過去に何度も LINE に投げられており、
//   LINE 側 URL preview cache が旧サムネで固まっている可能性がある。
//   完全に新しい URL prefix (/invite-preview-test/) を用意することで、
//   LINE がこの URL を初回 scrape 時に取りに来る OG メタデータが
//   本当に新 AppIcon (public/invite-appicon-v1.png) に切り替わっているかを
//   キャッシュに影響されずに検証する。
//
// 変更禁止事項: 既存 /invite/[inviteCode] / Universal Link / AASA /
//   inviteCode 処理 / Supabase / RPC / migration / iOS / AppIcon 画像 /
//   Landing 本体は一切触らない。本 route は metadata 検証のみが役割。
export const dynamic = 'force-dynamic'

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

export default async function InvitePreviewTestPage({
  params
}: {
  params: Promise<{ inviteCode: string }>
}) {
  const { inviteCode } = await params
  return (
    <div
      style={{
        padding: '32px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#FFFFFF',
        minHeight: '100dvh',
        color: '#1F1F23'
      }}
    >
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Invite Preview Test</h1>
      <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0' }}>
        Route: /invite-preview-test/{inviteCode}
      </p>
      <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0' }}>
        og:image target: /invite-appicon-v1.png
      </p>
      <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 24 }}>
        This route exists only to verify social link preview metadata without
        LINE / Twitter URL cache interference on the primary /invite/ route.
      </p>
    </div>
  )
}
