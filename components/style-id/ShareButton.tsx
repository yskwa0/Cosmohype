'use client'

interface ShareButtonProps {
  title: string
  text: string
  url: string
}

export function ShareButton({ title, text, url }: ShareButtonProps) {
  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title, text, url })
    } else {
      await navigator.clipboard.writeText(url)
      alert('URLをコピーしました')
    }
  }

  return (
    <button
      onClick={handleShare}
      className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-75 active:scale-[0.97]"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-sub)' }}
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
      </svg>
      シェアする
    </button>
  )
}
