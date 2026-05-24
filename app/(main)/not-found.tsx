import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-8"
      style={{ background: 'var(--bg)' }}
    >
      <p className="text-6xl font-black mb-4" style={{ color: 'var(--purple)' }}>404</p>
      <p className="text-base font-semibold mb-2" style={{ color: 'var(--text)' }}>ページが見つかりません</p>
      <p className="text-sm text-center mb-8" style={{ color: 'var(--text-muted)' }}>
        このページは存在しないか、削除された可能性があります。
      </p>
      <Link
        href="/feed"
        className="px-6 py-3 rounded-full text-sm font-semibold transition-opacity active:opacity-70"
        style={{ background: 'var(--purple)', color: '#fff' }}
      >
        フィードへ戻る
      </Link>
    </div>
  )
}
