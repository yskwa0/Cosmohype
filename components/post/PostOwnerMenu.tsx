'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type View = 'closed' | 'dropdown' | 'delete-confirm' | 'deleting' | 'deleted' | 'archiving' | 'archived' | 'unarchived' | 'cosmo-setting' | 'cosmo-set'

export function PostOwnerMenu({
  postId,
  postCreatedAt,
  userId,
  username,
  isArchived = false,
}: {
  postId: string
  postCreatedAt: string
  userId: string
  username: string
  isArchived?: boolean
}) {
  const [view, setView] = useState<View>('closed')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])

  function close() { setView('closed') }

  async function handleArchive() {
    setView('archiving')
    const { error } = await supabase.from('posts').update({ is_archived: true }).eq('id', postId)
    if (error) { setView('dropdown'); return }

    const { data: prevPost } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .lt('created_at', postCreatedAt)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setView('archived')
    setTimeout(() => {
      router.push(prevPost ? `/post/${prevPost.id}` : `/profile/${username}`)
      router.refresh()
    }, 1400)
  }

  async function handleUnarchive() {
    setView('archiving')
    const { error } = await supabase.from('posts').update({ is_archived: false }).eq('id', postId)
    if (error) { setView('dropdown'); return }
    setView('unarchived')
    setTimeout(() => {
      if (pathname.startsWith('/archive/')) {
        router.refresh()
        router.push('/archive')
      } else {
        router.refresh()
        setView('closed')
      }
    }, 1400)
  }

  async function handleSetCosmo() {
    setView('cosmo-setting')
    const { error } = await supabase
      .from('profiles')
      .update({ cosmo_post_id: postId })
      .eq('id', userId)
    if (error) { setView('dropdown'); return }
    setView('cosmo-set')
    setTimeout(() => setView('closed'), 1600)
  }

  async function handleDelete() {
    setView('deleting')
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) {
      console.error(error)
      setView('delete-confirm')
      return
    }

    const { data: prevPost } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', userId)
      .lt('created_at', postCreatedAt)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setView('deleted')

    setTimeout(() => {
      router.push(prevPost ? `/post/${prevPost.id}` : `/profile/${username}`)
      router.refresh()
    }, 1400)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setView(v => v === 'dropdown' ? 'closed' : 'dropdown')}
        className="p-1 transition-transform duration-75 active:scale-75"
        aria-label="投稿メニュー"
        style={{ color: view === 'dropdown' ? 'var(--purple)' : 'var(--text-muted)' }}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
        </svg>
      </button>

      {view === 'dropdown' && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={close} />
          <div
            className="absolute top-full right-0 mt-1 z-[95] min-w-[160px] rounded-2xl overflow-hidden"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}
          >
            <button
              onClick={() => { close(); router.push(`/post/${postId}/edit`) }}
              className="flex items-center gap-2.5 w-full px-4 py-3.5 text-sm font-medium text-left transition-all duration-75 active:scale-[0.96] active:opacity-80"
              style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
              </svg>
              編集
            </button>
            <button
              onClick={handleSetCosmo}
              className="flex items-center gap-2.5 w-full px-4 py-3.5 text-sm font-medium text-left transition-all duration-75 active:scale-[0.96] active:opacity-80"
              style={{ color: 'var(--purple)', borderBottom: '1px solid var(--border)' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              COSMOに表示
            </button>
            <button
              onClick={isArchived ? handleUnarchive : handleArchive}
              className="flex items-center gap-2.5 w-full px-4 py-3.5 text-sm font-medium text-left transition-all duration-75 active:scale-[0.96] active:opacity-80"
              style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              {isArchived ? 'アーカイブから戻す' : 'アーカイブ'}
            </button>
            <button
              onClick={() => setView('delete-confirm')}
              className="flex items-center gap-2.5 w-full px-4 py-3.5 text-sm font-medium text-left transition-all duration-75 active:scale-[0.96] active:opacity-80"
              style={{ color: '#EF4444' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              削除
            </button>
          </div>
        </>
      )}

      {mounted && view === 'cosmo-set' && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30">
          <div
            className="flex flex-col items-center gap-3 px-10 py-7 rounded-2xl"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.28)' }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'var(--purple-dim)' }}
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>COSMOに設定しました</p>
          </div>
        </div>,
        document.body
      )}

      {mounted && (view === 'archived' || view === 'unarchived') && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30">
          <div
            className="flex flex-col items-center gap-3 px-10 py-7 rounded-2xl"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.28)' }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'var(--purple-dim)' }}
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {view === 'archived' ? 'アーカイブしました' : 'アーカイブから戻しました'}
            </p>
          </div>
        </div>,
        document.body
      )}

      {mounted && view === 'deleted' && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/30">
          <div
            className="flex flex-col items-center gap-3 px-10 py-7 rounded-2xl"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.28)' }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'var(--purple-dim)' }}
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>削除しました</p>
          </div>
        </div>,
        document.body
      )}

      {mounted && (view === 'delete-confirm' || view === 'deleting') && createPortal(
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/40"
            onClick={view === 'deleting' ? undefined : close}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-[100] max-w-md mx-auto rounded-t-2xl overflow-hidden"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <div className="flex flex-col px-5 pb-8">
              <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-5" style={{ background: 'var(--border)' }} />
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text)' }}>
                投稿を削除しますか？
              </h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                この操作は取り消せません。投稿・画像・コメントがすべて削除されます。
              </p>
              <button
                onClick={handleDelete}
                disabled={view === 'deleting'}
                className="w-full h-11 rounded-xl text-sm font-semibold mb-2 transition-transform duration-75 active:scale-[0.97] disabled:opacity-50"
                style={{ background: '#EF4444', color: '#fff' }}
              >
                {view === 'deleting' ? '削除中...' : '削除する'}
              </button>
              <button
                onClick={close}
                disabled={view === 'deleting'}
                className="w-full h-10 text-sm transition-opacity active:opacity-60 disabled:opacity-40"
                style={{ color: 'var(--text-muted)' }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
