import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
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

// /cosmohype-admin/access-denied は「Admin 権限がない authenticated user 向け」
// の専用 page (getCosmohypeAdminContext を呼ぶと再度 access-denied に redirect され
// loop する)。 その pathname だけ auth check + AdminHeader を skip する。
const ACCESS_DENIED_PATH = '/cosmohype-admin/access-denied'

/**
 * `/cosmohype-admin` 配下の共通レイアウト。
 *
 * 通常 route (hype-applications / products / orders / brands / reports / transfers 等):
 *   SSR で `getCosmohypeAdminContext()` を呼び、
 *     ・ 未認証 → /login?redirect=<現 pathname> (deep path 保持)
 *     ・ 認証済みだが非-admin → /cosmohype-admin/access-denied?next=<現 pathname>
 *     ・ admin → context 返却 + AdminHeader 描画
 *
 * `/cosmohype-admin/access-denied` route のみ:
 *   auth check を skip し、AdminHeader も描画しない (loop 防止 + 権限のない user
 *   に管理 nav を見せない)。 body 全画面を access-denied カードに委ねる。
 */
export default async function CosmohypeAdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const h = await headers()
  const pathname = h.get('x-pathname') ?? ''

  if (pathname === ACCESS_DENIED_PATH) {
    // access-denied は auth check せず、そのまま render (背景色のみ揃える)。
    return <div className="min-h-screen bg-neutral-50">{children}</div>
  }

  const ctx = await getCosmohypeAdminContext()

  return (
    <div className="min-h-screen bg-neutral-50">
      <AdminHeader email={ctx.user.email ?? ctx.user.id ?? null} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  )
}
