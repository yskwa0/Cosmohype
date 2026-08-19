// =============================================================================
// Brand Admin 共通 UI ヘルパ
//
// 「押したのが分からない」問題を解決するため、Brand Admin 全 button / Link /
// タップ可能行に共通の press feedback (scale / opacity / bg) と、通信中を
// 可視化する inline Spinner を提供する。
//
// ============================================================================
// iPhone Safari で press feedback を「体感で分かる強さ」にする対策
// ============================================================================
//   1. active:scale-[0.94] + active:opacity-75  (旧 0.97/0.90 では弱すぎた)
//      → 大きく縮む + はっきり薄くなる
//   2. background-color も transition 対象に加え、白背景の Link/tab/row は
//      active:bg-neutral-100 で押下中に薄グレー背景が見えるようにする
//   3. transition-[transform,opacity,background-color,filter] で
//      4 プロパティ同時アニメ、duration 100ms ease-out
//   4. [-webkit-tap-highlight-color:transparent] で iOS 標準灰 chip を無効化し
//      独自の active スタイルだけが見えるようにする
//   5. touch-action:manipulation で iOS の 300ms tap 遅延を排除、押下直後に
//      :active が発火する
//   6. cursor-pointer + select-none で `:active` の発火条件を保証
//      (iOS では cursor:pointer 相当が :active の発火に必要な場合がある)
//   7. will-change-transform で GPU 合成、scale が滑らかに描画される
//   8. transform-origin:center で縮小が視覚的に中心対称になる
//
//   PressableRowLink (client) は :active だけでは短タップで見えづらい大きな
//   row Link 用に、pointerdown/up/leave/cancel で pressed state を JS 管理し
//   「指を置いた瞬間に強い視覚変化 → 指を離すまで持続」を保証する。
// =============================================================================

/**
 * 小〜中サイズの clickable UI 用 (button / tab / text link)。
 * 押下時に scale 0.94 + opacity 0.75 + brightness 0.95。
 * 白背景要素も薄グレー bg が active で出るので、指がどこを押したか一目で分かる。
 */
//   ※ active:bg-* は入れない: 「商品を追加」「保存する」等の bg-neutral-900 系ボタン
//     で押下時に bg が薄グレーに flash してしまい色が破綻する。
//     暗色/明色どちらでも安全に効く scale + opacity + brightness の 3 点で反応させる。
export const pressableClass =
  'transition-[transform,opacity,background-color,filter] duration-100 ease-out ' +
  'origin-center will-change-transform ' +
  'active:scale-[0.94] active:opacity-75 active:brightness-90 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed ' +
  'disabled:active:scale-100 disabled:active:opacity-60 disabled:active:brightness-100 ' +
  'cursor-pointer select-none touch-manipulation ' +
  '[-webkit-tap-highlight-color:transparent]'

/**
 * 大きな row / tile / card 用 (商品行 / 注文行 / issue 行 / チェブロン Link 等)。
 * scale を控えめ (0.985) にして「row 全体がガタッと縮む」違和感を防ぎつつ、
 * bg を明確に暗く (bg-neutral-100) + brightness 0.94 で「行全体が押された」体感を出す。
 * ※ 通常は JS 主導の <PressableRowLink> が更に強い pressed state を管理するが、
 *    サーバーコンポーネント経由の <Link> にも同じ挙動が最低限出るよう本クラスも提供。
 */
export const pressableRowClass =
  'transition-[transform,opacity,background-color,filter] duration-100 ease-out ' +
  'origin-center will-change-transform ' +
  'active:scale-[0.985] active:opacity-80 active:brightness-95 active:bg-neutral-100 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed ' +
  'disabled:active:scale-100 disabled:active:opacity-60 disabled:active:brightness-100 disabled:active:bg-transparent ' +
  'cursor-pointer select-none touch-manipulation ' +
  '[-webkit-tap-highlight-color:transparent]'

/**
 * 小さい icon button 用 (× 閉じる / ellipsis メニュー / chevron / 削除× 等)。
 * scale を強め (0.85) + opacity 0.60 + bg 濃く。 指より小さい button でも
 * 押下感が確実に出るように大きく縮む。
 */
export const pressableIconClass =
  'transition-[transform,opacity,background-color,filter] duration-100 ease-out ' +
  'origin-center will-change-transform ' +
  'active:scale-[0.85] active:opacity-60 active:brightness-90 active:bg-neutral-200 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed ' +
  'disabled:active:scale-100 disabled:active:opacity-60 disabled:active:brightness-100 disabled:active:bg-transparent ' +
  'cursor-pointer select-none touch-manipulation ' +
  '[-webkit-tap-highlight-color:transparent]'

/**
 * 通信中を可視化する inline spinner。 button label の中に置いて
 * `<Spinner /> 保存中…` のように使う。 現在の `currentColor` を stroke として
 * 使うので、親 button の文字色に自動追従。
 */
export function Spinner({
  size = 12,
  className = '',
  label,
}: {
  size?: number
  className?: string
  /** aria-label 用 (省略時は "処理中") */
  label?: string
}) {
  return (
    <span
      role="status"
      aria-label={label ?? '処理中'}
      className={
        'inline-block align-[-2px] animate-spin rounded-full ' +
        'border-2 border-current border-t-transparent ' +
        className
      }
      style={{ width: size, height: size }}
    />
  )
}
