import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'

export default function StyleIdTopPage() {
  return (
    <>
      <TopBar title="STYLE ID" left={<BackButton href="/contents" />} />

      <div className="px-5 pt-10 pb-12 flex flex-col gap-12">
        {/* Hero */}
        <div className="flex flex-col items-center text-center gap-4">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #EC4899 100%)',
              boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
            }}
          >
            ✨
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--text)' }}>
              STYLE ID
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              8つの質問であなたのスタイルを診断。<br />自分だけのファッション星座を見つけよう。
            </p>
          </div>
        </div>

        {/* Step description */}
        <div
          className="rounded-2xl p-5 flex flex-col gap-4"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          {[
            { step: '01', text: '15問の質問に答える（約2分）' },
            { step: '02', text: 'あなたのスタイルIDが判明' },
            { step: '03', text: '相性診断でコーデ仲間を探す' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-center gap-3">
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: 'var(--purple-dim)', color: 'var(--purple)' }}
              >
                {step}
              </span>
              <p className="text-sm" style={{ color: 'var(--text-sub)' }}>{text}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Link
            href="/style-id/quiz"
            className="w-full h-14 rounded-2xl flex items-center justify-center text-base font-semibold text-white transition-transform duration-75 active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
              boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
            }}
          >
            診断スタート →
          </Link>
          <Link
            href="/style-id/compat"
            className="w-full h-12 rounded-2xl flex items-center justify-center text-sm font-semibold transition-all duration-75 active:scale-[0.97] active:opacity-80"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-sub)',
            }}
          >
            相性診断をする
          </Link>
        </div>
      </div>
    </>
  )
}
