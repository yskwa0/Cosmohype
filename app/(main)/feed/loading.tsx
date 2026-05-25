function S({ w, h, r = 8, className = '' }: { w?: number | string; h: number; r?: number; className?: string }) {
  return (
    <div
      className={`animate-pulse flex-shrink-0 ${className}`}
      style={{ width: w, height: h, borderRadius: r, background: 'var(--bg-elevated)' }}
    />
  )
}

function FakeCard() {
  return (
    <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex gap-3">
        <S w={40} h={40} r={20} />
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <S w={110} h={11} />
          <S w="100%" h={252} r={12} />
          <S w={72} h={10} />
        </div>
      </div>
    </div>
  )
}

export default function FeedLoading() {
  return (
    <>
      {/* TopBar skeleton */}
      <div
        className="sticky top-0 z-40"
        style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)', paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center justify-between px-5" style={{ height: 56 }}>
          <S w={128} h={18} r={6} />
          <S w={32} h={32} r={16} />
        </div>
      </div>

      {/* FeedTabs skeleton */}
      <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex-1 flex justify-center py-3"><S w={64} h={11} r={6} /></div>
        <div className="flex-1 flex justify-center py-3"><S w={80} h={11} r={6} /></div>
      </div>

      {/* Post cards */}
      <FakeCard />
      <FakeCard />
      <FakeCard />
    </>
  )
}
