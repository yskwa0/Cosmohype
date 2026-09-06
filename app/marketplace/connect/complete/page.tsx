// =============================================================================
// app/marketplace/connect/complete/page.tsx   (PHASE 4 Marketplace)
//
// Stripe hosted onboarding return_url handler (`/api/stripe-connect/marketplace/return`)
// からリダイレクトされる landing page。
// - onboarding UI から戻ったユーザーへ、アプリに戻る導線を提示
// - state (active / pending / restricted) と err (あれば) をクエリで受け取り表示切替
// - iOS app は universal link (applinks:cosmohype.jp) で本 path を開くと自動起動する
//   ため、Safari 上での操作は最小限
// =============================================================================

type SearchParams = {
  saved?: string
  state?: string
  reason?: string
  err?: string
}

export default async function MarketplaceConnectCompletePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const err = typeof sp.err === 'string' ? sp.err : null
  const state = typeof sp.state === 'string' ? sp.state : null
  const reason = typeof sp.reason === 'string' ? sp.reason : null

  let title: string
  let message: string
  if (err) {
    title = '設定を完了できませんでした'
    message =
      err === 'unauthorized'
        ? 'ログイン状態を確認できませんでした。 アプリからもう一度お試しください。'
        : `${err} が発生しました。 アプリから再度お試しください。`
  } else if (state === 'active') {
    title = '売上金の受け取り設定が完了しました'
    message = 'Cosmohype アプリに戻ってください。'
  } else if (state === 'restricted' && reason) {
    title = 'まだ追加情報の入力が必要です'
    message = `Stripe から次の要件が返されています: ${reason}。 アプリからもう一度「設定を続ける」を実行してください。`
  } else {
    title = '設定情報を反映しています'
    message = 'アプリに戻り、少し時間をおいて状態をご確認ください。'
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
