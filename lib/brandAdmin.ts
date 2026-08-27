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

// -----------------------------------------------------------------------------
// Phase 4-B / Migration 168:
//   現在 brand が Merchant Agreement current version に同意済かを判定する helper。
//   layout.tsx / publish gate から共通で呼ぶ (per-request cached)。
//
//   ・context 型自体は非破壊で維持 (旧 caller に影響なし)
//   ・SELECT は shop_brand_agreement_acceptances (owner の accept 記録) のみを見る
//   ・Migration 168 未 apply 環境では table 不在エラーになり得るが、
//     UI 側で「未同意」扱い (needsAcceptance=true) にフォールバックする方針
// -----------------------------------------------------------------------------

export interface MerchantAgreementStatus {
  currentVersion:   string
  acceptedVersion:  string | null
  acceptedAt:       string | null   // ISO string or null
  needsAcceptance:  boolean
}

export const getCurrentBrandMerchantAgreementStatus = cache(
  async (brandId: string, currentVersion: string): Promise<MerchantAgreementStatus> => {
    const supabase = await createClient()
    interface AcceptRow {
      agreement_version: string
      accepted_at:       string
    }
    const { data, error } = await (
      supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (col: string, val: string) => {
              eq: (col: string, val: string) => {
                maybeSingle: () => Promise<{ data: AcceptRow | null; error: { message: string } | null }>
              }
            }
          }
        }
      }
    )
      .from('shop_brand_agreement_acceptances')
      .select('agreement_version, accepted_at')
      .eq('brand_id', brandId)
      .eq('agreement_version', currentVersion)
      .maybeSingle()

    if (error) {
      // Migration 168 未 apply 環境 (relation does not exist) 含めて未同意扱いにする。
      // 生 error は log にだけ落として UI には露出させない (banner 側で誘導文言を出す)。
      // eslint-disable-next-line no-console
      console.warn('[brandAdmin/merchant-agreement] status query failed (treat as not-accepted)', error.message)
      return {
        currentVersion,
        acceptedVersion: null,
        acceptedAt:      null,
        needsAcceptance: true,
      }
    }

    if (data && data.agreement_version === currentVersion) {
      return {
        currentVersion,
        acceptedVersion: data.agreement_version,
        acceptedAt:      data.accepted_at,
        needsAcceptance: false,
      }
    }

    return {
      currentVersion,
      acceptedVersion: null,
      acceptedAt:      null,
      needsAcceptance: true,
    }
  }
)

// =============================================================================
// Fee Settlement Terms status (Phase 4-C.7 / Migration 175、BLOCKER 修正版)
//
// ★ Phase 4-C.7 最終方針:
//   DB registry (shop_fee_settlement_terms_versions.is_current=true 行) を
//   「Production で正式に有効な Fee Terms version/hash」の唯一の SoT とする。
//   TypeScript 側 (lib/feeSettlementTerms/version.ts, content.json) は
//   コード上の candidate document であり、DB registry current と一致するまで
//   正式 current として扱ってはいけない。
//
// 【3 source 突合】
//   - source A: DB registry.is_current=true row (registryVersion, registryHash)
//   - source B: TypeScript candidate (currentVersion, currentHash from version.ts)
//   - source C: brand の shop_brand_fee_settlement_terms 行 (is_active=true)
//
//   source A == source B (formal current 確定) のときのみ、Fee Terms 本文 (TS 側
//   content.json) を「現在の Fee Terms」として Brand に提示してよい。
//   不一致の場合は state='deployment_mismatch' として TS 本文の accordion 表示・
//   Accept CTA・needs_acceptance/accepted 表示をすべて禁止する。
//
// 【state case】
//   ・deployment_mismatch:
//     - source A が存在しない (registry.is_current=true 行なし。 例: Phase 4-C.7
//       初期状態、まだ Fee Terms v1 seed migration 未 apply)、または
//     - source A ≠ source B (registry 更新済で TS 側が古い、または逆)。
//     → UI: 「運営が利用条件を更新中です」だけ表示、TS 本文非表示、Accept 不可、
//        Connect eligible 表示不可。
//   ・not_provisioned:
//     - source A == source B、source C が存在しない (brand 向け fee_term row 未提示)
//     → UI: 「運営から本ブランド向けの条件書はまだ提示されていません」
//   ・stale_hash:
//     - source A == source B、source C の (version, hash) が formal current と不一致
//     → UI: 「運営が新版を用意中」
//   ・needs_acceptance:
//     - source A == source B == source C、source C.accepted_at=NULL
//     → UI: owner に本文全文提示 + Accept CTA、non-owner は依頼文言
//   ・accepted:
//     - source A == source B == source C、source C.accepted_at 設定済
//     → UI: 受諾済表示、accordion (default 閉じる)
// =============================================================================

export type FeeSettlementTermsStateKind =
  | 'deployment_mismatch'
  | 'not_provisioned'
  | 'stale_hash'
  | 'needs_acceptance'
  | 'accepted'

export interface FeeSettlementTermsStatus {
  state:            FeeSettlementTermsStateKind
  /** TypeScript candidate (source B、lib/feeSettlementTerms/version.ts) */
  currentVersion:   string
  currentHash:      string
  currentRateBps:   number
  /** DB registry current (source A、shop_fee_settlement_terms_versions.is_current=true) */
  registryVersion:  string | null
  registryHash:     string | null
  /** brand の shop_brand_fee_settlement_terms 行 (source C、is_active=true) */
  termId:           string | null
  termVersion:      string | null
  termHash:         string | null
  termRateBps:      number | null
  acceptedAt:       string | null   // ISO string or null
  acceptedByUserId: string | null
  effectiveAt:      string | null
}

/**
 * 3 source (registry, TS candidate, brand row) を突合して state を返す。
 * source A (registry) と source B (TS) が一致しない限り、TS 本文を UI で
 * 「現在の Fee Terms」として扱わない (deployment_mismatch)。
 */
export const getCurrentBrandFeeSettlementTermsStatus = cache(
  async (
    brandId:        string,
    currentVersion: string,
    currentHash:    string,
    currentRateBps: number,
  ): Promise<FeeSettlementTermsStatus> => {
    const supabase = await createClient()

    interface RegistryRow {
      version:    string
      terms_hash: string
    }
    interface TermRow {
      id:                    string
      platform_fee_rate_bps: number
      terms_version:         string
      terms_hash:            string
      accepted_at:           string | null
      accepted_by_user_id:   string | null
      effective_at:          string | null
    }

    // (1) source A: DB registry の is_current=true 行を取得
    const registryRes = await (
      supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (col: string, val: boolean) => {
              maybeSingle: () => Promise<{ data: RegistryRow | null; error: { message: string } | null }>
            }
          }
        }
      }
    )
      .from('shop_fee_settlement_terms_versions')
      .select('version, terms_hash')
      .eq('is_current', true)
      .maybeSingle()

    const registryVersion = registryRes.data?.version    ?? null
    const registryHash    = registryRes.data?.terms_hash ?? null

    if (registryRes.error) {
      // Migration 175 未 apply (relation does not exist) 含めて deployment_mismatch 扱い
      console.warn(
        '[brandAdmin/fee-terms] registry query failed (treat as deployment_mismatch)',
        registryRes.error.message,
      )
      return {
        state:            'deployment_mismatch',
        currentVersion,
        currentHash,
        currentRateBps,
        registryVersion:  null,
        registryHash:     null,
        termId:           null,
        termVersion:      null,
        termHash:         null,
        termRateBps:      null,
        acceptedAt:       null,
        acceptedByUserId: null,
        effectiveAt:      null,
      }
    }

    // (2) source A == source B ? (registry の is_current 行と TS candidate の完全一致)
    const registryMatchesTs =
      registryVersion !== null &&
      registryHash    !== null &&
      registryVersion === currentVersion &&
      registryHash    === currentHash

    if (!registryMatchesTs) {
      // registry が空、または TS と不一致 = formal current 未確定
      // TS 本文を UI で「現在の Fee Terms」として提示しない
      return {
        state:            'deployment_mismatch',
        currentVersion,
        currentHash,
        currentRateBps,
        registryVersion,
        registryHash,
        termId:           null,
        termVersion:      null,
        termHash:         null,
        termRateBps:      null,
        acceptedAt:       null,
        acceptedByUserId: null,
        effectiveAt:      null,
      }
    }

    // (3) source A == source B 確定。 source C (brand row) を取得
    const termRes = await (
      supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (col: string, val: string) => {
              eq: (col: string, val: boolean) => {
                maybeSingle: () => Promise<{ data: TermRow | null; error: { message: string } | null }>
              }
            }
          }
        }
      }
    )
      .from('shop_brand_fee_settlement_terms')
      .select('id, platform_fee_rate_bps, terms_version, terms_hash, accepted_at, accepted_by_user_id, effective_at')
      .eq('brand_id', brandId)
      .eq('is_active', true)
      .maybeSingle()

    if (termRes.error) {
      console.warn(
        '[brandAdmin/fee-terms] brand row query failed (treat as not_provisioned)',
        termRes.error.message,
      )
      return {
        state:            'not_provisioned',
        currentVersion,
        currentHash,
        currentRateBps,
        registryVersion,
        registryHash,
        termId:           null,
        termVersion:      null,
        termHash:         null,
        termRateBps:      null,
        acceptedAt:       null,
        acceptedByUserId: null,
        effectiveAt:      null,
      }
    }

    if (!termRes.data) {
      return {
        state:            'not_provisioned',
        currentVersion,
        currentHash,
        currentRateBps,
        registryVersion,
        registryHash,
        termId:           null,
        termVersion:      null,
        termHash:         null,
        termRateBps:      null,
        acceptedAt:       null,
        acceptedByUserId: null,
        effectiveAt:      null,
      }
    }

    // (4) source A == source B == source C ?
    const rowMatchesFormalCurrent =
      termRes.data.terms_version === registryVersion &&
      termRes.data.terms_hash    === registryHash

    let state: FeeSettlementTermsStateKind
    if (!rowMatchesFormalCurrent) {
      state = 'stale_hash'
    } else if (termRes.data.accepted_at === null) {
      state = 'needs_acceptance'
    } else {
      state = 'accepted'
    }

    return {
      state,
      currentVersion,
      currentHash,
      currentRateBps,
      registryVersion,
      registryHash,
      termId:           termRes.data.id,
      termVersion:      termRes.data.terms_version,
      termHash:         termRes.data.terms_hash,
      termRateBps:      termRes.data.platform_fee_rate_bps,
      acceptedAt:       termRes.data.accepted_at,
      acceptedByUserId: termRes.data.accepted_by_user_id,
      effectiveAt:      termRes.data.effective_at,
    }
  },
)
