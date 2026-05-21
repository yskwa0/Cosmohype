import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { createClient } from '@/lib/supabase/server'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import { BODY_TYPE_LABELS, getStyleAdvice } from '@/lib/styleAdvice'
import { getAffiliateItems } from '@/lib/affiliateItems'
import { getRecommendItems } from '@/lib/recommendItems'
import { AffiliateItemButton } from '@/components/affiliate/AffiliateItemButton'
import { RecommendItemButton } from '@/components/affiliate/RecommendItemButton'
import type { StyleId } from '@/lib/style-id/types'
import type { BodyType } from '@/lib/styleAdvice'

function AdviceRow({ label, items, variant = 'default' }: {
  label: string
  items: string[]
  variant?: 'accent' | 'muted' | 'default'
}) {
  const tagStyle =
    variant === 'accent'
      ? { background: 'var(--purple-dim)', color: 'var(--purple)', border: '1px solid var(--border)' }
      : variant === 'muted'
        ? { background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.75)', border: '1px solid rgba(239,68,68,0.15)' }
        : { background: 'var(--bg-subtle)', color: 'var(--text-sub)', border: '1px solid var(--border)' }

  return (
    <div className="px-5 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(item => (
          <span key={item} className="text-xs px-2.5 py-1 rounded-full font-medium" style={tagStyle}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

const VALID_STYLE_IDS: StyleId[] = [
  'COSMIC_REBEL', 'SOFT_DREAMER', 'URBAN_EDGE', 'CLASSIC_ELITE',
  'FREE_SPIRIT', 'DARK_POET', 'RETRO_WAVE', 'MINIMAL_SOUL',
]
const VALID_BODY_TYPES: BodyType[] = ['straight', 'wave', 'natural']

export default async function StyleMatchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let styleId: StyleId | null = null
  let bodyType: BodyType | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('style_id, body_type')
      .eq('id', user.id)
      .single()

    const rawStyleId = profile?.style_id
    const rawBodyType = profile?.body_type

    if (rawStyleId && (VALID_STYLE_IDS as string[]).includes(rawStyleId)) {
      styleId = rawStyleId as StyleId
    }
    if (rawBodyType && (VALID_BODY_TYPES as string[]).includes(rawBodyType)) {
      bodyType = rawBodyType as BodyType
    }
  }

  const styleInfo = styleId ? STYLE_TYPES[styleId] : null
  const bodyLabel = bodyType ? BODY_TYPE_LABELS[bodyType] : null
  const hasBoth = styleId !== null && bodyType !== null
  const advice = hasBoth ? getStyleAdvice(styleId!, bodyType!) : null
  const affiliateItems = hasBoth ? getAffiliateItems(styleId!, bodyType!) : null
  const recommendItems = hasBoth ? getRecommendItems(styleId!, bodyType!) : null

  return (
    <>
      <TopBar title="STYLE ID × 骨格" left={<BackButton />} />

      <div className="flex flex-col items-center px-5 pb-24">
        {/* Hero */}
        <div className="w-full max-w-md mt-8 mb-8 text-center">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6"
            style={{ background: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 50%, #EC4899 100%)' }}
          >
            <span className="text-4xl" role="img" aria-label="style match">✨</span>
          </div>

          <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--purple)' }}>
            STYLE MATCH
          </p>

          <h1 className="text-2xl font-black tracking-tight mb-4" style={{ color: 'var(--text)' }}>
            STYLE ID × 骨格
          </h1>

          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-sub)' }}>
            あなたのSTYLE IDと骨格タイプを組み合わせて、
            <br />
            似合う着こなしを提案します
          </p>
        </div>

        {/* Status card */}
        <div
          className="w-full max-w-md rounded-3xl overflow-hidden mb-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div
            className="px-5 py-3"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(236,72,153,0.08) 100%)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--purple)' }}>
              現在の診断ステータス
            </p>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {/* STYLE ID row */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                  style={{ background: 'var(--purple-dim)' }}
                >
                  🪐
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>STYLE ID</p>
              </div>
              {styleInfo ? (
                <span
                  className="text-xs px-3 py-1 rounded-full font-semibold"
                  style={{ background: 'var(--purple-dim)', color: 'var(--purple)', border: '1px solid var(--border)' }}
                >
                  {styleInfo.emoji} {styleInfo.name}
                </span>
              ) : (
                <span
                  className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  取得前
                </span>
              )}
            </div>

            {/* Body type row */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                  style={{ background: 'var(--purple-dim)' }}
                >
                  🪄
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>骨格タイプ</p>
              </div>
              {bodyLabel ? (
                <span
                  className="text-xs px-3 py-1 rounded-full font-semibold"
                  style={{ background: 'var(--purple-dim)', color: 'var(--purple)', border: '1px solid var(--border)' }}
                >
                  {bodyLabel}
                </span>
              ) : (
                <span
                  className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  取得前
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Advice card */}
        {advice && (
          <div className="w-full max-w-md rounded-3xl overflow-hidden mb-6" style={{ border: '1px solid var(--border)' }}>
            {/* Header */}
            <div
              className="px-5 py-4"
              style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(236,72,153,0.10) 100%)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--purple)' }}>
                  骨格 × STYLE ID
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'var(--purple-dim)', color: 'var(--purple)', border: '1px solid var(--border)' }}
                >
                  {styleInfo!.emoji} {styleInfo!.name} × {bodyLabel}
                </span>
              </div>
              <h2 className="text-base font-black" style={{ color: 'var(--text)' }}>{advice.title}</h2>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-sub)' }}>{advice.summary}</p>
            </div>

            {/* Rows */}
            <div style={{ background: 'var(--bg-elevated)' }}>
              {/* あなたに合いそうな服 */}
              <AdviceRow label="あなたに合いそうな服" items={advice.items} variant="accent" />

              {/* 選ぶときのポイント */}
              <div style={{ borderTop: '1px solid var(--border)' }}>
                <div className="px-5 pt-4 pb-2">
                  <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--purple)' }}>
                    選ぶときのポイント
                  </p>
                </div>
                <AdviceRow label="得意なシルエット" items={advice.silhouette} />
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  <AdviceRow label="得意な素材" items={advice.materials} />
                </div>
              </div>

              {/* あまりハマりにくいかもしれない服 */}
              <div className="px-5 py-3.5" style={{ borderTop: '1px solid var(--border)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  慎重に選びたいアイテム
                </p>
                <p className="text-[10px] mb-2.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  工夫次第で着こなせることも多いので、参考程度に
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {advice.avoid.map(item => (
                    <span
                      key={item}
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.75)', border: '1px solid rgba(239,68,68,0.15)' }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* あなたに合いそうなアイテム */}
        {recommendItems && (
          <div className="w-full max-w-md mb-6">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--purple)' }}>
              あなたに合いそうなアイテム
            </p>
            <div className="flex flex-col gap-3">
              {recommendItems.map((item, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-4"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                  <h3 className="text-sm font-bold mb-1.5" style={{ color: 'var(--text)' }}>
                    {item.itemName}
                  </h3>
                  <p className="text-xs leading-relaxed mb-1.5" style={{ color: 'var(--text-sub)' }}>
                    {item.reason}
                  </p>
                  <p className="text-[11px] leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>
                    <span className="font-semibold">選ぶポイント：</span>{item.point}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {item.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'var(--purple-dim)', color: 'var(--purple)', border: '1px solid var(--border)' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className={(item.rakutenUrl || item.amazonUrl || item.usedUrl) ? 'mb-3' : ''}>
                    <p className="text-[10px] font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      検索キーワード
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.searchKeywords.map(kw => (
                        <span
                          key={kw}
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'var(--bg-subtle)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {(item.rakutenUrl || item.amazonUrl || item.usedUrl) && (
                    <RecommendItemButton
                      itemName={item.itemName}
                      styleId={styleId!}
                      bodyType={bodyType!}
                      rakutenUrl={item.rakutenUrl}
                      amazonUrl={item.amazonUrl}
                      usedUrl={item.usedUrl}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* おすすめアイテム */}
        {affiliateItems && (
          <div className="w-full max-w-md mb-6">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--purple)' }}>
                おすすめアイテム
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {affiliateItems.map(item => (
                <div
                  key={item.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                  {/* 画像プレースホルダー */}
                  <div
                    className="h-24 flex items-center justify-center text-5xl"
                    style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(236,72,153,0.08) 100%)' }}
                  >
                    {item.imageLabel}
                  </div>

                  <div className="p-4">
                    {/* カテゴリ */}
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                    >
                      {item.category}
                    </span>

                    {/* 商品名 */}
                    <h3 className="text-sm font-bold mt-2 mb-1.5" style={{ color: 'var(--text)' }}>
                      {item.itemName}
                    </h3>

                    {/* おすすめ理由 */}
                    <p className="text-xs leading-relaxed mb-1.5" style={{ color: 'var(--text-sub)' }}>
                      {item.reason}
                    </p>

                    {/* 選ぶポイント */}
                    <p className="text-[11px] leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>
                      <span className="font-semibold">選ぶポイント：</span>{item.point}
                    </p>

                    {/* タグ */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {item.tags.map(tag => (
                        <span
                          key={tag}
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'var(--purple-dim)', color: 'var(--purple)', border: '1px solid var(--border)' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* 商品を見るボタン */}
                    <AffiliateItemButton
                      itemId={item.id}
                      itemName={item.itemName}
                      styleId={styleId!}
                      bodyType={bodyType!}
                      affiliateUrl={item.affiliateUrl}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTAs: show only missing diagnoses */}
        <div className="w-full max-w-md flex flex-col gap-3">
          {!styleId && (
            <Link
              href="/style-id"
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
                boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
              }}
            >
              <span>🪐</span>
              STYLE ID診断へ
            </Link>
          )}

          {!bodyType && (
            <Link
              href="/body-type"
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all active:scale-[0.97]"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              <span>🪄</span>
              骨格診断へ
            </Link>
          )}

          {hasBoth && (
            <Link
              href="/style-id"
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all active:scale-[0.97]"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-sub)' }}
            >
              <span>🔄</span>
              診断をやり直す
            </Link>
          )}
        </div>
      </div>
    </>
  )
}
