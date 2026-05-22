'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type View = 'closed' | 'dropdown' | 'block-confirm' | 'block-done' | 'report-done'

export function DmChatMenu({ targetUserId, currentUserId }: {
  targetUserId: string
  currentUserId: string
}) {
  const [view, setView] = useState<View>('closed')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

  function close() { setView('closed') }

  async function submitBlock() {
    const supabase = createClient()
    await supabase.from('blocks').insert({ blocker_id: currentUserId, blocked_id: targetUserId })
    setView('block-done')
  }

  function submitReport() {
    setView('report-done')
  }

  const showSheet = view === 'block-confirm' || view === 'block-done' || view === 'report-done'

  return (
    <div className="relative">
      <button
        onClick={() => setView(v => v === 'dropdown' ? 'closed' : 'dropdown')}
        className="w-9 h-9 rounded-full flex items-center justify-center transition-transform duration-75 active:scale-90"
        style={{
          background: view === 'dropdown' ? 'var(--purple-dim)' : 'var(--bg-subtle)',
          border: `1px solid ${view === 'dropdown' ? 'var(--purple)' : 'var(--border)'}`,
          color: view === 'dropdown' ? 'var(--purple)' : 'var(--text-muted)',
        }}
        aria-label="メニュー"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
        </svg>
      </button>

      {view === 'dropdown' && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={close} />
          <div
            className="absolute top-full right-0 mt-2 z-[95] min-w-[160px] rounded-2xl overflow-hidden"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}
          >
            <button
              onClick={() => setView('block-confirm')}
              className="flex items-center gap-2.5 w-full px-4 py-3.5 text-sm font-medium text-left transition-all duration-75 active:scale-[0.96] active:opacity-80"
              style={{ color: '#EF4444', borderBottom: '1px solid var(--border)' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              ブロックする
            </button>
            <button
              onClick={submitReport}
              className="flex items-center gap-2.5 w-full px-4 py-3.5 text-sm font-medium text-left transition-all duration-75 active:scale-[0.96] active:opacity-80"
              style={{ color: 'var(--text)' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l1.664 9.849A2.25 2.25 0 006.88 14.9l.38.06A2.25 2.25 0 019.5 17.25h5a2.25 2.25 0 002.24-2.29l.38-.06a2.25 2.25 0 002.216-2.051L21 3H3z" />
              </svg>
              通報する
            </button>
          </div>
        </>
      )}

      {mounted && showSheet && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-black/40" onClick={close} />
          <div
            className="fixed bottom-0 left-0 right-0 z-[100] max-w-md mx-auto rounded-t-2xl overflow-hidden"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            {view === 'block-confirm' && (
              <div className="flex flex-col px-5 pb-8">
                <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-5" style={{ background: 'var(--border)' }} />
                <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text)' }}>ブロックしますか？</h3>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                  ブロックすると、このユーザーとのDMができなくなります。相手には通知されません。
                </p>
                <button
                  onClick={submitBlock}
                  className="w-full h-11 rounded-xl text-sm font-semibold mb-2 transition-transform duration-75 active:scale-[0.97]"
                  style={{ background: '#EF4444', color: '#fff' }}
                >
                  ブロックする
                </button>
                <button
                  onClick={close}
                  className="w-full h-10 text-sm transition-opacity active:opacity-60"
                  style={{ color: 'var(--text-muted)' }}
                >
                  キャンセル
                </button>
              </div>
            )}

            {view === 'block-done' && (
              <div className="flex flex-col items-center px-5 py-10">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                  style={{ background: 'var(--purple-dim)' }}>
                  <svg viewBox="0 0 24 24" className="w-7 h-7" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-sm text-center mb-5" style={{ color: 'var(--text)' }}>ブロックしました。</p>
                <button
                  onClick={() => router.push('/dm')}
                  className="w-full h-11 rounded-xl text-sm font-semibold transition-transform duration-75 active:scale-[0.97]"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
                >
                  メッセージ一覧に戻る
                </button>
              </div>
            )}

            {view === 'report-done' && (
              <div className="flex flex-col items-center px-5 py-10">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                  style={{ background: 'var(--purple-dim)' }}>
                  <svg viewBox="0 0 24 24" className="w-7 h-7" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-sm text-center mb-5" style={{ color: 'var(--text)' }}>通報を受け付けました。</p>
                <button
                  onClick={close}
                  className="w-full h-11 rounded-xl text-sm font-semibold transition-transform duration-75 active:scale-[0.97]"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
                >
                  閉じる
                </button>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
