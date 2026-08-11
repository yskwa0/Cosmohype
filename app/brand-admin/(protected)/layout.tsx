import Link from 'next/link'
import { getBrandAdminContext } from '@/lib/brandAdmin'
import { brandAdminSignOutAction, switchBrandAction } from '../actions'
import BrandAdminSidebar from '@/components/brand-admin/BrandAdminSidebar'
import BrandSwitcher from '@/components/brand-admin/BrandSwitcher'

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

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="flex min-h-screen">
        {/* Sidebar (PC / md 以上) */}
        <aside className="hidden md:flex flex-col w-60 border-r border-neutral-200 bg-white">
          <div className="px-5 py-6 border-b border-neutral-200">
            <Link href="/brand-admin" className="block">
              <div className="text-[10px] tracking-[0.3em] text-neutral-500">HYPE</div>
              <div className="text-sm font-semibold mt-1">Brand Admin</div>
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
            {ctx.isDevBypass ? (
              <div className="mt-3 border border-orange-300 bg-orange-50 rounded px-2 py-1.5">
                <div className="text-[10px] font-bold tracking-widest text-orange-700">
                  DEV BYPASS
                </div>
                <div className="text-[9px] text-orange-600 leading-tight mt-0.5">
                  TEST ONLY / ログイン省略中
                </div>
              </div>
            ) : (
              <form action={brandAdminSignOutAction} className="mt-3">
                <button
                  type="submit"
                  className="w-full text-[11px] text-neutral-600 hover:text-red-600 border border-neutral-300 rounded py-1.5"
                >
                  ログアウト
                </button>
              </form>
            )}
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {/* Mobile top bar */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-white">
            <Link href="/brand-admin" className="flex flex-col">
              <span className="text-[9px] tracking-[0.3em] text-neutral-500">HYPE</span>
              <span className="text-xs font-semibold">Brand Admin</span>
            </Link>
            {ctx.isDevBypass ? (
              <span className="text-[10px] font-bold tracking-widest text-orange-700 border border-orange-300 bg-orange-50 rounded px-2 py-1">
                DEV BYPASS
              </span>
            ) : (
              <form action={brandAdminSignOutAction}>
                <button type="submit" className="text-[11px] text-neutral-600 border border-neutral-300 rounded px-2 py-1">
                  ログアウト
                </button>
              </form>
            )}
          </div>
          {/* Mobile-only navigation strip */}
          <div className="md:hidden border-b border-neutral-200 bg-white overflow-x-auto">
            <BrandAdminSidebar orientation="horizontal" />
          </div>

          <div className="p-6 md:p-10 max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
