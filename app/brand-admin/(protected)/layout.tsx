import Link from 'next/link'
import { getBrandAdminContext, getCurrentBrandMerchantAgreementStatus } from '@/lib/brandAdmin'
import { brandAdminSignOutAction, switchBrandAction } from '../actions'
import BrandAdminSidebar from '@/components/brand-admin/BrandAdminSidebar'
import BrandSwitcher from '@/components/brand-admin/BrandSwitcher'
import { pressableClass } from '@/lib/brandAdminUi'
import { NavPendingSpinner } from '@/components/brand-admin/NavPendingSpinner'
import MerchantAgreementModal from '@/components/brand-admin/MerchantAgreementModal'
import {
  MERCHANT_AGREEMENT_CURRENT_DOC,
  MERCHANT_AGREEMENT_CURRENT_VERSION,
} from '@/lib/merchantAgreement/version'
import { acceptMerchantAgreementAction } from './merchantAgreementActions'

export const dynamic = 'force-dynamic'

/**
 * /brand-admin 配下の protected layout。
 * ここで getBrandAdminContext() を呼び、
 *   - 未認証 → /brand-admin/login
 *   - membership 無 → /brand-admin/login?err=no_membership
 * にリダイレクトする (server 側)。
 * URL 直打ちでも guard は必ず通る。
 */
export default async function BrandAdminProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await getBrandAdminContext()
  const agreementStatus = await getCurrentBrandMerchantAgreementStatus(
    ctx.currentBrand.brandId,
    MERCHANT_AGREEMENT_CURRENT_VERSION,
  )

  // Phase 4-B: 現在 brand の owner が current Merchant Agreement に未同意
  //   ・owner       → banner + 「同意」CTA。 CTA から dismiss 可能な modal を開く。
  //   ・admin/staff → banner のみ (CTA なし)。
  //   ・同意済 or 判定 skip → 何も出さない
  //   既存購入者対応 (発送 / 返品 / トラブル / 返金) は本 UI と無関係に常時利用可能。
  //   新規商品の publish のみが assertPublishableOrRedirect で個別に block される。
  const agreementBannerMode: 'none' | 'owner' | 'non-owner' = (() => {
    if (!agreementStatus.needsAcceptance) return 'none'
    return ctx.currentBrand.role === 'owner' ? 'owner' : 'non-owner'
  })()

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="flex min-h-screen">
        {/* Sidebar (PC / md 以上) */}
        <aside className="hidden md:flex flex-col w-60 border-r border-neutral-200 bg-white">
          <div className="px-5 py-6 border-b border-neutral-200">
            <Link href="/brand-admin" className={'block relative ' + pressableClass}>
              <div className="text-[10px] tracking-[0.3em] text-neutral-500">HYPE</div>
              <div className="text-sm font-semibold mt-1 inline-flex items-center gap-1.5">
                Brand Admin
                <NavPendingSpinner size={11} />
              </div>
            </Link>
          </div>
          <BrandAdminSidebar />
          <div className="mt-auto border-t border-neutral-200 px-5 py-4">
            <div className="text-[10px] tracking-widest text-neutral-500 mb-1">BRAND</div>
            <BrandSwitcher
              memberships={ctx.memberships}
              currentBrandId={ctx.currentBrand.brandId}
              switchAction={switchBrandAction}
            />
            <div className="mt-4 text-[10px] tracking-widest text-neutral-500">USER</div>
            <div className="mt-1 text-xs text-neutral-800 truncate">
              {ctx.user.email ?? '(no email)'}
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              role: {ctx.currentBrand.role}
            </div>
            {/* Dev Bypass 撤去済 (Production Supabase 一本運用)。 常にログアウトボタンを表示。 */}
            <form action={brandAdminSignOutAction} className="mt-3">
              <button
                type="submit"
                className={
                  'w-full text-[11px] text-neutral-600 hover:text-red-600 ' +
                  'border border-neutral-300 rounded py-1.5 ' +
                  pressableClass
                }
              >
                ログアウト
              </button>
            </form>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {/* Mobile top bar */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-white">
            <Link href="/brand-admin" className={'flex flex-col ' + pressableClass}>
              <span className="text-[9px] tracking-[0.3em] text-neutral-500">HYPE</span>
              <span className="text-xs font-semibold inline-flex items-center gap-1.5">
                Brand Admin
                <NavPendingSpinner size={10} />
              </span>
            </Link>
            {/* Dev Bypass 撤去済 (Production Supabase 一本運用)。 常にログアウトボタンを表示。 */}
            <form action={brandAdminSignOutAction}>
              <button
                type="submit"
                className={'text-[11px] text-neutral-600 border border-neutral-300 rounded px-2 py-1 ' + pressableClass}
              >
                ログアウト
              </button>
            </form>
          </div>
          {/* Mobile-only navigation strip */}
          <div className="md:hidden border-b border-neutral-200 bg-white overflow-x-auto">
            <BrandAdminSidebar orientation="horizontal" />
          </div>

          <div className="p-6 md:p-10 max-w-5xl">
            {agreementBannerMode !== 'none' && (
              <MerchantAgreementModal
                mode={agreementBannerMode}
                doc={MERCHANT_AGREEMENT_CURRENT_DOC}
                version={MERCHANT_AGREEMENT_CURRENT_VERSION}
                brandName={ctx.currentBrand.brandName}
                acceptAction={acceptMerchantAgreementAction}
              />
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
