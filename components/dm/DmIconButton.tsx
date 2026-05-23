'use client'

export function DmIconButton({ hasUnread }: { hasUnread: boolean }) {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent('cosmo:go-to-dm'))}
      className="relative w-9 h-9 flex items-center justify-center rounded-full"
      style={{ color: 'var(--text-sub)' }}
      aria-label="メッセージ"
    >
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
      {hasUnread && (
        <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-red-500" />
      )}
    </button>
  )
}
