'use client'

/**
 * `/cosmohype-admin/products` 用の confirm-submit ボタン群 (client component)。
 * 誤タップ防止に window.confirm を挟む (シンプル、外部依存なし)。
 */

export default function ConfirmForceUnpublishButton() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm('この商品を HYPE で販売停止しますか？')) {
          e.preventDefault()
        }
      }}
      className="h-8 px-3 rounded bg-red-600 text-white text-[12px] font-semibold hover:bg-red-700"
    >
      販売停止
    </button>
  )
}

/**
 * 運営停止解除ボタン。 status='archived' のまま、admin_suspended_at を null に戻すだけ。
 * ブランドは以後、通常フローで revert-to-draft → publish で商品を復元できる。
 */
export function ConfirmReopenButton() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(
          '運営停止を解除します。 商品は archived のまま、ブランド側で公開手続きが必要です。'
        )) {
          e.preventDefault()
        }
      }}
      className="h-8 px-3 rounded bg-emerald-600 text-white text-[12px] font-semibold hover:bg-emerald-700"
    >
      停止解除
    </button>
  )
}
