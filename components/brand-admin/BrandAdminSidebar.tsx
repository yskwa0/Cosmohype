'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
  const isActive = (href: string) => {
    if (href === '/brand-admin') return pathname === '/brand-admin'
    return pathname.startsWith(href)
  }

  if (orientation === 'horizontal') {
    return (
      <nav className="flex items-center gap-1 px-3 py-2 whitespace-nowrap">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={
              'text-[11px] px-3 py-1.5 rounded ' +
              (isActive(item.href)
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-700 hover:bg-neutral-100')
            }
          >
            {item.label}
            {!item.enabled && (
              <span className="ml-1 text-[9px] text-neutral-400">(準備中)</span>
            )}
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
              : 'text-neutral-700 hover:bg-neutral-100')
          }
        >
          <span>{item.label}</span>
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
