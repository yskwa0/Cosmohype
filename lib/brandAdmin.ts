// =============================================================================
// lib/brandAdmin.ts  (Brand Admin Web Phase 1)
//
// ブランド管理画面の Server 側共通コンテキスト取得ヘルパ。
//
// 目的:
//   * どの Server Component / Server Action / Route Handler からでも
//     `getBrandAdminContext()` を呼ぶだけで
//     ・認証済 user
//     ・active な shop_brand_members のリスト
//     ・現在選択中の brand (cookie ベース、無ければ最初の membership)
//     を取得できる。
//   * client から brand_id を偽装してもここで active membership を DB 側で
//     再検証するため他ブランドには絶対に切り替わらない。
//
// 未認証 or 無 membership の場合は redirect() を投げるので、
// 呼び出し側は返却された値を安全に前提として使える。
//
// Phase 1 では role による権限差はまだ細かく制御しないが、
// canManageProducts / canManageOrders / canReviewIssues の helper を
// 型シグネチャだけ用意して次フェーズで拡張しやすくしている。
// =============================================================================

import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * cookie 名。cookie 値はユーザーが選択している brand_id (UUID)。
 * 実際に有効かどうかは毎リクエストで shop_brand_members を SELECT して検証する。
 */
export const BRAND_ADMIN_CURRENT_BRAND_COOKIE = 'brand_admin_current_brand'

export type BrandRole = 'owner' | 'admin' | 'staff'

export interface BrandMembership {
  brandId: string
  brandName: string
  brandSlug: string | null
  role: BrandRole
  status: string
}

export interface BrandAdminContext {
  user: {
    id: string
    email: string | null
  }
  currentBrand: BrandMembership
  memberships: BrandMembership[]
}

// -----------------------------------------------------------------------------
// Dev Bypass は撤去 (Production Supabase 一本運用)
// -----------------------------------------------------------------------------
// 以前は `BRAND_ADMIN_DEV_BYPASS=true` + Test project URL の組合せで認証を skip し、
// admin client 経由で shop_brands を直接 UPDATE できる開発用抜け道が存在した。
//
// 現在は Cosmohype / HYPE 全体を Production Supabase (pyrxyhyjzufefobcjqnc) 一本
// で運用する方針となったため、Test project への write が発生する可能性を根本から
// 排除する目的で本ヘルパを削除した。
//
// - `isBrandAdminDevBypassEnabled()` は互換性のため残し、常に `false` を返す
//   (旧 callsite の import と `if (bypass) { ... }` 分岐が残っていても runtime で
//    絶対に true にならない)。
// - `DEV_BYPASS_MEMBERSHIP` / `DEV_BYPASS_CONTEXT` / 固定 brand_id は削除済。
// - `BrandAdminContext.isDevBypass` field も撤去。
export function isBrandAdminDevBypassEnabled(): boolean {
  return false
}

interface RawBrandMemberRow {
  brand_id: string
  role: string
  status: string
  shop_brands: {
    id: string
    name: string
    slug: string | null
    status: string
  } | null
}

function isRole(v: string): v is BrandRole {
  return v === 'owner' || v === 'admin' || v === 'staff'
}

/**
 * すべての brand-admin protected ページから呼ぶ。
 * 未認証 → /brand-admin/login にリダイレクト。
 * membership 無し / active 無し → /brand-admin/login?err=no_membership にリダイレクト。
 * 有効 memberships があれば cookie を見て current brand を確定 (無ければ 1 番目)。
 *
 * ★ 高速化: React `cache()` で 1 リクエスト内の重複呼出を dedupe。
 *    layout.tsx が呼び、その後の page.tsx が同一 request 内で再度呼んでも
 *    Supabase auth.getUser + shop_brand_members query は 1 回のみ実行される。
 *    (React `cache` は per-request なのでユーザー間で共有されない = 安全)
 */
export const getBrandAdminContext = cache(async (): Promise<BrandAdminContext> => {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (!user) {
    redirect('/brand-admin/login')
  }

  // types/database.ts には shop_* が未生成なので as any でクエリ (型は下で厳密化)
  const { data: rows, error } = await (supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (col: string, val: string) => {
          eq: (col: string, val: string) => Promise<{ data: RawBrandMemberRow[] | null; error: unknown }>
        }
      }
    }
  })
    .from('shop_brand_members')
    .select('brand_id, role, status, shop_brands(id, name, slug, status)')
    .eq('user_id', user!.id)
    .eq('status', 'active')

  if (error) {
    // 詳細は握りつぶさず log、ユーザーには一律 no_membership 扱い
    // eslint-disable-next-line no-console
    console.error('[brandAdmin] shop_brand_members query failed', error)
    redirect('/brand-admin/login?err=fetch_failed')
  }

  const memberships: BrandMembership[] = (rows ?? [])
    .filter((r) => r.shop_brands && r.shop_brands.status === 'active' && isRole(r.role))
    .map((r) => ({
      brandId: r.brand_id,
      brandName: r.shop_brands!.name,
      brandSlug: r.shop_brands!.slug,
      role: r.role as BrandRole,
      status: r.status,
    }))

  if (memberships.length === 0) {
    redirect('/brand-admin/login?err=no_membership')
  }

  const cookieStore = await cookies()
  const cookieBrandId = cookieStore.get(BRAND_ADMIN_CURRENT_BRAND_COOKIE)?.value
  const current =
    memberships.find((m) => m.brandId === cookieBrandId) ?? memberships[0]

  return {
    user: { id: user!.id, email: user!.email ?? null },
    currentBrand: current,
    memberships,
  }
})

// -----------------------------------------------------------------------------
// role 権限 helper (Phase 1 は Dashboard 内表示用のみ、実制御は次フェーズ)
// -----------------------------------------------------------------------------
export function canManageProducts(role: BrandRole): boolean {
  return role === 'owner' || role === 'admin'
}
export function canManageOrders(role: BrandRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'staff'
}
export function canReviewIssues(role: BrandRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'staff'
}
