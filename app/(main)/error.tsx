'use client'

export default function FeedError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60svh] px-8 text-center gap-4">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#A855F7" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <circle cx="12" cy="16" r="0.5" fill="#A855F7" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>読み込みに失敗しました</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>通信状況を確認して、再度お試しください</p>
      </div>
      <button
        onClick={reset}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity active:opacity-70"
        style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(168,85,247,0.35)', color: '#C4B5FD' }}
      >
        再試行
      </button>
    </div>
  )
}
