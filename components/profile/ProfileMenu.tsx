'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'

type View = 'closed' | 'dropdown' | 'report' | 'block-confirm' | 'unblock-confirm' | 'done'

const REASONS = [
  'スパム / 宣伝',
  '嫌がらせ / 誹謗中傷',
  '不適切な画像',
  'なりすまし',
  '出会い目的 / 外部誘導',
  'その他',
]

export function ProfileMenu({ targetUserId, currentUserId, initialBlocked }: {
  targetUserId: string
  currentUserId: string
  initialBlocked: boolean
}) {
  const [view, setView] = useState<View>('closed')
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reportError, setReportError] = useState('')
  const [blocked, setBlocked] = useState(initialBlocked)
  const [doneMsg, setDoneMsg] = useState('')
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])

  function close() {
    setView('closed')
    setReason('')
    setDetail('')
    setReportError('')
  }

  async function submitReport() {
    if (!currentUserId || currentUserId === targetUserId) return
    if (!reason) return

    setSubmitting(true)
    setReportError('')

    // detail/status は型定義未更新のため as any でキャスト
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('reports') as any).insert({
      reporter_id: currentUserId,
      target_type: 'user',
      target_id: targetUserId,
      reason,
      detail: detail.trim() || null,
      status: 'pending',
    })

    setSubmitting(false)

    if (error) {
      if (error.code === '23505') {
        setReportError('すでにこのユーザーを通報済みです。')
      } else {
        setReportError('通報の送信に失敗しました。時間をおいて再度お試しください。')
      }
      return
    }

    setDoneMsg('通報を受け付けました。ご協力ありがとうございます。')
    setView('done')
  }

  async function submitBlock() {
    await supabase.from('blocks').insert({ blocker_id: currentUserId, blocked_id: targetUserId })
    setBlocked(true)
    setDoneMsg('ブロックしました。')
    setView('done')
  }

  async function submitUnblock() {
    await supabase.from('blocks').delete()
      .eq('blocker_id', currentUserId)
      .eq('blocked_id', targetUserId)
    setBlocked(false)
    setDoneMsg('ブロックを解除しました。')
    setView('done')
  }

  const canSubmit = !!reason && !submitting
  const showDetail = reason === 'その他'
  const showSheet = view === 'report' || view === 'block-confirm' || view === 'unblock-confirm' || view === 'done'

  return (
    <div className="relative">
      {/* "..." ボタン */}
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

      {/* ドロップダウン */}
      {view === 'dropdown' && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={close} />
          <div
            className="absolute top-full right-0 mt-2 z-[95] min-w-[160px] rounded-2xl"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setView('report')}
              className="flex items-center gap-2.5 w-full px-4 py-3.5 text-sm font-medium text-left transition-all duration-75 active:scale-[0.96] active:opacity-80"
              style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l1.664 9.849A2.25 2.25 0 006.88 14.9l.38.06A2.25 2.25 0 019.5 17.25h5a2.25 2.25 0 002.24-2.29l.38-.06a2.25 2.25 0 002.216-2.051L21 3H3z" />
              </svg>
              通報する
            </button>
            <button
              onClick={() => setView(blocked ? 'unblock-confirm' : 'block-confirm')}
              className="flex items-center gap-2.5 w-full px-4 py-3.5 text-sm font-medium text-left transition-all duration-75 active:scale-[0.96] active:opacity-80"
              style={{ color: '#EF4444' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              {blocked ? 'ブロック解除' : 'ブロックする'}
            </button>
          </div>
        </>
      )}

      {/* 確認・通報シート（portal） */}
      {mounted && showSheet && createPortal(
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/40"
            onClick={view === 'done' || submitting ? undefined : close}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-[100] max-w-md mx-auto rounded-t-2xl overflow-hidden"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            {view === 'report' && (
              <div className="flex flex-col px-5 pb-6">
                <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-5" style={{ background: 'var(--border)' }} />
                <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>ユーザーを通報</h3>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                  問題のあるユーザーを運営に報告できます。<br />
                  該当する理由を選択してください。
                </p>

                <div className="flex flex-col gap-2 mb-4">
                  {REASONS.map(r => (
                    <button
                      key={r}
                      onClick={() => { setReason(r); setDetail(''); setReportError('') }}
                      className="flex items-center justify-between px-4 py-3 rounded-xl text-sm text-left transition-all duration-75 active:scale-[0.97]"
                      style={{
                        background: reason === r ? 'var(--purple-dim)' : 'var(--bg-subtle)',
                        border: `1px solid ${reason === r ? 'var(--purple)' : 'var(--border)'}`,
                        color: reason === r ? 'var(--purple)' : 'var(--text)',
                      }}
                    >
                      {r}
                      {reason === r && (
                        <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="currentColor">
                          <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>

                {/* 「その他」選択時の詳細入力 */}
                {showDetail && (
                  <textarea
                    value={detail}
                    onChange={e => setDetail(e.target.value)}
                    placeholder="詳細を入力してください（任意）"
                    rows={3}
                    maxLength={500}
                    className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none mb-4"
                    style={{
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                    }}
                  />
                )}

                {/* エラーメッセージ */}
                {reportError && (
                  <p className="text-xs mb-3 text-center" style={{ color: '#EF4444' }}>
                    {reportError}
                  </p>
                )}

                <button
                  onClick={submitReport}
                  disabled={!canSubmit}
                  className="w-full h-11 rounded-xl text-sm font-semibold transition-all duration-75 active:scale-[0.97] disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: 'var(--purple)', color: '#fff' }}
                >
                  {submitting && (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {submitting ? '送信中...' : '通報する'}
                </button>
                <button
                  onClick={close}
                  disabled={submitting}
                  className="w-full h-10 mt-2 text-sm transition-opacity active:opacity-60 disabled:opacity-40"
                  style={{ color: 'var(--text-muted)' }}
                >
                  キャンセル
                </button>
              </div>
            )}

            {view === 'block-confirm' && (
              <div className="flex flex-col px-5 pb-8">
                <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-5" style={{ background: 'var(--border)' }} />
                <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text)' }}>ブロックしますか？</h3>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                  ブロックすると、このユーザーの投稿がフィードに表示されなくなります。相手には通知されません。
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

            {view === 'unblock-confirm' && (
              <div className="flex flex-col px-5 pb-8">
                <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-5" style={{ background: 'var(--border)' }} />
                <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text)' }}>ブロックを解除しますか？</h3>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                  解除すると、このユーザーの投稿が再びフィードに表示されます。
                </p>
                <button
                  onClick={submitUnblock}
                  className="w-full h-11 rounded-xl text-sm font-semibold mb-2 transition-transform duration-75 active:scale-[0.97]"
                  style={{ background: 'var(--purple)', color: '#fff' }}
                >
                  ブロックを解除する
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

            {view === 'done' && (
              <div className="flex flex-col items-center px-5 py-10">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                  style={{ background: 'var(--purple-dim)' }}>
                  <svg viewBox="0 0 24 24" className="w-7 h-7" style={{ color: 'var(--purple)' }} fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-sm text-center mb-5" style={{ color: 'var(--text)' }}>{doneMsg}</p>
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
