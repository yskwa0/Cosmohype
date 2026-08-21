'use client'

/**
 * `/cosmohype-admin/brands` 用の確認 dialog 付き submit ボタン群 (client component)。
 * suspend / reactivate それぞれ別の文言でウォークスルー。
 */

export function ConfirmSuspendButton() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(
          'このブランドの新規販売を停止します。既存注文の対応は継続できます。よろしいですか？'
        )) {
          e.preventDefault()
        }
      }}
      className="h-8 px-3 rounded bg-red-600 text-white text-[12px] font-semibold hover:bg-red-700"
    >
      ブランドを停止
    </button>
  )
}

export function ConfirmReactivateButton() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm('このブランドを再開しますか？')) {
          e.preventDefault()
        }
      }}
      className="h-8 px-3 rounded bg-emerald-600 text-white text-[12px] font-semibold hover:bg-emerald-700"
    >
      ブランドを再開
    </button>
  )
}
