import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getCosmohypeAdminContext } from '@/lib/cosmohypeAdmin'

export const dynamic = 'force-dynamic'

// Phase 4-C.7 privacy: /cosmohype-admin 配下は検索対象外にする。
// auth gate は getCosmohypeAdminContext() が SoT。 noindex は defense-in-depth。
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
    },
  },
}

/**
 * `/cosmohype-admin` 配下の共通レイアウト。
 *
 * SSR で `getCosmohypeAdminContext()` を呼び、非 admin は redirect される
 * (URL 直打ちでも layout の render 前に auth gate が発火するため、非 admin は
 * page.tsx の中身を一切見られない)。 client hide だけの防御は使わない。
 */
export default async function CosmohypeAdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const ctx = await getCosmohypeAdminContext()

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center gap-6">
          <div>
            <div className="text-[10px] font-bold tracking-[0.3em] text-neutral-500">
              COSMOHYPE OPERATIONS
            </div>
            <Link
              href="/cosmohype-admin"
              className="text-lg font-semibold text-neutral-900 hover:text-neutral-700"
            >
              運営者ダッシュボード
            </Link>
          </div>
          <nav className="ml-8 flex items-center gap-4 text-sm">
            <Link href="/cosmohype-admin/products" className="text-neutral-700 hover:text-neutral-900">
              商品管理
            </Link>
            <Link href="/cosmohype-admin/brands" className="text-neutral-700 hover:text-neutral-900">
              ブランド管理
            </Link>
            <Link href="/cosmohype-admin/orders" className="text-neutral-700 hover:text-neutral-900">
              注文管理
            </Link>
            <Link href="/cosmohype-admin/reports" className="text-neutral-700 hover:text-neutral-900">
              商品通報
            </Link>
            <Link href="/cosmohype-admin/transfers" className="text-neutral-700 hover:text-neutral-900">
              送金・送金取消
            </Link>
          </nav>
          <div className="ml-auto text-[11px] text-neutral-500">
            {ctx.user.email ?? ctx.user.id}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}
