// =============================================================================
// app/brand-admin/layout.tsx  (Phase 4-C.7 privacy 方針変更)
//
// /brand-admin 配下 (login + (protected)) 全体に対する noindex metadata の指定。
// passthrough layout として children をそのまま render するだけで、既存
// (protected)/layout.tsx の auth gate は保持する。
//
// ★ 重要: 認証 gate は (protected)/layout.tsx の getBrandAdminContext() が SoT。
//   本 layout の noindex は「検索エンジンに拾われて存在が漏れる」ことを防ぐ
//   defense-in-depth の 2 段目 (1 段目は app/robots.ts、3 段目は proxy.ts の
//   X-Robots-Tag header)。 URL secrecy だけを security としては扱わない。
// =============================================================================

import type { Metadata } from 'next'

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

export default function BrandAdminSegmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
