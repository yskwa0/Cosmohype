'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PrivacyPage() {
  const router = useRouter()
  const [backPressed, setBackPressed] = useState(false)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div
        className="sticky top-0 z-40 flex items-center gap-3 px-4 h-14"
        style={{
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <button
          onClick={() => router.back()}
          aria-label="戻る"
          onPointerDown={() => setBackPressed(true)}
          onPointerUp={() => setBackPressed(false)}
          onPointerLeave={() => setBackPressed(false)}
          onPointerCancel={() => setBackPressed(false)}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(124,58,237,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transform: backPressed ? 'scale(0.82)' : 'scale(1)',
            transition: backPressed
              ? 'transform 70ms ease-in'
              : 'transform 480ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#7C3AED" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-base font-semibold" style={{ color: 'var(--text)' }}>プライバシーポリシー</h1>
      </div>

      <div className="max-w-md mx-auto px-5 py-8 pb-16">
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>制定日：2026年5月26日</p>
        <p className="text-xs mb-8" style={{ color: 'var(--text-muted)' }}>運営：Cosmohype運営</p>

        <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--text-sub)' }}>
          Cosmohype運営（以下「運営」）は、ファッションSNS「Cosmohype」（以下「本サービス」）において、ユーザーのプライバシーを尊重し、個人情報を適切に管理します。本ポリシーでは、収集する情報・利用目的・管理方法についてご説明します。
        </p>

        <Section n={1} title="収集する情報">
          本サービスでは、以下の情報を収集します。
          <Items items={[
            'アカウント情報：メールアドレス、パスワード（暗号化保存）、ユーザー名、表示名',
            'プロフィール情報：自己紹介文、アバター画像、スタイルタグ、STYLE ID診断結果',
            '投稿コンテンツ：コーデ画像、キャプション、ブランドタグ',
            '行動履歴：いいね、保存、フォロー・フォロワー関係、コメント、DM',
            '通報・ブロック情報：通報内容、ブロックしたユーザーの情報',
            '端末・アクセス情報：IPアドレス、ブラウザ種別、OSバージョン',
          ]} />
        </Section>

        <Section n={2} title="情報の利用目的">
          収集した情報は、以下の目的で利用します。
          <Items items={[
            '本サービスの提供・維持・改善',
            'STYLE ID診断・AI機能の提供と精度向上',
            'フォローフィードやおすすめ機能のパーソナライズ',
            '不正利用・スパム・嫌がらせの防止',
            '通報内容の審査と対応',
            'ユーザーサポートへの対応',
            '重要なお知らせ・アップデート情報の送信',
          ]} />
        </Section>

        <Section n={3} title="画像データの取り扱い">
          投稿画像およびプロフィール画像は、安全なクラウドストレージに保存されます。ユーザーの明示的な同意なく、これらの画像をAIの学習データとして外部提供することはありません。アカウントを削除した場合、関連する画像データも削除されます。
        </Section>

        <Section n={4} title="STYLE ID診断データ">
          STYLE ID診断で回答した内容および診断結果は、ユーザーのスタイル分類・おすすめ表示のために利用します。診断データは本サービス外の第三者に提供しません。
        </Section>

        <Section n={5} title="第三者への提供">
          以下の場合を除き、ユーザーの個人情報を第三者に提供しません。
          <Items items={[
            'ユーザー本人が同意した場合',
            '法令に基づき開示が求められる場合',
            '人の生命・身体・財産の保護のために必要な場合',
          ]} />
          本サービスはインフラとしてSupabase（データベース・認証・ストレージ）を使用しており、データはSupabaseのサーバーに保存されます。
        </Section>

        <Section n={6} title="Cookieとセッション管理">
          ログイン状態の維持のため、認証トークンをブラウザに保存します。ブラウザのCookieを無効にすると、ログイン機能が正常に動作しない場合があります。
        </Section>

        <Section n={7} title="データの保管期間">
          個人情報は、サービスの利用期間中保管します。アカウントを削除した場合、投稿・フォロー関係・コメント・DMなどのデータは削除されます。ただし、法令上の保存義務がある情報については例外とします。
        </Section>

        <Section n={8} title="未成年者について">
          本サービスは13歳未満の方のご利用を想定していません。13歳未満の方の個人情報と判明した場合、速やかに削除します。
        </Section>

        <Section n={9} title="個人情報の開示・訂正・削除">
          ご自身の個人情報の開示・訂正・削除をご希望の場合は、下記のお問い合わせ先までご連絡ください。本人確認の上、合理的な期間内に対応します。
        </Section>

        <Section n={10} title="ポリシーの変更">
          本ポリシーは必要に応じて変更することがあります。重要な変更がある場合は、アプリ内通知またはメールでお知らせします。
        </Section>

        <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            お問い合わせ：<a href="mailto:support@cosmohype.jp" style={{ color: 'var(--purple)' }}>support@cosmohype.jp</a>
          </p>
        </div>
      </div>
    </div>
  )
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2
        className="text-sm font-bold mb-3 pb-2"
        style={{ color: 'var(--purple)', borderBottom: '1px solid var(--border)' }}
      >
        {n}. {title}
      </h2>
      <div className="text-sm leading-relaxed flex flex-col gap-2" style={{ color: 'var(--text-sub)' }}>
        {children}
      </div>
    </div>
  )
}

function Items({ items }: { items: string[] }) {
  return (
    <ul style={{ paddingLeft: '1.25rem', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px', listStyleType: 'disc' }}>
      {items.map(item => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}
