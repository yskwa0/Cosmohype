'use client'

// =============================================================================
// bodyScrollLock
//
// ページ全体のスクロールを「今この瞬間だけ」ロックしたい時に使う小さなユーティリティ。
//
// なぜ必要か:
//   ・crop editor の preview を iPhone Safari で指でドラッグすると、pointer event
//     による position 更新と同時に Safari のネイティブ scroll gesture も走ってしまい、
//     画像を掴んでいるのにページ全体が上下スクロールする。
//   ・preview 側に touch-action:none を付けるだけでは iOS の慣性/バウンス由来の
//     スクロールが完全には止まらないケースがある。
//   ・そのため drag 開始時に body + html の overflow / touch-action /
//     overscroll-behavior を保存 → 抑止値へ切替、drag 終了時に完全復元する。
//
// 挙動:
//   ・lockBodyScroll() を呼ぶと復元用の cleanup 関数が返る。
//   ・複数回 lock された場合でも、それぞれの cleanup が返した関数だけを対象に復元
//     (前回 lock の値を保存 → 復元するので既存 style と競合しない)。
//   ・cleanup は idempotent (2 回呼んでも安全)。
//   ・SSR 環境 (typeof document === 'undefined') では no-op を返す。
//
// 使い方 (React):
//   const unlockRef = useRef<null | (() => void)>(null)
//   const onPointerDown = () => { unlockRef.current = lockBodyScroll() }
//   const release       = () => { unlockRef.current?.(); unlockRef.current = null }
//   pointerup / pointercancel / pointerleave / touchcancel すべてで release を呼ぶ。
//   さらに useEffect の unmount cleanup でも release を呼び「lock 中に unmount」保険。
// =============================================================================

export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') return () => {}
  const body = document.body
  const html = document.documentElement
  const prev = {
    bodyOverflow:       body.style.overflow,
    bodyTouchAction:    body.style.touchAction,
    bodyOverscroll:     body.style.overscrollBehavior,
    htmlOverflow:       html.style.overflow,
    htmlTouchAction:    html.style.touchAction,
    htmlOverscroll:     html.style.overscrollBehavior,
  }
  body.style.overflow           = 'hidden'
  body.style.touchAction        = 'none'
  body.style.overscrollBehavior = 'contain'
  html.style.overflow           = 'hidden'
  html.style.touchAction        = 'none'
  html.style.overscrollBehavior = 'contain'
  let restored = false
  return () => {
    if (restored) return
    restored = true
    body.style.overflow           = prev.bodyOverflow
    body.style.touchAction        = prev.bodyTouchAction
    body.style.overscrollBehavior = prev.bodyOverscroll
    html.style.overflow           = prev.htmlOverflow
    html.style.touchAction        = prev.htmlTouchAction
    html.style.overscrollBehavior = prev.htmlOverscroll
  }
}
