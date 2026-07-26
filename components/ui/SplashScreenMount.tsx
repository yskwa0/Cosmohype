'use client'
import dynamic from 'next/dynamic'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const BG = 'linear-gradient(160deg, #090714 0%, #1A0533 35%, #2D0A5F 60%, #090714 100%)'

// dynamic チャンク読み込み中のカバー。
// 常に紫背景を表示してコンテンツのチラ見えを防ぐ。
// 再訪問時のsessionStorage判定はSplashScreen本体が行う（hydration mismatch回避のため）。
function SplashFallback() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        minHeight: '100dvh',
        background: BG,
        zIndex: 99999,
        pointerEvents: 'none',
      }}
    />
  )
}

const SplashScreen = dynamic(
  () => import('./SplashScreen').then(mod => ({ default: mod.SplashScreen })),
  { ssr: false, loading: SplashFallback }
)

// =====================================================================
// SplashScreenMount / SplashRouteDecider
//
// `useSearchParams()` は「pre-rendering 時に page 全体を client-side rendering へ
// opt-in させる」副作用があるため、Next.js は「最寄りの Suspense boundary までを
// クライアント化する」設計を取っている。副作用を SplashScreenMount 配下だけに
// 閉じ込めるため、useSearchParams を実際に呼ぶ `SplashRouteDecider` を Suspense
// で包み、`SplashScreenMount` 自体はその外側の薄いラッパにする。
// これにより `app/layout.tsx` (Suspense 導入不要) と他 route の SSG/SSR 判定に
// 影響を与えない。
// =====================================================================
export function SplashScreenMount() {
  // Suspense fallback は null (splash なしの状態) にしておく。
  // - Pre-rendering / SSR 時: fallback = null → splash 抑止 (最悪ケースでも
  //   Web ページ本体が瞬時に見え、後から splash が client 側で mount される)
  // - Client hydration 完了直後: SplashRouteDecider が useSearchParams / usePathname
  //   を同期取得 → 判定 → splash を出すか否か決定
  // 元の SSR SplashFallback の代替として splash を出したい経路は SplashRouteDecider
  // 内で `<SplashScreen />` を返すのでカバーされる (dynamic ssr:false なので SSR HTML
  // へは元々 SplashScreen ではなく SplashFallback しか流れていない = 挙動同等)。
  return (
    <Suspense fallback={null}>
      <SplashRouteDecider />
    </Suspense>
  )
}

function SplashRouteDecider() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // /style-id?source=physical_card (物理カード QR 経由) のみ splash 抑止。
  // - `useSearchParams()` はルーター状態を反応的に返すため、SPA 遷移で `/style-id`
  //   ⇄ `/style-id?source=physical_card` のようにクエリだけ変化しても再評価される。
  // - `?foo=1&source=physical_card` / `?source=physical_card&bar=2` のような
  //   複数クエリ・順序不同でも `URLSearchParams.get('source')` が正しく解決する。
  // - `source` は case-sensitive (小文字のみ有効) で spec 通り。
  // - private mode / null 参照時は `?.get(...)` で undefined → false 扱い (splash 継続)。
  const isPhysicalCardSource = searchParams?.get('source') === 'physical_card'

  // 招待 Landing (/invite/*) は独自の白×オレンジブランド Landing を持つ。
  // トップページ (公式ホームページ) は SplashScreen を挟まず即表示。
  // 未認証訪問者が最初に見るページであり、Instagram 公式サイトのような瞬時表示を優先する。
  if (pathname === '/') return null
  if (pathname?.startsWith('/invite/')) return null

  // /style-id 直訪問: source=physical_card のときだけ splash 非表示。
  // 通常アクセス (source 無し / source=別の値) は従来どおり splash を挟む。
  if (pathname === '/style-id' && isPhysicalCardSource) return null

  // /style-id サブページ (/quiz, /result, /claim/*) は splash 常時抑止 (診断フロー継続のため)。
  if (pathname?.startsWith('/style-id/')) return null

  // style-guess (友達の STYLE ID 予想 受取ページ) は Universal Link / Custom URL
  // Scheme で共有された結果画面。タップ→即時表示が UX 上重要なので splash を挟まない。
  if (pathname?.startsWith('/style-guess/')) return null
  return <SplashScreen />
}
