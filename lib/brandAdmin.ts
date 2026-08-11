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
  /** Phase 1 開発中の Dev Bypass 経路で入っているかどうか (UI 表示 + logout 抑止に使う) */
  isDevBypass: boolean
}

// -----------------------------------------------------------------------------
// Dev Bypass (開発中のみ、認証をスキップして管理画面を触れるようにする)
// -----------------------------------------------------------------------------
// 有効化条件はすべて満たす必要あり (AND):
//   (a) process.env.NODE_ENV === 'development'
//   (b) process.env.BRAND_ADMIN_DEV_BYPASS === 'true'
//   (c) NEXT_PUBLIC_SUPABASE_URL が Test project ref を含む
//       (Production ref pyrxyhyjzufefobcjqnc を向いている場合は絶対に無効)
//
// これにより:
//   - Vercel Production は NODE_ENV='production' なので (a) で必ず false
//   - Test 環境変数が付いていない環境も (b)/(c) で false
//   - 万一 Production Supabase を向いている dev 環境でも (c) で false
//   - 3 条件すべて hard-coded、一部を偶発的に外しても bypass は成立しない
//
// Test project ref を hard-code しているため、リポジトリを見れば
// 「これは Test 用の抜け道」と即座に読み取れる。
const TEST_PROJECT_HOST_MARKER = 'scrddddtgvnbptkwgqml.supabase.co'

export function isBrandAdminDevBypassEnabled(): boolean {
  if (process.env.NODE_ENV !== 'development') return false
  if (process.env.BRAND_ADMIN_DEV_BYPASS !== 'true') return false
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  if (!url.includes(TEST_PROJECT_HOST_MARKER)) return false
  return true
}

/** Dev Bypass 時に返す固定 context (URBAN NOTE / admin)。Production では絶対に到達しない。 */
const DEV_BYPASS_MEMBERSHIP: BrandMembership = {
  brandId: '11111111-1111-4111-8111-111111111111', // Test seed: URBAN NOTE
  brandName: 'URBAN NOTE',
  brandSlug: 'urban-note',
  role: 'admin',
  status: 'active',
}
const DEV_BYPASS_CONTEXT: BrandAdminContext = {
  user: {
    // 固定 UUID。auth.uid() ではないので DB write 系は動かない前提。
    id: '00000000-0000-0000-0000-0000000dev00',
    email: 'dev-bypass@cosmohype.test',
  },
  currentBrand: DEV_BYPASS_MEMBERSHIP,
  memberships: [DEV_BYPASS_MEMBERSHIP],
  isDevBypass: true,
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
 */
export async function getBrandAdminContext(): Promise<BrandAdminContext> {
  // Dev Bypass 経路 (Production では上記 3 条件により常に false)
  if (isBrandAdminDevBypassEnabled()) {
    return DEV_BYPASS_CONTEXT
  }

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
    isDevBypass: false,
  }
}

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
