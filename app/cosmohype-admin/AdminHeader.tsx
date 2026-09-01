'use client'

// =============================================================================
// AdminHeader.tsx — Cosmohype Admin 共通ヘッダー (Server layout から呼ぶ client)
//
// - PC (md+):    従来通り横並び nav + email 右寄せ
// - Mobile:      タイトル + ハンバーガーのみ、ナビは right-side drawer で表示
//                email は drawer 下部に表示 (ヘッダー横のはみ出しを防ぐ)
//
// auth 情報 (email) は Server layout `getCosmohypeAdminContext()` から prop で受け取る。
// Client 側で auth 判定はしない (frontend hide は防御にならない)。
// =============================================================================

import Link from 'next/link'
import { useState, useEffect } from 'react'

const NAV = [
  { href: '/cosmohype-admin/products',          label: '商品管理' },
  { href: '/cosmohype-admin/brands',            label: 'ブランド管理' },
  { href: '/cosmohype-admin/hype-applications', label: '出店申請' },
  { href: '/cosmohype-admin/orders',            label: '注文管理' },
  { href: '/cosmohype-admin/reports',           label: '商品通報' },
  { href: '/cosmohype-admin/transfers',         label: '送金・送金取消' },
] as const

export default function AdminHeader({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false)

  // drawer 開閉中に背後 scroll を止める
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Title (both mobile + PC) */}
          <div className="min-w-0 flex-1 md:flex-none">
            <div className="text-[10px] font-bold tracking-[0.3em] text-neutral-500">
              COSMOHYPE OPERATIONS
            </div>
            <Link
              href="/cosmohype-admin"
              className="block truncate text-base sm:text-lg font-semibold text-neutral-900 hover:text-neutral-700"
            >
              運営者ダッシュボード
            </Link>
          </div>

          {/* PC nav (md+ のみ) */}
          <nav className="hidden md:flex items-center gap-3 lg:gap-4 text-[13px] whitespace-nowrap">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-neutral-700 hover:text-neutral-900">
                {n.label}
              </Link>
            ))}
          </nav>

          {/* PC email (md+ のみ) */}
          <div className="ml-auto hidden md:block max-w-[14rem] truncate text-[11px] text-neutral-500">
            {email ?? ''}
          </div>

          {/* Mobile hamburger (md 未満のみ) */}
          <button
            type="button"
            aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
            aria-expanded={open}
            aria-controls="cosmohype-admin-mobile-nav"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
          >
            {open ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer (右側から slide、md 未満のみ) */}
      {open && (
        <>
          <div
            role="presentation"
            aria-hidden
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
          />
          <div
            id="cosmohype-admin-mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="運営メニュー"
            className="fixed top-0 right-0 z-50 flex h-[100dvh] w-72 max-w-[85vw] flex-col bg-white shadow-xl md:hidden"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <div className="text-[10px] font-bold tracking-[0.3em] text-neutral-500">MENU</div>
              <button
                type="button"
                aria-label="メニューを閉じる"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded hover:bg-neutral-100"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto py-2">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="block border-l-2 border-transparent px-4 py-3 text-sm text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="border-t border-neutral-200 px-4 py-3">
              <div className="mb-1 text-[10px] tracking-widest text-neutral-500">SIGNED IN</div>
              <div className="truncate text-[12px] text-neutral-800">{email ?? '(no email)'}</div>
            </div>
          </div>
        </>
      )}
    </header>
  )
}
