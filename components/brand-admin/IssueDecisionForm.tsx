'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'

interface Props {
  issueId: string
  approveAction: (formData: FormData) => Promise<void>
  rejectAction: (formData: FormData) => Promise<void>
}

const REJECTION_REASONS = [
  { value: 'defect_not_confirmed',  label: '不良を確認できない' },
  { value: 'matches_order',         label: '注文内容と一致している' },
  { value: 'customer_preference',   label: 'お客様都合に該当' },
  { value: 'insufficient_evidence', label: '証拠が不足している' },
  { value: 'other',                 label: 'その他' },
] as const

// primary (黒背景 + 白文字)。hover でわずかに薄く、disabled でグレー化しても白文字を維持。
const PRIMARY_CLASS =
  'px-4 py-2 rounded-md text-sm font-semibold bg-neutral-900 text-white ' +
  'hover:bg-neutral-800 disabled:bg-neutral-400 disabled:text-neutral-100 disabled:cursor-not-allowed'

// secondary (白背景 + 黒枠 + 黒文字)。primary と同じ height/padding/font-weight で並べる。
const SECONDARY_CLASS =
  'px-4 py-2 rounded-md text-sm font-semibold bg-white text-neutral-900 border border-neutral-900 ' +
  'hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed'

function ApproveSubmit() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={PRIMARY_CLASS}>
      {pending ? '送信中…' : '承認を確定する'}
    </button>
  )
}
function RejectSubmit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={disabled || pending} className={SECONDARY_CLASS}>
      {pending ? '送信中…' : '却下を確定する'}
    </button>
  )
}

/**
 * under_review 状態の issue に対する 承認 / 却下 UI。
 * 2 ボタンで modal-like インライン展開、それぞれ独立した Server Action form。
 */
export default function IssueDecisionForm({
  issueId,
  approveAction,
  rejectAction,
}: Props) {
  const [mode, setMode] = useState<'idle' | 'approve' | 'reject'>('idle')
  const [rejectReason, setRejectReason] = useState('')
  const [approveNote, setApproveNote] = useState('')
  const [rejectNote, setRejectNote] = useState('')

  if (mode === 'idle') {
    return (
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => setMode('approve')} className={PRIMARY_CLASS}>
          承認する
        </button>
        <button type="button" onClick={() => setMode('reject')} className={SECONDARY_CLASS}>
          却下する
        </button>
      </div>
    )
  }

  if (mode === 'approve') {
    return (
      <form action={approveAction} className="space-y-3 max-w-lg">
        <input type="hidden" name="issue_id" value={issueId} />
        <div className="text-sm font-semibold text-neutral-900">この申請を承認しますか？</div>
        <div className="text-[12px] text-neutral-600">
          承認後、返品対応の案内に進みます。<br />
          承認だけでは Stripe 返金や在庫戻しは行われません (次フェーズで実装)。
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
            ブランドコメント (任意、購入者に表示されます)
          </label>
          <textarea
            name="resolution_note"
            value={approveNote}
            onChange={(e) => setApproveNote(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="例: 商品の状態を確認しました。返品対応をご案内します。"
            className="w-full border border-neutral-300 rounded p-2 text-sm bg-white"
          />
          <div className="mt-0.5 text-[10px] text-neutral-500 text-right">
            {approveNote.length} / 1000
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode('idle')} className={SECONDARY_CLASS}>
            戻る
          </button>
          <ApproveSubmit />
        </div>
      </form>
    )
  }

  // reject
  return (
    <form action={rejectAction} className="space-y-3 max-w-lg">
      <input type="hidden" name="issue_id" value={issueId} />
      <div className="text-sm font-semibold text-neutral-900">この申請を却下しますか？</div>
      <div className="text-[12px] text-neutral-600">
        却下すると購入者側に「申請は承認されませんでした」と表示されます。
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
          却下理由 (必須)
        </label>
        <select
          name="rejection_reason"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          className="w-full h-10 border border-neutral-300 rounded px-2 text-sm bg-white"
        >
          <option value="">選択してください</option>
          {REJECTION_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
          コメント (任意、購入者に表示されます)
        </label>
        <textarea
          name="resolution_note"
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
          rows={4}
          maxLength={1000}
          className="w-full border border-neutral-300 rounded p-2 text-sm bg-white"
        />
        <div className="mt-0.5 text-[10px] text-neutral-500 text-right">
          {rejectNote.length} / 1000
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode('idle')} className={SECONDARY_CLASS}>
          戻る
        </button>
        <RejectSubmit disabled={rejectReason === ''} />
      </div>
    </form>
  )
}
