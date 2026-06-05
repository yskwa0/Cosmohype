'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

const DESCRIPTION = `AI Fittingは、自分の全身写真と気になる服の画像を使って、AIが着用イメージを生成する機能です。

「この服、自分に似合うかな？」をその場で確かめられます。実際に購入する前の参考にも使えます。`

const STEPS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#A855F7" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="7" r="4" />
        <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      </svg>
    ),
    label: '全身写真をアップロード',
    hint: '正面・全身が写った写真が最適です',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#A855F7" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.86H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.86l.58-3.57a2 2 0 00-1.34-2.23z" />
      </svg>
    ),
    label: '服の画像をアップロード',
    hint: '白背景の商品画像が推奨です',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#A855F7" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
    label: 'AIが着用イメージを生成',
    hint: '結果は履歴として保存されます',
  },
]

export function AiFittingInfoModal() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  function handleOpen(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setOpen(true)
  }
  function handleClose() { setOpen(false) }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      {/* 「？」ボタン — SpringCard の infoButton と同じスタイル */}
      <button
        onClick={handleOpen}
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold leading-none flex-shrink-0"
        style={{ background: 'rgba(168,85,247,0.25)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(168,85,247,0.4)' }}
        aria-label="AI Fittingの説明を見る"
      >
        ?
      </button>

      {/* モーダル */}
      {mounted && open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
          onClick={handleClose}
        >
          <div
            className="w-full max-w-md max-h-[calc(100dvh-2rem)] flex flex-col rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #0F0A2E 0%, #1A0A38 60%, #0D0820 100%)',
              border: '1px solid rgba(168,85,247,0.3)',
              boxShadow: '0 0 60px rgba(124,58,237,0.25)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(168,85,247,0.2)' }}
            >
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#A855F7" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.86H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.86l.58-3.57a2 2 0 00-1.34-2.23z" />
                </svg>
                <h2 className="text-base font-bold text-white">AI Fitting とは？</h2>
              </div>
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
                aria-label="閉じる"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* コンテンツ */}
            <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">

              {/* 説明文 */}
              <p
                className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: 'rgba(220,200,255,0.85)' }}
              >
                {DESCRIPTION}
              </p>

              {/* 使い方ステップ */}
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-4"
                  style={{ color: 'rgba(168,85,247,0.8)' }}
                >
                  使い方
                </p>
                <div className="flex flex-col gap-3">
                  {STEPS.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(168,85,247,0.25)' }}
                      >
                        {step.icon}
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-sm font-semibold mb-0.5" style={{ color: '#EDE9FE' }}>
                          {step.label}
                        </p>
                        <p className="text-xs" style={{ color: 'rgba(196,181,253,0.6)' }}>
                          {step.hint}
                        </p>
                      </div>
                      <span
                        className="text-xs font-bold mt-1 flex-shrink-0"
                        style={{ color: 'rgba(168,85,247,0.6)' }}
                      >
                        {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 注意書き */}
              <div
                className="rounded-2xl px-4 py-3"
                style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.18)' }}
              >
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(196,181,253,0.65)' }}>
                  アップロードした画像はAI試着にのみ使用されます。第三者への公開・AI学習への利用は行いません。
                </p>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
