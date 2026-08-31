import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '申請を受け付けました — HYPE',
  description: 'HYPE への出店申請を受け付けました。',
}

export default function HypeApplyThanksPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
      <div className="max-w-md px-8 text-center">
        <div className="text-[10px] tracking-[0.35em] text-neutral-500 mb-3">HYPE</div>
        <h1 className="text-2xl font-semibold tracking-wide mb-6">申請を受け付けました</h1>
        <p className="text-sm text-neutral-400 leading-relaxed mb-6">
          お申し込みありがとうございます。<br />
          内容を確認後、Cosmohype より
          <br />ご登録のご案内をお送りします。
        </p>
        <p className="text-[11px] text-neutral-500 leading-relaxed">
          ご案内メールは、ご入力いただいたアドレス宛にお送りします。
          しばらくお待ちください。
        </p>
      </div>
    </main>
  )
}
