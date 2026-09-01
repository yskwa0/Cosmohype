import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { getCosmohypeAdminContext } from '@/lib/cosmohypeAdmin'
import AdminHeader from './AdminHeader'

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
 *
 * ヘッダー / ナビは AdminHeader (client) に切り出し、
 *   ・PC (md+): 横並び nav + email 右端
 *   ・Mobile:   ハンバーガーで右 drawer 展開、email は drawer 下部
 * の responsive 表示に対応する。
 */
export default async function CosmohypeAdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const ctx = await getCosmohypeAdminContext()

  return (
    <div className="min-h-screen bg-neutral-50">
      <AdminHeader email={ctx.user.email ?? ctx.user.id ?? null} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  )
}
