'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

type MenuItem = { label: string; icon: React.ReactNode; href?: string }

const MENU_ITEMS: MenuItem[] = [
  {
    label: '保存済み',
    href: '/saved',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
      </svg>
    ),
  },
  {
    label: 'アーカイブ',
    href: '/archive',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
  },
]

export function ProfileOwnerMenu() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1 transition-transform duration-75 active:scale-75"
        aria-label="メニュー"
        style={{ color: 'var(--text)' }}
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {mounted && open && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-black/40" onClick={() => setOpen(false)} />
          <div
            className="fixed bottom-0 left-0 right-0 z-[100] max-w-md mx-auto rounded-t-2xl overflow-hidden"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-2" style={{ background: 'var(--border)' }} />
            <div className="pb-8">
              {MENU_ITEMS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => { setOpen(false); if (item.href) router.push(item.href) }}
                  className="flex items-center gap-4 w-full px-6 py-4 text-sm font-medium text-left transition-all duration-75 active:scale-[0.98] active:opacity-70"
                  style={{
                    color: 'var(--text)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => { setOpen(false); router.push('/settings') }}
                className="flex items-center gap-4 w-full px-6 py-4 text-sm font-medium text-left transition-all duration-75 active:scale-[0.98] active:opacity-70"
                style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)' }}
              >
                <span style={{ color: 'var(--text-muted)' }}>
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                設定
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
