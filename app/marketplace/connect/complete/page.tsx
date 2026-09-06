// =============================================================================
// app/marketplace/connect/complete/page.tsx   (PHASE 4 Marketplace, v2)
//
// Stripe hosted onboarding の return_url / refresh_url がここに直接来る (Web API 経由なし)。
// Cosmohype iOS アプリの Supabase session は Safari / SFSafariViewController の cookie
// と分離しているため、Web 側で auth 依存の同期処理を行うと通常ユーザーが必ず
// unauthorized になる。 したがって:
//
//   ・return_url / refresh_url は Web 認証を一切要求しない静的 landing
//   ・Stripe 状態の同期は iOS 側 (SFSafariViewController の onDismiss →
//     marketplace-connect-status Edge Function を iOS 自身の JWT で呼ぶ) が SoT
//   ・本 page は「iOS アプリに戻ってください」の安全な誘導だけを担当
//
// URL 設計:
//   RETURN:  https://www.cosmohype.jp/marketplace/connect/complete?flow=return
//   REFRESH: https://www.cosmohype.jp/marketplace/connect/complete?flow=refresh
//
// - Stripe secret / account id / user id 等の PII / secret は URL に一切入れない
// - 本 page 自体もクエリの flow 値以外は何も参照しない
// - open redirect / server-side redirect なし (常に 200 レンダリング)
// - Shop brand-admin への遷移は一切なし
// - 検索エンジン index させない (private landing)
// =============================================================================

export const metadata = {
  title: '売上金の受け取り設定 - Cosmohype',
  robots: { index: false, follow: false },
}

type SearchParams = {
  flow?: string
}

export default async function MarketplaceConnectCompletePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const flow = typeof sp.flow === 'string' ? sp.flow : null

  let title: string
  let message: string
  if (flow === 'refresh') {
    // Stripe Account Link が期限切れ/無効化されて Stripe から refresh_url に飛ばされた
    title = 'セッションが切れました'
    message =
      'Cosmohype アプリに戻り、もう一度「設定を続ける」をお試しください。'
  } else if (flow === 'return') {
    // Stripe onboarding UI から通常退出、iOS 側が SFSafariViewController.onDismiss で
    // marketplace-connect-status を呼び直し、最新状態を DB cache に反映してくれる
    title = '設定情報を反映しています'
    message =
      'Cosmohype アプリに戻ってください。 最新の受け取り設定はアプリ内でご確認いただけます。'
  } else {
    // flow 指定なし = 直接 URL を叩かれた / bookmark 経由 / 予期しないアクセス
    title = '売上金の受け取り設定ページ'
    message = 'Cosmohype アプリからお進みください。'
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#0b0b0f',
        color: '#f5f5f7',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", Segoe UI, system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{title}</h1>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: '#c9c9d1', marginBottom: 24 }}>
          {message}
        </p>
        <p style={{ fontSize: 12, color: '#8a8a95' }}>
          このページは Cosmohype 売上金受け取り設定の完了/更新ページです。
        </p>
      </div>
    </main>
  )
}
