'use client'

/**
 * `/cosmohype-admin/reports/[reportId]` 用の確認 dialog 付き status 変更ボタン。
 *
 * 商品/ブランド停止と同じ確認 UX に揃えるための最小 client wrapper。
 * 誤クリックで通報 status が意図しない値に flip されるのを防ぐ。
 */

interface Props {
  nextStatus: string
  disabled:   boolean
}

function labelFor(next: string): string {
  switch (next) {
    case 'open':          return '未対応'
    case 'under_review':  return '確認中'
    case 'dismissed':     return '対応不要'
    case 'resolved':      return '対応済み'
    default:              return next
  }
}

export function ConfirmReportStatusButton({ nextStatus, disabled }: Props) {
  return (
    <button
      type="submit"
      disabled={disabled}
      onClick={(e) => {
        if (disabled) return
        if (!window.confirm(
          `通報のステータスを「${labelFor(nextStatus)}」(${nextStatus}) に変更します。よろしいですか？`
        )) {
          e.preventDefault()
        }
      }}
      className={`text-[12px] px-3 py-1.5 rounded border ${
        disabled
          ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-default'
          : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-50'
      }`}
    >
      → {nextStatus}
    </button>
  )
}
