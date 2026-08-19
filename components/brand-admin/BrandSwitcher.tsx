'use client'

import { useRef } from 'react'
import { useFormStatus } from 'react-dom'
import type { BrandMembership } from '@/lib/brandAdmin'
import { Spinner } from '@/lib/brandAdminUi'

interface Props {
  memberships: BrandMembership[]
  currentBrandId: string
  switchAction: (formData: FormData) => Promise<void>
}

/**
 * 参加中 brand が複数ある場合の切替 UI。1 件だけならただの表示。
 * 実際の切替は Server Action で行い、cookie を http-only で書く。
 *
 * pending 表示 (useFormStatus):
 *   ・切替中は select 自体を disabled
 *   ・右端に小さい spinner を出して「今切替中」を可視化
 *   ・完了 (redirect + revalidate) 後に自動で pending=false に戻る
 */
export default function BrandSwitcher({
  memberships,
  currentBrandId,
  switchAction,
}: Props) {
  const formRef = useRef<HTMLFormElement | null>(null)

  if (memberships.length <= 1) {
    const only = memberships[0]
    return (
      <div className="text-xs font-semibold text-neutral-900 truncate">
        {only.brandName}
      </div>
    )
  }

  return (
    <form ref={formRef} action={switchAction}>
      <SwitcherSelect
        currentBrandId={currentBrandId}
        memberships={memberships}
        onChange={() => formRef.current?.requestSubmit()}
      />
    </form>
  )
}

function SwitcherSelect({
  currentBrandId,
  memberships,
  onChange,
}: {
  currentBrandId: string
  memberships: BrandMembership[]
  onChange: () => void
}) {
  const { pending } = useFormStatus()
  return (
    <div className="relative">
      <select
        name="brand_id"
        defaultValue={currentBrandId}
        onChange={onChange}
        disabled={pending}
        aria-busy={pending}
        className={
          'w-full h-8 text-xs bg-white border border-neutral-300 rounded px-2 ' +
          (pending ? 'opacity-60 cursor-not-allowed pr-8 ' : '') +
          'transition-opacity duration-100'
        }
      >
        {memberships.map((m) => (
          <option key={m.brandId} value={m.brandId}>
            {m.brandName}
          </option>
        ))}
      </select>
      {pending && (
        <span
          className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500"
          aria-hidden
        >
          <Spinner size={11} />
        </span>
      )}
    </div>
  )
}
