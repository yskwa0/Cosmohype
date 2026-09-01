'use client'

// =============================================================================
// AcceptButton — 「HYPE Owner として参加する」 submit button
//
// 目的:
//   ・ iPhone Safari で軽く自然な tap feedback (scale 0.97 + opacity 0.90、150ms)
//   ・ Server Action pending 中は disabled + spinner + 「参加しています…」で
//     二重 tap / 二重 accept RPC を防止
//
// useFormStatus は form の action (Server Action) が実行中かを購読する。
// 親の <form action={acceptExistingUserInvitationAction}> の中で使うこと。
// =============================================================================

import { useFormStatus } from 'react-dom'
import { Spinner } from '@/lib/brandAdminUi'

export default function AcceptButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={
        'w-full h-11 rounded-md text-sm font-semibold ' +
        'bg-white text-neutral-900 ' +
        'inline-flex items-center justify-center gap-2 ' +
        // tap feedback (user spec: scale 0.97, opacity ↓, 150ms, no bounce)
        'transition-[transform,opacity,filter] duration-150 ease-out ' +
        'origin-center will-change-transform ' +
        'active:scale-[0.97] active:opacity-90 ' +
        // disabled = pending (二重 submit 防止)
        'disabled:opacity-70 disabled:cursor-not-allowed ' +
        'disabled:active:scale-100 disabled:active:opacity-70 ' +
        // iOS friendly
        'cursor-pointer select-none touch-manipulation ' +
        '[-webkit-tap-highlight-color:transparent]'
      }
    >
      {pending && <Spinner />}
      {pending ? '参加しています…' : 'HYPE Owner として参加する'}
    </button>
  )
}
