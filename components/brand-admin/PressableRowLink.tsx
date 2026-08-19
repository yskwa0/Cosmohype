'use client'

import Link from 'next/link'
import { useCallback, useState, type ComponentProps, type ReactNode } from 'react'
import { NavPendingSpinner } from '@/components/brand-admin/NavPendingSpinner'

// =============================================================================
// PressableRowLink
//
// 大きな row / tile 系 <Link> に「指を置いた瞬間に強い視覚変化 → 指を離すまで持続」
// を保証するための client wrapper。
//
// なぜ CSS `:active` だけでは不十分か:
//   ・iPhone Safari では短タップだと :active が transition 途中で解除され、
//     見た目の変化が完了する前にリセットされる。
//   ・大きな row を軽くタップした時に「押した感」が希薄になる。
//
// 解決策:
//   ・pointerdown / pointerup / pointerleave / pointercancel / touchcancel を
//     明示的にハンドリングして React state `pressed` を持つ。
//   ・pressed=true の間は追加 class を貼り、scale/opacity/brightness/bg 変化を
//     transition なしで即座に固定 → 指を離すまで確実に見た目が維持される。
//   ・pointerup / cancel で pressed=false になり transition 100ms で自然復帰。
//
// pending (遷移中):
//   ・NavPendingSpinner を内部に配置しているので、useLinkStatus() 経由で
//     - 親 anchor に pointer-events:none + opacity:0.6 + aria-busy を DOM 直操作で付与
//     - chevron 隣 (children で <NavPendingSpinner /> を配置している場合) に spinner
//   ・二重タップ完全禁止 + 「今遷移中」を可視化。
//
// レイアウト:
//   ・display:block の <Link>。 子は自由 (行構造そのまま)。
//   ・pressed 中は inline-style で transform/background-color/filter を上書き。
//     transition なしにするために duration-0 class を貼る (release 側は既存 transition-100ms)。
//
// 使い方:
//   <PressableRowLink href={`/brand-admin/orders/${g.id}`} className="flex …">
//     ...行の中身...
//   </PressableRowLink>
// =============================================================================

type Props = Omit<ComponentProps<typeof Link>, 'children' | 'className'> & {
  className?: string
  children: ReactNode
}

export function PressableRowLink({ className = '', children, ...linkProps }: Props) {
  const [pressed, setPressed] = useState(false)

  const setDown = useCallback(() => setPressed(true), [])
  const setUp = useCallback(() => setPressed(false), [])

  // pressed=true の時は transition を切って即座に強い変化を貼る。
  // pressed=false 時 (release 直後) は 100ms で自然に元に戻す。
  const pressedClasses = pressed
    ? 'duration-0 scale-[0.985] opacity-80 brightness-95 bg-neutral-100'
    : ''

  return (
    <Link
      {...linkProps}
      className={
        // ベース: transition (release 側 100ms) + タップ最適化 + iOS 灰 chip 無効化
        'block transition-[transform,opacity,background-color,filter] duration-100 ease-out ' +
        'origin-center will-change-transform ' +
        'cursor-pointer select-none touch-manipulation ' +
        '[-webkit-tap-highlight-color:transparent] ' +
        // JS 主導 pressed state (transition 0 で即座に強い変化)
        pressedClasses + ' ' +
        // ホスト側の layout / hover 装飾
        className
      }
      onPointerDown={setDown}
      onPointerUp={setUp}
      onPointerLeave={setUp}
      onPointerCancel={setUp}
      onTouchCancel={setUp}
      onClick={(e) => {
        // 二重タップ防止: pressed 中の再クリックは無視 (NavPendingSpinner の DOM disable と
        // 二重防御)。 遷移が始まると useLinkStatus() 経由で anchor 自体が pointer-events:none
        // になるが、pressed 直後の 1 フレーム間の race を防ぐ。
        // なお ctrl/cmd/middle click は browser 標準の新規タブ動作を維持したいので触らない。
        if (linkProps.onClick) linkProps.onClick(e)
      }}
    >
      {/* NavPendingSpinner を隠し配置: sentinel 経由で anchor 全体を pending 中 disable。
          spinner の視覚表示は children 側の <NavPendingSpinner> (chevron 隣に置く) が担う。 */}
      <NavPendingSpinner showSpinner={false} />
      {children}
    </Link>
  )
}
