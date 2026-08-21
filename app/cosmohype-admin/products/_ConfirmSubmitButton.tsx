'use client'

/**
 * `/cosmohype-admin/products` 用の「販売停止」submit ボタン (client component)。
 * SSR で render される page.tsx (Server Component) からは import して埋め込む。
 * 停止操作の誤タップ防止に window.confirm を挟む (シンプル、外部依存なし)。
 */
export default function ConfirmSubmitButton() {
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
