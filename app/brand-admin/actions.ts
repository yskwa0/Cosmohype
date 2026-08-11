'use server'

// =============================================================================
// app/brand-admin/actions.ts  (Brand Admin Web Phase 1)
//
// Sign out / current brand 切替 の Server Action。
// client から直接 Supabase を叩かず、server で auth session と membership を
// 再検証してから cookie 操作を行う。
// =============================================================================

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BRAND_ADMIN_CURRENT_BRAND_COOKIE } from '@/lib/brandAdmin'

export async function brandAdminSignOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete(BRAND_ADMIN_CURRENT_BRAND_COOKIE)
  redirect('/brand-admin/login')
}

/**
 * brand 切替。client から送信された brand_id を server で必ず active membership と
 * 突き合わせてから cookie を書く。他ブランドへの偽装切替は物理的に不可。
 */
export async function switchBrandAction(formData: FormData) {
  const brandId = String(formData.get('brand_id') ?? '')
  if (!/^[0-9a-fA-F-]{36}$/.test(brandId)) {
    redirect('/brand-admin?err=invalid_brand_id')
  }
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (!user) {
    redirect('/brand-admin/login')
  }
  // membership 再検証
  const { data: rows, error } = await (supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          eq: (c: string, v: string) => {
            eq: (c: string, v: string) => Promise<{ data: unknown[] | null; error: unknown }>
          }
        }
      }
    }
  })
    .from('shop_brand_members')
    .select('brand_id')
    .eq('user_id', user!.id)
    .eq('brand_id', brandId)
    .eq('status', 'active')
  if (error || !rows || rows.length === 0) {
    redirect('/brand-admin?err=not_a_member')
  }
  const cookieStore = await cookies()
  cookieStore.set(BRAND_ADMIN_CURRENT_BRAND_COOKIE, brandId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  redirect('/brand-admin')
}
