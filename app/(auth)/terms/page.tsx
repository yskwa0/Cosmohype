'use client'
import { SlideBackButton } from '@/components/ui/SlideBackButton'

export default function TermsPage() {
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
          <h1 className="text-base font-semibold" style={{ color: 'var(--text)' }}>利用規約</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-5 py-8 pb-16">
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>制定日：2026年5月26日</p>
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>最終改定日：2026年8月25日</p>
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

        {/* ─────────────────────────────────────────────
            HYPE ショップ (EC) 章 — 2026年8月25日 追加
            ───────────────────────────────────────────── */}
        <Section n={11} title="HYPE ショップの位置付け">
          HYPE は本サービス内で提供するファッションブランド商品購入機能です。運営は HYPE 上に出店するブランド事業者（以下「販売事業者」）と購入者との売買を仲介するプラットフォームを提供します。個々の商品の売買契約は購入者と当該販売事業者との間で成立し、運営は売買契約の当事者ではありません。販売事業者ごとの法定表示（特定商取引法に基づく表記）は、各商品ページからご確認いただけます。
        </Section>

        <Section n={12} title="販売価格・送料">
          商品の販売価格は税込表示です。送料は購入手続き画面（Checkout）で商品ごとの実額と合計金額を表示します。商品代金以外に購入者が負担する費用がある場合は、購入手続き画面または各販売事業者の「特定商取引法に基づく表記」に表示します。
        </Section>

        <Section n={13} title="お支払方法・注文成立">
          お支払方法はクレジットカード決済のみです。決済処理は本サービスが連携する決済代行事業者（以下「決済代行事業者」といい、本規約制定時点では Stripe, Inc. がこれに該当します）が行います。ご注文は、購入者による注文手続きおよび決済が正常に完了し、本サービス上で注文成立が確認された時点で成立します。決済が失敗または取り消された場合、当該注文は成立せず、確保していた在庫は自動的に解放されます。
        </Section>

        <Section n={14} title="配送地域・引渡時期">
          現在の配送地域は日本国内のみです。商品の引渡時期は販売事業者が設定する発送目安に従います（各商品ページの「DELIVERY & RETURN」欄および特定商取引法に基づく表記に記載）。天災、在庫状況、物流事情により遅延する場合があります。
        </Section>

        <Section n={15} title="返品・キャンセル">
          本サービスにおける商品購入は通信販売に該当し、訪問販売等におけるクーリング・オフ制度は適用されません。ただし、これは返品ができないという意味ではありません。返品の可否、受付期間、返品条件、返品方法、および返品送料の負担については、各販売事業者が定める返品特約（各商品ページの返品ポリシーおよび特定商取引法に基づく表記）をご購入前に必ずご確認ください。返品受付および返金判定は、法令上購入者に認められる権利を妨げない範囲で、各販売事業者が定める返品特約その他の条件に基づき販売事業者が行います。運営は、必要に応じて返金の技術的処理および手続きの仲介を行います。
          {'\n\n'}
          なお、販売事業者の責任による返品・交換（商品不良、破損、誤配送、数量違いその他販売事業者の責任による場合）に必要な返送送料は、Cosmohype の運営ルールとして販売事業者の負担としています。このルールは、Cosmohype と各販売事業者との間のブランド出店規約において販売事業者が合意しているものであり、法令上購入者に認められる権利を制限する趣旨ではありません。
        </Section>

        <Section n={16} title="商品不良・トラブル対応">
          商品到着後に不良、破損、注文内容との相違があった場合は、本サービスの「商品トラブル報告」機能から販売事業者へ通知してください。販売事業者による確認の結果、返品・返金が承認された場合、運営は決済代行事業者を通じて返金処理を行います。
        </Section>

        <Section n={17} title="未成年者による購入">
          未成年者が本サービスで商品を購入する場合、必ず親権者の同意を得てください。親権者の同意なく行われた購入は、民法その他の関連法令に基づき取消される場合があります。取消の効果および取消により生じる法律関係については、民法その他関連法令に従って処理されます。運営は仲介プラットフォームの提供者としての立場で、購入者・販売事業者間の取消手続きに必要な範囲で協力します。
        </Section>

        <Section n={18} title="外部リンク">
          ブランドページに掲載される公式サイト、Instagram 等の外部リンク先の外部サービスは、運営の管理下にありません。外部サービスの利用には、当該外部サービスが定める利用規約およびプライバシーポリシー等が適用されます。運営は、法令上運営が責任を負う場合を除き、外部サービスの内容、外部サービス上の取引または外部サービス利用によって生じた損害について責任を負いません。
        </Section>

        <Section n={19} title="商品通報・販売停止">
          購入者は、法令違反、危険物、偽造品、不適切な内容と思われる商品を「商品を通報」機能から運営へ通知できます。運営は通報内容を審査し、必要に応じて商品の販売停止、ブランドの停止等の措置を行います。通報者情報を販売事業者に開示することはありません。
        </Section>

        <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs text-center mb-2" style={{ color: 'var(--text-muted)' }}>
            HYPE に出店する販売事業者向けの「ブランド出店規約」は、Brand Admin 内で提示されます。
          </p>
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
