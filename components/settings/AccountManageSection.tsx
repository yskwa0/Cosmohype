'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function AccountManageSection() {
  const [mounted, setMounted] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])

  async function handleLogout() {
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
      <section>
        <p className="text-xs font-semibold px-1 mb-2" style={{ color: 'var(--text-muted)' }}>アカウント管理</p>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 w-full px-5 py-4 text-sm font-medium text-left transition-all duration-75 active:scale-[0.98] active:opacity-70"
            style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)' }}
          >
            <span style={{ color: 'var(--text-muted)' }}>
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </span>
            <span className="flex-1">ログアウト</span>
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-4 w-full px-5 py-4 text-sm font-medium text-left transition-all duration-75 active:scale-[0.98] active:opacity-70"
            style={{ color: '#EF4444' }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
            <span className="flex-1">アカウント削除</span>
          </button>
        </div>
      </section>

      {mounted && showDeleteConfirm && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-black/50" onClick={() => { if (!deleting) { setShowDeleteConfirm(false); setDeleteError(null) } }} />
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
