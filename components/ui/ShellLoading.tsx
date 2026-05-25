function Spinner() {
  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 28 28"
      fill="none"
      className="animate-spin"
      style={{ color: 'var(--purple)' }}
    >
      <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.15" />
      <path d="M14 4a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function ShellLoading() {
  return (
    <div>
      <div
        className="sticky top-0 z-40"
        style={{
          background: 'var(--bg)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <div className="max-w-md mx-auto flex items-center gap-3 px-5" style={{ height: 56 }}>
          <div className="w-8 h-8 rounded-full flex-shrink-0 animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
          <div className="h-4 w-28 rounded-lg animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
        </div>
        <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }} />
      </div>
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100svh - 120px)' }}>
        <Spinner />
      </div>
    </div>
  )
}
