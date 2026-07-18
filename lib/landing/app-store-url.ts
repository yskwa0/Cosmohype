// =============================================================================
// Cosmohype iOS アプリの App Store URL — 単一ソース
//
// ランディングページ (`app/page.tsx` および `components/landing/*`) 内で
// App Store への誘導を張るときは、必ずこの `getAppStoreUrl()` を経由する。
// これにより URL を複数箇所へハードコードせず、後の変更を 1 箇所で完結できる。
//
// 優先順位:
//   1) 環境変数 `NEXT_PUBLIC_APP_STORE_URL` (空文字は未設定として扱う)
//   2) 下記 `FALLBACK_APP_STORE_URL` (App Store の検索 URL、iOS Safari では
//      App Store アプリが自動起動する)
//
// フォールバックは「リンクが空文字 / undefined にならない」ことを保証する
// ためのもので、正式な universal link が用意でき次第 env で上書きする運用。
// =============================================================================

const FALLBACK_APP_STORE_URL = 'https://apps.apple.com/jp/search?term=cosmohype'

export function getAppStoreUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_STORE_URL
  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl
  }
  return FALLBACK_APP_STORE_URL
}
