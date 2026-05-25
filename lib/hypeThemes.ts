export type HypeTheme = {
  slug: string
  label: string
}

export const HYPE_THEMES: HypeTheme[] = [
  { slug: 'street',        label: 'ストリート' },
  { slug: 'casual',        label: 'カジュアル' },
  { slug: 'feminine',      label: 'フェミニン' },
  { slug: 'mode',          label: 'モード' },
  { slug: 'minimal',       label: 'ミニマル' },
  { slug: 'korean',        label: '韓国風' },
  { slug: 'y2k',           label: 'Y2K' },
  { slug: 'vintage',       label: '古着' },
  { slug: 'kirei',         label: 'きれいめ' },
  { slug: 'techwear',      label: 'テック' },
  { slug: 'sporty',        label: 'スポーティ' },
  { slug: 'girly',         label: 'ガーリー' },
  { slug: 'monotone',      label: 'モノトーン' },
  { slug: 'natural',       label: 'ナチュラル' },
  { slug: 'bohemian',      label: 'ボヘミアン' },
  { slug: 'preppy',        label: 'プレッピー' },
  { slug: 'retro',         label: 'レトロ' },
  { slug: 'edgy',          label: 'エッジー' },
  { slug: 'oversized',     label: 'オーバーサイズ' },
  { slug: 'layered',       label: 'レイヤード' },
  { slug: 'resort',        label: 'リゾート' },
  { slug: 'dark',          label: 'ダーク' },
  { slug: 'french',        label: 'フレンチ' },
  { slug: 'workwear',      label: 'ワークウェア' },
  { slug: 'allwhite',      label: '全白コーデ' },
  { slug: 'allblack',      label: '全黒コーデ' },
  { slug: 'denim',         label: 'デニム' },
  { slug: 'leather',       label: 'レザー' },
  { slug: 'sneakers',      label: 'スニーカー主役' },
  { slug: 'colorful',      label: 'カラフル' },
]

/** 日本時間の日付ベースで当日テーマを返す（全ユーザー共通） */
export function getTodayHypeTheme(): HypeTheme {
  const jstDate = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const year  = jstDate.getUTCFullYear()
  const month = jstDate.getUTCMonth() + 1
  const day   = jstDate.getUTCDate()
  const seed = year * 10000 + month * 100 + day
  const index = seed % HYPE_THEMES.length
  return HYPE_THEMES[index]
}

/** slug → label の変換マップ（/post/new で使用） */
export const HYPE_THEME_MAP: Record<string, string> = Object.fromEntries(
  HYPE_THEMES.map(t => [t.slug, t.label])
)
