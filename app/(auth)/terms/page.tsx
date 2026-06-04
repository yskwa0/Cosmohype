'use client'
import { SlideBackButton } from '@/components/ui/SlideBackButton'

export default function TermsPage() {
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
        <SlideBackButton aria-label="戻る" />
        <h1 className="text-base font-semibold" style={{ color: 'var(--text)' }}>利用規約</h1>
      </div>

      <div className="max-w-md mx-auto px-5 py-8 pb-16">
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>制定日：2026年5月26日</p>
        <p className="text-xs mb-8" style={{ color: 'var(--text-muted)' }}>運営：Cosmohype運営</p>

        <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--text-sub)' }}>
          この利用規約（以下「本規約」）は、Cosmohype運営（以下「運営」）が提供するファッションSNS「Cosmohype」（以下「本サービス」）のご利用条件を定めるものです。アカウントを作成した時点で、本規約に同意したものとみなされます。
        </p>

        <Section n={1} title="サービスについて">
          Cosmohypeは、コーデ・ファッションを投稿・共有し、スタイルの近いユーザー同士がつながれるSNSサービスです。投稿、フォロー、いいね、コメント、ダイレクトメッセージ（DM）、STYLE ID診断などの機能を提供しています。
        </Section>

        <Section n={2} title="利用登録">
          本サービスの利用には、メールアドレスとパスワードによるアカウント登録が必要です。登録情報は正確なものを入力してください。13歳未満の方はご利用いただけません。
        </Section>

        <Section n={3} title="投稿コンテンツ">
          ユーザーが投稿した画像・テキスト（以下「投稿コンテンツ」）の著作権はユーザー本人に帰属します。ただし、運営はサービスの運営・改善・宣伝を目的として投稿コンテンツを無償で利用できるものとします。投稿には自分が権利を持つ画像のみ使用してください。他者の著作物・肖像を無断で掲載することは禁止です。
        </Section>

        <Section n={4} title="禁止事項">
          以下の行為を禁止します。
          <Items items={[
            '他のユーザーへの嫌がらせ・誹謗中傷・差別的発言',
            'わいせつ・暴力・不適切なコンテンツの投稿',
            '他者のなりすまし',
            'スパム投稿・過度な宣伝・外部サービスへの不正誘導',
            '第三者の著作権・肖像権・プライバシーの侵害',
            '未成年者を対象とした不適切な接触',
            '本サービスの機能を悪用した迷惑行為',
            '法令または公序良俗に反する行為',
          ]} />
        </Section>

        <Section n={5} title="通報・ブロック機能">
          本サービスでは、問題のある投稿・ユーザーを通報する機能と、特定ユーザーの投稿を非表示にするブロック機能を提供しています。虚偽の通報や嫌がらせを目的とした通報・ブロックは禁止します。運営は通報内容を確認し、必要に応じてコンテンツ削除・アカウント停止などの対応を行います。
        </Section>

        <Section n={6} title="STYLE ID診断・AI機能">
          本サービスが提供するSTYLE ID診断は、ユーザーの回答をもとにファッションスタイルを分類する機能です。診断結果はあくまで参考情報であり、正確性を保証するものではありません。将来的に提供予定のAI機能についても、その精度・結果に関する保証は行いません。
        </Section>

        <Section n={7} title="アカウント停止・削除">
          運営は、本規約に違反したユーザーのアカウントを事前通知なく停止または削除することがあります。アカウントを自ら削除した場合、投稿・フォロー関係・メッセージなどのデータも削除されます。削除後のデータ復元はできません。
        </Section>

        <Section n={8} title="免責事項">
          運営は、本サービスの利用によって生じた損害について、一切の責任を負いません。ユーザー間のトラブル、投稿コンテンツの内容、サービスの中断・停止についても同様とします。
        </Section>

        <Section n={9} title="規約の変更">
          運営は必要に応じて本規約を変更することがあります。重要な変更がある場合はアプリ内でお知らせします。変更後も本サービスを利用し続けた場合、変更後の規約に同意したものとみなします。
        </Section>

        <Section n={10} title="準拠法・管轄">
          本規約は日本法に準拠します。本サービスに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
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
