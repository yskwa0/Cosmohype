'use client'

import { useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import type { StyleId } from '@/lib/style-id/types'

// ---------------------------------------------------------------------------
// 表示フラグ: false = Coming Soon のまま / true = コンテンツ表示
// ---------------------------------------------------------------------------

const SHOW_STYLE_PLANET_CONTENT = false

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

type Gender    = 'ladies' | 'mens'
type ItemGender = 'mens' | 'womens' | 'unisex'

type CategoryDef = {
  id: string
  label: string
  parent_id: string | null  // null = 大カテゴリ
  genders: Gender[]         // 表示対象のジェンダー
}

type ListingStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'hidden'

type Brand = {
  id: string
  name: string
  description: string | null
  logo_url: string | null
  cover_url: string | null
  instagram_url: string | null
  website_url: string | null
  style_tags: string[]
  recommended_style_ids: StyleId[]
  status: ListingStatus
  is_partner: boolean
  display_order: number
  created_at: string
  updated_at: string
}

type BrandItem = {
  id: string
  brand_id: string
  name: string
  description: string | null
  image_url: string | null
  price: number | null
  product_url: string | null
  category_id: string
  gender: ItemGender
  recommended_style_ids: StyleId[]
  status: ListingStatus
  is_sponsored: boolean
  display_order: number
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// カテゴリ定義（大カテゴリ → 小カテゴリ のフラット一覧）
// ---------------------------------------------------------------------------

const CATEGORIES: CategoryDef[] = [
  // ── 大カテゴリ ──
  { id: 'tops',      label: 'トップス',     parent_id: null, genders: ['ladies', 'mens'] },
  { id: 'outer',     label: 'アウター',     parent_id: null, genders: ['ladies', 'mens'] },
  { id: 'pants',     label: 'パンツ',       parent_id: null, genders: ['ladies', 'mens'] },
  { id: 'skirt',     label: 'スカート',     parent_id: null, genders: ['ladies'] },
  { id: 'shoes',     label: 'シューズ',     parent_id: null, genders: ['ladies', 'mens'] },
  { id: 'bag',       label: 'バッグ',       parent_id: null, genders: ['ladies', 'mens'] },
  { id: 'accessory', label: 'アクセサリー', parent_id: null, genders: ['ladies', 'mens'] },

  // ── トップス ──
  { id: 'tops-short-sleeve', label: '半袖',          parent_id: 'tops', genders: ['ladies', 'mens'] },
  { id: 'tops-long-sleeve',  label: '長袖',          parent_id: 'tops', genders: ['ladies', 'mens'] },
  { id: 'tops-sheer',        label: 'シアートップス', parent_id: 'tops', genders: ['ladies'] },
  { id: 'tops-knit',         label: 'ニット',         parent_id: 'tops', genders: ['ladies', 'mens'] },
  { id: 'tops-shirt',        label: 'シャツ',         parent_id: 'tops', genders: ['ladies', 'mens'] },
  { id: 'tops-camisole',     label: 'キャミソール',   parent_id: 'tops', genders: ['ladies'] },
  { id: 'tops-hoodie',       label: 'パーカー',       parent_id: 'tops', genders: ['mens'] },

  // ── アウター ──
  { id: 'outer-jacket',         label: 'ジャケット',         parent_id: 'outer', genders: ['ladies', 'mens'] },
  { id: 'outer-coat',           label: 'コート',             parent_id: 'outer', genders: ['ladies', 'mens'] },
  { id: 'outer-blouson',        label: 'ブルゾン',           parent_id: 'outer', genders: ['ladies', 'mens'] },
  { id: 'outer-cardigan',       label: 'カーディガン',       parent_id: 'outer', genders: ['ladies'] },
  { id: 'outer-mountain-parka', label: 'マウンテンパーカー', parent_id: 'outer', genders: ['mens'] },

  // ── パンツ ──
  { id: 'pants-denim',    label: 'デニム',       parent_id: 'pants', genders: ['ladies', 'mens'] },
  { id: 'pants-cargo',    label: 'カーゴ',       parent_id: 'pants', genders: ['ladies', 'mens'] },
  { id: 'pants-slacks',   label: 'スラックス',   parent_id: 'pants', genders: ['ladies', 'mens'] },
  { id: 'pants-wide',     label: 'ワイドパンツ', parent_id: 'pants', genders: ['ladies', 'mens'] },
  { id: 'pants-leggings', label: 'レギンス',     parent_id: 'pants', genders: ['ladies'] },
  { id: 'pants-jogger',   label: 'ジョガーパンツ', parent_id: 'pants', genders: ['mens'] },

  // ── スカート ──
  { id: 'skirt-mini',    label: 'ミニスカート',   parent_id: 'skirt', genders: ['ladies'] },
  { id: 'skirt-midi',    label: 'ミディスカート', parent_id: 'skirt', genders: ['ladies'] },
  { id: 'skirt-maxi',    label: 'マキシスカート', parent_id: 'skirt', genders: ['ladies'] },
  { id: 'skirt-pleated', label: 'プリーツスカート', parent_id: 'skirt', genders: ['ladies'] },

  // ── シューズ ──
  { id: 'shoes-sneakers', label: 'スニーカー', parent_id: 'shoes', genders: ['ladies', 'mens'] },
  { id: 'shoes-boots',    label: 'ブーツ',     parent_id: 'shoes', genders: ['ladies', 'mens'] },
  { id: 'shoes-loafers',  label: 'ローファー', parent_id: 'shoes', genders: ['ladies', 'mens'] },
  { id: 'shoes-sandals',  label: 'サンダル',   parent_id: 'shoes', genders: ['ladies', 'mens'] },
  { id: 'shoes-pumps',    label: 'パンプス',   parent_id: 'shoes', genders: ['ladies'] },

  // ── バッグ ──
  { id: 'bag-mini',     label: 'ミニバッグ',   parent_id: 'bag', genders: ['ladies', 'mens'] },
  { id: 'bag-tote',     label: 'トート',       parent_id: 'bag', genders: ['ladies', 'mens'] },
  { id: 'bag-shoulder', label: 'ショルダー',   parent_id: 'bag', genders: ['ladies', 'mens'] },
  { id: 'bag-clutch',   label: 'クラッチ',     parent_id: 'bag', genders: ['ladies'] },
  { id: 'bag-backpack', label: 'バックパック', parent_id: 'bag', genders: ['mens'] },

  // ── アクセサリー ──
  { id: 'accessory-necklace', label: 'ネックレス', parent_id: 'accessory', genders: ['ladies', 'mens'] },
  { id: 'accessory-ring',     label: 'リング',     parent_id: 'accessory', genders: ['ladies', 'mens'] },
  { id: 'accessory-earring',  label: 'イヤリング', parent_id: 'accessory', genders: ['ladies'] },
  { id: 'accessory-belt',     label: 'ベルト',     parent_id: 'accessory', genders: ['ladies', 'mens'] },
  { id: 'accessory-hat',      label: 'ハット',     parent_id: 'accessory', genders: ['ladies', 'mens'] },
  { id: 'accessory-cap',      label: 'キャップ',   parent_id: 'accessory', genders: ['mens'] },
]

// ── カテゴリ検索ヘルパー ──
const getMainCategories = (gender: Gender) =>
  CATEGORIES.filter(c => c.parent_id === null && c.genders.includes(gender))

const getSubcategories = (mainId: string, gender: Gender) =>
  CATEGORIES.filter(c => c.parent_id === mainId && c.genders.includes(gender))

const getChildIds = (mainId: string) =>
  CATEGORIES.filter(c => c.parent_id === mainId).map(c => c.id)

// ---------------------------------------------------------------------------
// データ（将来はDBまたはAPIから取得する）
// ---------------------------------------------------------------------------

const brands: Brand[] = [
  {
    id: 'brand-001',
    name: 'LUNA WEAR',
    description: '月のようにクリーンで静かなミニマルスタイル。余白と素材感を大切にしたコレクション。',
    logo_url: null,
    cover_url: null,
    instagram_url: null,
    website_url: null,
    style_tags: ['ミニマル', 'クリーン', 'モノトーン'],
    recommended_style_ids: ['MINIMAL_SOUL', 'SOFT_DREAMER', 'CLASSIC_ELITE'],
    status: 'approved',
    is_partner: true,
    display_order: 1,
    created_at: '2026-06-01',
    updated_at: '2026-06-01',
  },
  {
    id: 'brand-002',
    name: 'NOVA STREET',
    description: 'Y2Kとストリートを融合させたエッジなブランド。メタリック素材と大胆なシルエットが特徴。',
    logo_url: null,
    cover_url: null,
    instagram_url: null,
    website_url: null,
    style_tags: ['ストリート', 'Y2K', 'エッジ'],
    recommended_style_ids: ['COSMIC_REBEL', 'URBAN_EDGE', 'RETRO_WAVE'],
    status: 'approved',
    is_partner: true,
    display_order: 2,
    created_at: '2026-06-01',
    updated_at: '2026-06-01',
  },
  {
    id: 'brand-003',
    name: 'ORBIT MODE',
    description: '黒を基調としたモードで大人なスタイル。構築的なシルエットと上質な素材感にこだわる。',
    logo_url: null,
    cover_url: null,
    instagram_url: null,
    website_url: null,
    style_tags: ['モード', 'ブラック', '大人'],
    recommended_style_ids: ['DARK_POET', 'MINIMAL_SOUL', 'URBAN_EDGE'],
    status: 'approved',
    is_partner: false,
    display_order: 3,
    created_at: '2026-06-01',
    updated_at: '2026-06-01',
  },
]

const brandItems: BrandItem[] = [
  // ── unisex ──
  {
    id: 'item-001',
    brand_id: 'brand-001',
    name: 'ルーズジャケット',
    description: 'オーバーサイズで着こなすクリーンなテーラードジャケット。',
    image_url: null,
    price: null,
    product_url: null,
    category_id: 'outer-jacket',
    gender: 'unisex',
    recommended_style_ids: ['MINIMAL_SOUL', 'CLASSIC_ELITE'],
    status: 'approved',
    is_sponsored: false,
    display_order: 1,
    created_at: '2026-06-01',
    updated_at: '2026-06-01',
  },
  {
    id: 'item-002',
    brand_id: 'brand-001',
    name: 'ミニマルスニーカー',
    description: 'ロゴを排したクリーンなデザインのレザースニーカー。',
    image_url: null,
    price: null,
    product_url: null,
    category_id: 'shoes-sneakers',
    gender: 'unisex',
    recommended_style_ids: ['MINIMAL_SOUL', 'CLASSIC_ELITE', 'SOFT_DREAMER'],
    status: 'approved',
    is_sponsored: false,
    display_order: 2,
    created_at: '2026-06-01',
    updated_at: '2026-06-01',
  },
  // ── womens ──
  {
    id: 'item-003',
    brand_id: 'brand-001',
    name: 'シアートップス',
    description: '透け感が上品なシアー素材のプルオーバー。インナー次第で表情が変わる。',
    image_url: null,
    price: null,
    product_url: null,
    category_id: 'tops-sheer',
    gender: 'womens',
    recommended_style_ids: ['SOFT_DREAMER', 'MINIMAL_SOUL'],
    status: 'approved',
    is_sponsored: false,
    display_order: 3,
    created_at: '2026-06-01',
    updated_at: '2026-06-01',
  },
  {
    id: 'item-004',
    brand_id: 'brand-002',
    name: 'メタリックミニバッグ',
    description: 'シルバーのメタリック素材が目を引くコンパクトバッグ。',
    image_url: null,
    price: null,
    product_url: null,
    category_id: 'bag-mini',
    gender: 'womens',
    recommended_style_ids: ['COSMIC_REBEL', 'RETRO_WAVE'],
    status: 'approved',
    is_sponsored: false,
    display_order: 4,
    created_at: '2026-06-01',
    updated_at: '2026-06-01',
  },
  // ── mens ──
  {
    id: 'item-005',
    brand_id: 'brand-002',
    name: 'テックブルゾン',
    description: 'ストリートとスポーツを融合させた機能的なブルゾン。',
    image_url: null,
    price: null,
    product_url: null,
    category_id: 'outer-blouson',
    gender: 'mens',
    recommended_style_ids: ['URBAN_EDGE', 'COSMIC_REBEL'],
    status: 'approved',
    is_sponsored: false,
    display_order: 5,
    created_at: '2026-06-01',
    updated_at: '2026-06-01',
  },
  {
    id: 'item-006',
    brand_id: 'brand-003',
    name: 'ワイドスラックス',
    description: 'モードなシルエットのワイドシルエットスラックス。上質な素材感が特徴。',
    image_url: null,
    price: null,
    product_url: null,
    category_id: 'pants-slacks',
    gender: 'mens',
    recommended_style_ids: ['DARK_POET', 'MINIMAL_SOUL'],
    status: 'approved',
    is_sponsored: false,
    display_order: 6,
    created_at: '2026-06-01',
    updated_at: '2026-06-01',
  },
]

// ---------------------------------------------------------------------------
// タブ定義
// ---------------------------------------------------------------------------

type Tab = 'items' | 'category' | 'brands'

const TABS: { key: Tab; label: string }[] = [
  { key: 'items',    label: 'おすすめ' },
  { key: 'category', label: 'アイテム別' },
  { key: 'brands',   label: 'ブランド' },
]

// ---------------------------------------------------------------------------
// カテゴリアイコン（大カテゴリid で分岐）
// ---------------------------------------------------------------------------

function CategoryIcon({ categoryId }: { categoryId: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={26}
      height={26}
      fill="none"
      stroke="#34D399"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {categoryId === 'tops' && (
        <path d="M9 4 Q10 7 12 7 Q14 7 15 4 L21 7 L19 11 L16 10 L16 21 L8 21 L8 10 L5 11 L3 7 Z" />
      )}
      {categoryId === 'outer' && (
        <>
          <path d="M9 3 L3 8 L7 9 L7 21 L17 21 L17 9 L21 8 L15 3" />
          <path d="M9 3 Q10.5 6 12 7 Q13.5 6 15 3" />
          <line x1={12} y1={10} x2={12} y2={17} />
        </>
      )}
      {categoryId === 'pants' && (
        <path d="M6 5 L18 5 L17 22 L13 22 L12 15 L11 22 L7 22 Z" />
      )}
      {categoryId === 'skirt' && (
        <path d="M7 6 L17 6 L20 21 L4 21 Z" />
      )}
      {categoryId === 'shoes' && (
        <>
          <path d="M3 18 Q3 14 8 14 L15 14 Q19 13 21 11 L19 10 Q18 13 15 14" />
          <path d="M3 18 L21 18 Q22 18 22 17 L22 15 Q22 14 21 14 L15 14" />
        </>
      )}
      {categoryId === 'bag' && (
        <>
          <rect x={5} y={9} width={14} height={13} rx={2} />
          <path d="M9 9 Q9 5 12 5 Q15 5 15 9" />
        </>
      )}
      {categoryId === 'accessory' && (
        <path d="M12 2 L13.2 9 L20 10.5 L13.2 12 L12 19 L10.8 12 L4 10.5 L10.8 9 Z" />
      )}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// アイテムカード
// ---------------------------------------------------------------------------

function ItemImagePlaceholder() {
  return (
    <div
      className="w-full aspect-square flex items-center justify-center"
      style={{ background: 'linear-gradient(145deg, #0A1A12 0%, #064E3B 60%, #065F46 100%)' }}
    >
      <svg viewBox="0 0 40 40" width={28} height={28} aria-hidden>
        <circle cx={20} cy={20} r={8} fill="#065F46" />
        <ellipse cx={20} cy={20} rx={16} ry={5} fill="none" stroke="#6EE7B7" strokeWidth={1.2} opacity={0.55} transform="rotate(-22 20 20)" />
        <circle cx={20} cy={20} r={5} fill="#10B981" opacity={0.85} />
        <ellipse cx={17} cy={18} rx={2} ry={1.5} fill="#A7F3D0" opacity={0.4} />
      </svg>
    </div>
  )
}

function ItemCard({ item }: { item: BrandItem }) {
  const brand = brands.find(b => b.id === item.brand_id)
  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {item.image_url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={item.image_url} alt={item.name} className="w-full aspect-square object-cover" />
        : <ItemImagePlaceholder />
      }
      <div className="p-3 flex flex-col gap-0.5">
        <p className="text-xs font-bold leading-snug line-clamp-2" style={{ color: 'var(--text)' }}>
          {item.name}
        </p>
        {brand && (
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{brand.name}</p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// アイテム別タブ
// ---------------------------------------------------------------------------

function CategoryTab() {
  const [gender, setGender]           = useState<Gender>('ladies')
  const [selectedMainId, setSelectedMainId] = useState<string | null>(null)
  const [selectedSubId, setSelectedSubId]   = useState<string | null>(null)

  const mainCategories = getMainCategories(gender)
  const subcategories  = selectedMainId ? getSubcategories(selectedMainId, gender) : []

  const currentMain = selectedMainId
    ? CATEGORIES.find(c => c.id === selectedMainId)
    : null

  const matchesGender = (item: BrandItem) =>
    item.gender === 'unisex' ||
    (gender === 'ladies' && item.gender === 'womens') ||
    (gender === 'mens'   && item.gender === 'mens')

  const filteredItems = (() => {
    if (!selectedMainId) return []
    const approvedItems = brandItems.filter(item => item.status === 'approved')
    if (selectedSubId) {
      return approvedItems.filter(item => item.category_id === selectedSubId && matchesGender(item))
    }
    const childIds = getChildIds(selectedMainId)
    return approvedItems.filter(item => childIds.includes(item.category_id) && matchesGender(item))
  })()

  const handleGenderChange = (g: Gender) => {
    setGender(g)
    setSelectedMainId(null)
    setSelectedSubId(null)
  }

  const handleMainSelect = (id: string) => {
    setSelectedMainId(id)
    setSelectedSubId(null)
  }

  const handleBack = () => {
    setSelectedMainId(null)
    setSelectedSubId(null)
  }

  const chipStyle = (active: boolean): React.CSSProperties =>
    active
      ? { background: 'rgba(52,211,153,0.14)', color: '#34D399', border: '1px solid rgba(52,211,153,0.35)' }
      : { background: 'var(--card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }

  return (
    <div>
      {/* メンズ / レディース トグル */}
      <div
        className="flex rounded-xl p-0.5 mb-5"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {(['ladies', 'mens'] as Gender[]).map(g => (
          <button
            key={g}
            onClick={() => handleGenderChange(g)}
            className="flex-1 text-xs font-semibold py-2 rounded-[10px] transition-colors"
            style={
              gender === g
                ? { background: 'rgba(52,211,153,0.15)', color: '#34D399' }
                : { background: 'transparent', color: 'var(--text-muted)' }
            }
          >
            {g === 'ladies' ? 'レディース' : 'メンズ'}
          </button>
        ))}
      </div>

      {/* 大カテゴリグリッド */}
      {!selectedMainId && (
        <div className="grid grid-cols-4 gap-2.5">
          {mainCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleMainSelect(cat.id)}
              className="flex flex-col items-center gap-2 py-3.5 rounded-2xl transition-colors"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <CategoryIcon categoryId={cat.id} />
              <span className="text-[10px] font-semibold leading-tight" style={{ color: 'var(--text)' }}>
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 小カテゴリ + アイテム */}
      {selectedMainId && (
        <div>
          {/* ヘッダー */}
          <div className="flex items-center gap-2.5 mb-4">
            <button
              onClick={handleBack}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-xl"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              ← 戻る
            </button>
            <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>
              {currentMain?.label}
            </span>
          </div>

          {/* 小カテゴリチップ */}
          <div className="flex flex-wrap gap-2 mb-5">
            <button
              onClick={() => setSelectedSubId(null)}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-full transition-colors"
              style={chipStyle(selectedSubId === null)}
            >
              すべて
            </button>
            {subcategories.map(sub => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubId(sub.id)}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-full transition-colors"
                style={chipStyle(selectedSubId === sub.id)}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* アイテムグリッド */}
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredItems.map(item => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 pt-12 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                このカテゴリはまだ準備中です
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ページ
// ---------------------------------------------------------------------------

export default function StylePlanetPage() {
  const [activeTab, setActiveTab] = useState<Tab>('items')

  return (
    <>
      <TopBar title="STYLE PLANET" left={<BackButton variant="purple" />} />
      <div className="pb-24">

        {/* Coming Soon */}
        {!SHOW_STYLE_PLANET_CONTENT && (
          <div className="px-4 flex flex-col items-center gap-5 pt-20 text-center">
            <svg viewBox="0 0 80 80" width={72} height={72} aria-hidden>
              <circle cx={40} cy={40} r={14} fill="#065F46" opacity={0.95} />
              <ellipse cx={40} cy={40} rx={28} ry={9} fill="none" stroke="#6EE7B7" strokeWidth={1.8} opacity={0.65} transform="rotate(-22 40 40)" />
              <circle cx={40} cy={40} r={9} fill="#10B981" opacity={0.9} />
              <ellipse cx={35} cy={36} rx={3} ry={2.5} fill="#A7F3D0" opacity={0.45} />
              <circle cx={18} cy={22} r={1.5} fill="white" opacity={0.25} />
              <circle cx={62} cy={56} r={1} fill="white" opacity={0.2} />
              <circle cx={65} cy={20} r={1.2} fill="#FCD34D" opacity={0.5} />
            </svg>
            <span
              className="text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full"
              style={{
                background: 'rgba(52,211,153,0.12)',
                color: '#34D399',
                border: '1px solid rgba(52,211,153,0.3)',
              }}
            >
              Coming Soon
            </span>
            <div className="flex flex-col gap-2">
              <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>準備中です</h2>
              <p className="text-sm leading-relaxed max-w-[260px]" style={{ color: 'var(--text-muted)' }}>
                STYLE PLANETでは、あなたに合いそうな服やブランドを発見・探索できるようになります。もうしばらくお待ちください。
              </p>
            </div>
          </div>
        )}

        {/* コンテンツ */}
        {SHOW_STYLE_PLANET_CONTENT && (
          <>
            {/* タブ */}
            <div
              className="flex gap-2 px-4 pt-4 pb-3 sticky top-0 z-10"
              style={{ background: 'var(--background)' }}
            >
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex-1 text-[11px] font-semibold py-2.5 rounded-xl transition-colors"
                  style={
                    activeTab === tab.key
                      ? { background: 'rgba(52,211,153,0.14)', color: '#34D399', border: '1px solid rgba(52,211,153,0.35)' }
                      : { background: 'var(--card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="px-4 pt-1">

              {/* おすすめアイテム */}
              {activeTab === 'items' && (
                <div className="grid grid-cols-2 gap-3">
                  {brandItems.filter(item => item.status === 'approved').map(item => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              )}

              {/* アイテム別 */}
              {activeTab === 'category' && <CategoryTab />}

              {/* ブランド一覧 */}
              {activeTab === 'brands' && (
                <div className="flex flex-col gap-3">
                  {brands.filter(brand => brand.status === 'approved').map(brand => (
                    <div
                      key={brand.id}
                      className="rounded-2xl p-4 flex flex-col gap-2.5"
                      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)' }}
                        >
                          <span className="text-[11px] font-bold" style={{ color: '#34D399' }}>
                            {brand.name.charAt(0)}
                          </span>
                        </div>
                        <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{brand.name}</p>
                      </div>
                      {brand.description && (
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          {brand.description}
                        </p>
                      )}
                      {brand.style_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {brand.style_tags.map(tag => (
                            <span
                              key={tag}
                              className="text-[10px] px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--purple)', border: '1px solid rgba(124,58,237,0.2)' }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          </>
        )}

      </div>
    </>
  )
}
