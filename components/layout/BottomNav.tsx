'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  {
    href: '/feed',
    label: 'ホーム',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    href: '/search',
    label: '検索',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
  {
    href: '/post/new',
    label: '投稿',
    icon: () => (
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center -mt-5"
        style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)', boxShadow: '0 4px 16px rgba(124,58,237,0.35)' }}>
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </div>
    ),
  },
  {
    href: '/saved',
    label: '保存済み',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
      </svg>
    ),
  },
  {
    href: '/profile/me',
    label: 'マイページ',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl" style={{ background: 'var(--nav-bg)' }}>
      <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }} />
      <div className="max-w-md mx-auto flex items-end justify-around px-6 pb-safe pt-2 pb-3">
        {navItems.map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/post/new' && pathname.startsWith(href))
          const isPost = href === '/post/new'
          return (
            <Link
              key={href}
              href={href}
              className={cn('flex flex-col items-center gap-1 min-w-[56px] transition-all')}
              style={isPost ? {} : { color: active ? 'var(--purple)' : 'var(--text-muted)' }}
              aria-label={label}
            >
              {icon(active)}
              {!isPost && (
                <span className="text-[10px] font-medium">{label}</span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
