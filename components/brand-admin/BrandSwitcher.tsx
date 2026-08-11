'use client'

import { useRef } from 'react'
import type { BrandMembership } from '@/lib/brandAdmin'

interface Props {
  memberships: BrandMembership[]
  currentBrandId: string
  switchAction: (formData: FormData) => Promise<void>
}

/**
 * 参加中 brand が複数ある場合の切替 UI。1 件だけならただの表示。
 * 実際の切替は Server Action で行い、cookie を http-only で書く。
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
      <select
        name="brand_id"
        defaultValue={currentBrandId}
        onChange={() => formRef.current?.requestSubmit()}
        className="w-full h-8 text-xs bg-white border border-neutral-300 rounded px-2"
      >
        {memberships.map((m) => (
          <option key={m.brandId} value={m.brandId}>
            {m.brandName}
          </option>
        ))}
      </select>
    </form>
  )
}
