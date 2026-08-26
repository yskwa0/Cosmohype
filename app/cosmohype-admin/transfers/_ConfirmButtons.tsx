'use client'

/**
 * `/cosmohype-admin/transfers/[orderGroupId]` 用の確認 dialog 付き submit ボタン群。
 *
 * retry: 1 段確認 (ブランド停止と同等のトーン)。
 * abandon: 2 段確認 + 明示的な「Cosmohype 側の損失として手動処理する」文言。
 *          Stripe API を呼ばないので誤操作すると帳簿と Stripe が乖離する = 特に慎重に。
 */

export function ConfirmRetryReversalButton() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        const ok = window.confirm(
          'この Reversal を再試行し pending 状態に戻します。' +
          '\n次回 Reversal worker tick で Stripe /v1/transfers/{id}/reversals が再度発行されます。' +
          '\nよろしいですか？',
        )
        if (!ok) e.preventDefault()
      }}
      className="h-9 px-4 rounded bg-emerald-600 text-white text-[13px] font-semibold hover:bg-emerald-700"
    >
      Retry を実行
    </button>
  )
}

export function ConfirmAbandonReversalButton() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        const step1 = window.confirm(
          '⚠ 非常に重要な操作です。' +
          '\n\nこの Reversal を「abandoned」に確定します。' +
          '\nStripe /v1/transfers/{id}/reversals は呼び出されません。' +
          '\nこの Reversal は自動再試行されません。' +
          '\nCosmohype 側の損失として手動処理する前提での操作です。' +
          '\n\n続行しますか？',
        )
        if (!step1) {
          e.preventDefault()
          return
        }
        const step2 = window.confirm(
          '最終確認: 本当に abandoned にしますか？' +
          '\nこの操作は自動では戻せません。' +
          '\n入力した理由 (reason) は監査ログとして reversal_last_error に保存されます。',
        )
        if (!step2) e.preventDefault()
      }}
      className="h-9 px-4 rounded bg-red-700 text-white text-[13px] font-semibold hover:bg-red-800"
    >
      Abandon を実行
    </button>
  )
}
