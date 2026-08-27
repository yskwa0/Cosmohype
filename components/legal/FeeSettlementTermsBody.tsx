// =============================================================================
// components/legal/FeeSettlementTermsBody.tsx  (Phase 4-C.7 / Migration 175)
//
// Fee Settlement Terms (料金・精算条件書) 本文レンダラー。
// Server / Client どちらの Component からも呼べる pure な view。
// MerchantAgreementBody と同型構造で、SoT (lib/feeSettlementTerms/) を渡して描画する。
//
// 呼出元:
//   - components/brand-admin/FeeSettlementTermsPanel.tsx (Brand Admin settings)
//   - (将来的に) 公開 /fee-settlement-terms ページを新設する場合の SSR ページ
//
// 本コンポーネント自身は「同意 UI」を持たない (button 等を含まない)。
// 同意 UI は Panel 側で本コンポーネントの外側に配置する。
// =============================================================================

import type {
  FeeTermsDocument,
  FeeTermsSection,
  FeeTermsParagraph,
} from '@/lib/feeSettlementTerms/content'

interface Props {
  doc: FeeTermsDocument
  /** SoT hash を footer に表示 (公開ページで true、modal / panel では false) */
  showHash?: string
}

function ParagraphView({ p }: { p: FeeTermsParagraph }) {
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

function SectionView({ s }: { s: FeeTermsSection }) {
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

export default function FeeSettlementTermsBody({ doc, showHash }: Props) {
  return (
    <article className="max-w-2xl">
      <header className="mb-8">
        <h1 className="text-lg font-semibold text-neutral-900">{doc.title}</h1>
        <div className="mt-2 text-xs text-neutral-600">
          <div>制定日: {doc.createdAt}</div>
          <div>版: <span className="font-semibold">{doc.version}</span></div>
          <div className="mt-1">{doc.operatorLine}</div>
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
          <div>fee terms version: {doc.version}</div>
          <div>fee terms hash (SHA-256): {showHash}</div>
        </footer>
      )}
    </article>
  )
}
