'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
  {
    label: 'アカウントのプライバシー',
    href: '/profile/privacy',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    label: '通知設定',
    href: '/profile/notifications',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
]

export function ProfileOwnerMenu() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])

  async function handleLogout() {
    setOpen(false)
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleDeleteAccount() {
    if (deleting) return
    setDeleting(true)
    setDeleteError(null)

    const res = await fetch('/api/account/delete', { method: 'DELETE' })

    if (!res.ok) {
      setDeleting(false)
      setDeleteError('アカウント削除に失敗しました')
      return
    }

    await supabase.auth.signOut()
    router.push('/login')
  }

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
              {MENU_ITEMS.map((item, i) => (
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
                onClick={handleLogout}
                className="flex items-center gap-4 w-full px-6 py-4 text-sm font-medium text-left transition-all duration-75 active:scale-[0.98] active:opacity-70"
                style={{ color: '#EF4444', borderBottom: '1px solid var(--border)' }}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                ログアウト
              </button>
              <button
                onClick={() => { setOpen(false); setShowDeleteConfirm(true) }}
                className="flex items-center gap-4 w-full px-6 py-4 text-sm font-medium text-left transition-all duration-75 active:scale-[0.98] active:opacity-70"
                style={{ color: '#EF4444' }}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
                アカウント削除
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
      {mounted && showDeleteConfirm && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div
            className="fixed bottom-0 left-0 right-0 z-[100] max-w-md mx-auto rounded-t-2xl px-4 pt-6 pb-8"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: 'var(--border)' }} />
            <p className="text-center text-base font-bold mb-2" style={{ color: 'var(--text)' }}>アカウントを削除しますか？</p>
            <p className="text-center text-sm leading-relaxed mb-7" style={{ color: 'var(--text-muted)' }}>
              この操作は取り消せません。投稿、プロフィール、フォロー情報などが削除されます。
            </p>
            {deleteError && (
              <p className="text-center text-xs mb-4" style={{ color: '#EF4444' }}>{deleteError}</p>
            )}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="w-full h-11 rounded-xl text-sm font-semibold transition-opacity active:opacity-75 disabled:opacity-50"
                style={{ background: '#EF4444', color: '#fff' }}
              >
                {deleting ? '削除中...' : '削除する'}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(null) }}
                disabled={deleting}
                className="w-full h-11 rounded-xl text-sm font-medium transition-opacity active:opacity-70 disabled:opacity-50"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
