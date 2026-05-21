function S({ w, h, r = 8, className = '' }: { w?: number | string; h: number; r?: number; className?: string }) {
  return (
    <div
      className={`animate-pulse flex-shrink-0 ${className}`}
      style={{ width: w, height: h, borderRadius: r, background: 'var(--bg-elevated)' }}
    />
  )
}

export default function ProfileLoading() {
  return (
    <>
      {/* TopBar skeleton */}
      <div
        className="sticky top-0 z-40 flex items-center px-5 gap-3"
        style={{ height: 56, background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)' }}
      >
        <S w={32} h={32} r={16} />
        <S w={120} h={16} r={6} />
      </div>

      {/* ProfileHeader skeleton */}
      <div className="px-4 pt-5 pb-4">
        {/* アバター + 統計 */}
        <div className="flex items-center gap-4 mb-4">
          <S w={72} h={72} r={36} />
          <div className="flex flex-1 justify-around">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <S w={28} h={16} r={4} />
                <S w={40} h={10} r={4} />
              </div>
            ))}
          </div>
        </div>
        {/* 名前・bio */}
        <S w={100} h={13} r={5} className="mb-2" />
        <S w="85%" h={11} r={5} className="mb-1" />
        <S w="60%" h={11} r={5} className="mb-4" />
        {/* フォローボタン */}
        <S w="100%" h={38} r={12} />
      </div>

      {/* 投稿グリッド skeleton */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        <div className="grid grid-cols-3 gap-[1px]" style={{ background: 'var(--border)' }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ aspectRatio: '4/5', background: 'var(--bg-elevated)' }}
            />
          ))}
        </div>
      </div>
    </>
  )
}
