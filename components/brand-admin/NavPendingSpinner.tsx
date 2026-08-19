'use client'

import { useLinkStatus } from 'next/link'
import { useEffect, useRef } from 'react'

/**
 * Brand Admin ナビ Link 用 「遷移中フィードバック + 二重タップ禁止」。
 *
 * ・親 `<Link>` の内側でだけ使う。 `useLinkStatus()` (Next.js 15+) が
 *   親 Link のクリック → 次ページ描画完了までの間 pending=true を返す。
 * ・pending=true の間、以下 3 点を同時に適用する:
 *    1. inline spinner を描画 (親 Link の文字色 = currentColor を継承)
 *    2. 親 anchor の `pointer-events: none` + `opacity: 0.6` を DOM 直操作で付与
 *       → **二重タップを完全禁止**。 Next.js router の重複抑止に依存しない。
 *    3. `aria-busy="true"` / `aria-disabled="true"` を anchor に付与
 *       → スクリーンリーダ / 支援技術にも「今操作不能」と伝える
 *   pending=false に戻ったら 1〜3 を完全に元に戻す (cleanup)。
 *
 * ・レイアウト非破壊:
 *    - 静止時は spinner を描画しない = 0 pt の差分
 *    - DOM 操作は inline style のみで、既存 className は変更しない
 *    - sentinel span は `display:none` で寸法を持たない
 *
 * ・行 Link (tile 全体が Link) の場合は spinner の位置を chevron 付近に固定したいため
 *   `showSpinner=false` を渡して spinner 描画を抑え、chevron 隣に別 <NavPendingSpinner>
 *   を独立配置する ── どちらの instance も同じ parent Link の useLinkStatus を参照する
 *   ので pending 中は両方の効果 (行 anchor の disable + chevron 隣 spinner) が同時に発火する。
 */
export function NavPendingSpinner({
  size = 12,
  className = '',
  showSpinner = true,
}: {
  /** spinner のピクセルサイズ (default 12) */
  size?: number
  /** spinner span への追加 className */
  className?: string
  /** false にすると spinner の描画を抑制。DOM disable ロジックは同じく発火する */
  showSpinner?: boolean
}) {
  const { pending } = useLinkStatus()
  const sentinelRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    // sentinel span から closest('a') で親 <Link> の anchor 要素を取得。
    // useRef の current は React が管理するので、useEffect の deps に含めなくて良い。
    const anchor = sentinelRef.current?.closest('a') as HTMLAnchorElement | null
    if (!anchor) return
    if (pending) {
      anchor.style.pointerEvents = 'none'
      anchor.style.opacity = '0.6'
      anchor.setAttribute('aria-busy', 'true')
      anchor.setAttribute('aria-disabled', 'true')
    } else {
      anchor.style.pointerEvents = ''
      anchor.style.opacity = ''
      anchor.removeAttribute('aria-busy')
      anchor.removeAttribute('aria-disabled')
    }
    // cleanup: unmount 時 (Link 消失時) にも style を戻す
    return () => {
      if (!anchor.isConnected) return
      anchor.style.pointerEvents = ''
      anchor.style.opacity = ''
      anchor.removeAttribute('aria-busy')
      anchor.removeAttribute('aria-disabled')
    }
  }, [pending])

  return (
    <>
      {/* 0 寸 sentinel: parent anchor の ref lookup 用。 display:none 相当。 */}
      <span ref={sentinelRef} className="hidden" aria-hidden />
      {showSpinner && pending && (
        <span
          role="status"
          aria-label="遷移中"
          className={
            'inline-block align-[-2px] animate-spin rounded-full ' +
            'border-2 border-current border-t-transparent ' +
            className
          }
          style={{ width: size, height: size }}
        />
      )}
    </>
  )
}
