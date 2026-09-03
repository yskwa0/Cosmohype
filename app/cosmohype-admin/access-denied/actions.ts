'use server'

// =============================================================================
// /cosmohype-admin/access-denied Server Action
//
// signOutAndReloginAction:
//   ・ 現在の user session を signOut (Cosmohype auth cookie を破棄)
//   ・ next param (safeInternalPath validate + /cosmohype-admin prefix 縛り) を
//     ?redirect=<next> として付けて /login にリダイレクト
//   ・ login 後は proxy.ts の isAuthPath && user 分岐が redirect を尊重して
//     元 deep path (/cosmohype-admin/hype-applications 等) に返す
//
// 禁止:
//   ・ 現在 session を残したまま /login に飛ばす (別アカウント login フォーム
//     でも既存 session が生きていると同じ role で再判定されるため)
//   ・ 外部 URL / protocol-relative redirect
// =============================================================================

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { safeInternalPath } from '@/lib/safeInternalPath'

function computeReturnPath(rawNext: string): string {
  const s = safeInternalPath(rawNext)
  if (!s) return '/cosmohype-admin'
  if (s === '/cosmohype-admin' || s.startsWith('/cosmohype-admin/')) return s
  return '/cosmohype-admin'
}

export async function signOutAndReloginAction(formData: FormData): Promise<void> {
  const nextRaw = String(formData.get('next') ?? '')
  const returnPath = computeReturnPath(nextRaw)

  const supabase = await createClient()
  // signOut は cookie clear を含む (SSR client の setAll が呼ばれる)。
  await supabase.auth.signOut()

  redirect(`/login?redirect=${encodeURIComponent(returnPath)}`)
}
