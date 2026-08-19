'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { pressableClass } from '@/lib/brandAdminUi'
import { NavPendingSpinner } from '@/components/brand-admin/NavPendingSpinner'

interface NavItem {
  href: string
  label: string
  enabled: boolean
}

const NAV: NavItem[] = [
  { href: '/brand-admin', label: 'Dashboard', enabled: true },
  { href: '/brand-admin/products', label: '商品管理', enabled: true },
  { href: '/brand-admin/orders', label: '注文管理', enabled: true },
  { href: '/brand-admin/issues', label: '商品トラブル', enabled: true },
  { href: '/brand-admin/settings', label: 'ブランド設定', enabled: true },
]

interface Props {
  orientation?: 'vertical' | 'horizontal'
}

export default function BrandAdminSidebar({ orientation = 'vertical' }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const isActive = (href: string) => {
    if (href === '/brand-admin') return pathname === '/brand-admin'
    return pathname.startsWith(href)
  }

  // mount 後に主要 5 ルートを積極 prefetch (hover 待ちなし)。
  //   Next.js <Link> のデフォルト prefetch は viewport 進入 + hover 依存だが、
  //   Brand Admin では sidebar が常時 viewport 内かつナビ優先度が高いので、
  //   ログイン直後に prefetch を明示発火 → 主要遷移をほぼキャッシュヒットに。
  //   `router.prefetch` は idempotent + 内部で重複排除されるため二重呼出害なし。
  useEffect(() => {
    for (const item of NAV) {
      if (!item.enabled) continue
      // inline active 判定 (useEffect 依存を pathname だけに保つため)
      const active = item.href === '/brand-admin' ? pathname === '/brand-admin' : pathname.startsWith(item.href)
      if (active) continue
      try { router.prefetch(item.href) } catch { /* prefetch 失敗は無視 */ }
    }
  }, [pathname, router])

  if (orientation === 'horizontal') {
    return (
      <nav className="flex items-center gap-1 px-3 py-2 whitespace-nowrap">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={
              'inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded ' +
              (isActive(item.href)
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-700 hover:bg-neutral-100') + ' ' +
              pressableClass
            }
          >
            {item.label}
            {!item.enabled && (
              <span className="ml-1 text-[9px] text-neutral-400">(準備中)</span>
            )}
            <NavPendingSpinner size={10} />
          </Link>
        ))}
      </nav>
    )
  }

  return (
    <nav className="flex flex-col py-4">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={
            'flex items-center justify-between px-5 py-2 text-xs ' +
            (isActive(item.href)
              ? 'bg-neutral-900 text-white'
              : 'text-neutral-700 hover:bg-neutral-100') + ' ' +
            pressableClass
          }
        >
          <span className="inline-flex items-center gap-2">
            {item.label}
            <NavPendingSpinner size={10} />
          </span>
          {!item.enabled && (
            <span className="text-[9px] tracking-wide text-neutral-400 uppercase">
              soon
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
}
