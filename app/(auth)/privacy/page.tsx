'use client'
import { SlideBackButton } from '@/components/ui/SlideBackButton'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header
        className="sticky top-0 z-40"
        style={{
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <div className="flex items-center gap-3 px-4 h-14">
          <SlideBackButton aria-label="戻る" />
          <h1 className="text-base font-semibold" style={{ color: 'var(--text)' }}>プライバシーポリシー</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-8 pb-16">
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>制定日：2026年5月26日</p>
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>最終改定日：2026年8月25日</p>
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

        {/* ─────────────────────────────────────────────
            HYPE ショップ (EC) 章 — 2026年8月25日 追加
            ───────────────────────────────────────────── */}
        <Section n={11} title="HYPE ショップで収集する追加情報">
          HYPE ショップ機能をご利用の場合、SNS 機能で収集する情報に加えて以下を収集します。
          <Items items={[
            '配送先情報：宛名、郵便番号、都道府県、市区町村、番地、建物名、電話番号',
            '注文情報：購入商品、数量、金額、注文日時、注文ステータス、発送情報（配送業者、追跡番号、発送日時）',
            '決済識別情報:決済代行事業者から発行される決済取引の識別子（クレジットカード番号自体は本サービスのサーバーには保存されません）',
            '商品通報、商品トラブル報告の内容',
            'Push 通知配信用の端末識別子（Push トークン）',
          ]} />
        </Section>

        <Section n={12} title="販売事業者への個人情報開示">
          <p>HYPE ショップは仲介プラットフォームであり、商品の配送および返品・トラブル対応のため、購入時に購入者の下記情報を該当販売事業者に開示します。</p>
          <Items items={[
            '配送先の宛名、郵便番号、住所、電話番号',
            '購入商品、数量、金額、注文ステータス',
            '返品リクエスト、商品トラブル報告の内容',
          ]} />
          <p>購入者のログイン用メールアドレスおよびアカウント情報（パスワード等）を販売事業者に開示することはありません。販売事業者は開示された情報を、配送、返品、商品トラブル対応の目的にのみ使用するものとします。</p>
          <p>なお、本サービス運営の運営責任者（運営者権限が付与された運営者）は、注文横断的なトラブル対応、不正利用調査のため、購入者のメールアドレスを含む注文詳細を閲覧できる場合があります。運営者はこの目的以外での閲覧、利用は行いません。</p>
        </Section>

        <Section n={13} title="決済代行事業者への情報提供">
          決済処理は決済代行事業者（本ポリシー制定時点では Stripe, Inc.）が提供する決済サービスを通じて行われます。決済時に購入者が入力するクレジットカード情報その他決済に必要な情報は、決済代行事業者へ送信されます。決済代行事業者は PCI DSS に準拠しており、クレジットカード番号を含む決済情報は本サービスのサーバーには保存されず、決済代行事業者側で保持されます。決済代行事業者による個人情報の取扱いについては、決済代行事業者のプライバシーポリシーをご確認ください。
        </Section>

        <Section n={14} title="Push 通知・外部インフラの利用">
          本サービスは以下の外部インフラを利用しており、必要な範囲でデータを送受信します。
          <Items items={[
            'Supabase：データベース、認証、ストレージ、Edge Functions（ユーザー情報、投稿、注文情報等の保存）',
            '決済代行事業者（Stripe, Inc.）：決済処理（詳細は前条）',
            'Apple Push Notification service（APNs）：iOS 端末への Push 通知配信。通知配信のため端末識別子（Push トークン）を本サービスに保存し、APNs に送信します。Push 通知の受信を望まない場合は、iOS の設定アプリから通知を無効化できます。',
            'Google Firebase Analytics（Web のみ）：Web の利用状況分析。氏名、メールアドレス、住所、電話番号、カード情報は Analytics イベントとして送信しません。iOS アプリでは Firebase Analytics を使用しません。',
          ]} />
        </Section>

        <Section n={15} title="注文履歴の保管期間">
          注文情報、配送情報、返品情報その他の HYPE ショップに関する情報は、税務・会計、取引記録の保存、紛争・トラブル対応その他法令上または業務上必要な期間、本サービスに保管する場合があります。アカウント削除後についても、法令上保存が必要な情報その他正当な理由により保存が必要な情報については、必要な期間保管する場合があります。
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
