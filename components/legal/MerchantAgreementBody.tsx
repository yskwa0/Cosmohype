// =============================================================================
// components/legal/MerchantAgreementBody.tsx  (Phase 4-B / Migration 168)
//
// Merchant Agreement (ブランド出店規約) 本文レンダラー。
// Server / Client どちらの Component からも呼べる pure な view。
//   - components/brand-admin/MerchantAgreementModal.tsx (Brand Admin 同意 modal)
// の 1 経路が AgreementDocument を渡して描画する。
// Phase 4-C.7 privacy 方針変更で公開 /merchant-agreement route は削除済。
// operator の実名・住所を含む本文は Brand Admin 認証内のみで render する。
//
// 本コンポーネント自身は「同意 UI」を持たない (button 等を含まない)。
// 同意 UI は modal 側で本コンポーネントの外側に配置する。
// =============================================================================

import type {
  AgreementDocument,
  AgreementSection,
  Paragraph,
} from '@/lib/merchantAgreement/content'

interface Props {
  doc: AgreementDocument
  /** SoT hash を footer に表示 (public page でのみ true。 modal では false 推奨) */
  showHash?: string
}

/** "v1" → "第1版" のように表示する。 */
function versionLabel(v: string): string {
  const m = v.match(/^v(\d+)$/i)
  return m ? `第${m[1]}版` : v
}

function ParagraphView({ p }: { p: Paragraph }) {
  if (p.kind === 'text') {
    return <p className="text-sm leading-relaxed text-neutral-800">{p.text}</p>
  }
  if (p.kind === 'ordered') {
    return (
      <ol className="list-decimal pl-6 space-y-1.5 text-sm leading-relaxed text-neutral-800">
        {p.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ol>
    )
  }
  return (
    <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed text-neutral-800">
      {p.items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

function SectionView({ s }: { s: AgreementSection }) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-bold text-neutral-900 border-b border-neutral-200 pb-2 mb-3">
        第 {s.number} 条 ({s.title})
      </h2>
      <div className="space-y-2">
        {s.paragraphs.map((p, i) => (
          <ParagraphView key={i} p={p} />
        ))}
      </div>
    </section>
  )
}

export default function MerchantAgreementBody({ doc, showHash }: Props) {
  return (
    <article className="max-w-2xl">
      <header className="mb-8">
        <h1 className="text-lg font-semibold text-neutral-900">{doc.title}</h1>
        <div className="mt-2 text-xs text-neutral-600">
          <div>制定日: {doc.createdAt}</div>
          <div>版: <span className="font-semibold">{versionLabel(doc.version)}</span></div>
          <div className="mt-1">運営者: {doc.operatorLine}</div>
          <div>管轄: {doc.jurisdictionLine}</div>
        </div>
      </header>

      <div className="mb-8 space-y-2">
        {doc.preamble.map((p, i) => (
          <ParagraphView key={i} p={p} />
        ))}
      </div>

      {doc.sections.map((s) => (
        <SectionView key={s.number} s={s} />
      ))}

      {showHash && (
        <footer className="mt-10 pt-4 border-t border-neutral-200 text-[10px] text-neutral-500 break-all">
          <div>規約の版: {versionLabel(doc.version)}</div>
          <div>本文の SHA-256: {showHash}</div>
        </footer>
      )}
    </article>
  )
}
