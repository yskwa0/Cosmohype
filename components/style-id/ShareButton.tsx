'use client'

import { useState } from 'react'

interface ShareButtonProps {
  title: string
  text: string
  url: string
}

export function ShareButton({ title, text, url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    // Web Share API が使える環境では共有シートを開く
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url })
        return // 成功 or キャンセルどちらもここで終了
      } catch (err) {
        // ユーザーがキャンセルした場合 (AbortError) は何もしない
        if (err instanceof Error && err.name === 'AbortError') return
        // それ以外（SecurityError など）はクリップボードにフォールバック
      }
    }

    // クリップボードコピー
    const copyText = `${text}\n${url}`
    try {
      await navigator.clipboard.writeText(copyText)
    } catch {
      // clipboard API も使えない場合は何もしない
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleShare}
      className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-75 active:scale-[0.97]"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        color: copied ? 'var(--purple)' : 'var(--text-sub)',
      }}
    >
      {copied ? (
        <>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          コピーしました
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
          シェアする
        </>
      )}
    </button>
  )
}
