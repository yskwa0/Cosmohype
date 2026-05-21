export type HypeTheme = {
  slug: string
  label: string
}

export const HYPE_THEMES: HypeTheme[] = [
  { slug: 'black-item',       label: '黒を1点入れたコーデ' },
  { slug: 'all-white',        label: '全身ホワイトコーデ' },
  { slug: 'vintage-mix',      label: 'ヴィンテージMIXコーデ' },
  { slug: 'denim-on-denim',   label: 'デニムオンデニム' },
  { slug: 'oversized',        label: 'オーバーサイズコーデ' },
  { slug: 'street-sporty',    label: 'ストリート×スポーティ' },
  { slug: 'natural-earthy',   label: 'ナチュラル・アース系' },
  { slug: 'monochrome',       label: 'モノトーンコーデ' },
  { slug: 'color-pop',        label: '差し色1点コーデ' },
  { slug: 'layering',         label: 'レイヤードコーデ' },
  { slug: 'pattern-mix',      label: '柄MIXコーデ' },
  { slug: 'french-casual',    label: 'フレンチカジュアル' },
  { slug: 'korean-style',     label: '韓国風コーデ' },
  { slug: 'girly-edge',       label: 'ガーリー×エッジ' },
  { slug: 'minimal-chic',     label: 'ミニマルシック' },
  { slug: 'bold-print',       label: 'ボールドプリントコーデ' },
  { slug: 'workwear-remix',   label: 'ワークウェアリミックス' },
  { slug: 'resort-mood',      label: 'リゾートムードコーデ' },
  { slug: 'dark-academia',    label: 'ダークアカデミア' },
  { slug: 'y2k-revival',      label: 'Y2Kリバイバル' },
  { slug: 'cottagecore',      label: 'コテージコア' },
  { slug: 'techwear',         label: 'テックウェア' },
  { slug: 'retro-sports',     label: 'レトロスポーツ' },
  { slug: 'soft-masc',        label: 'ソフトマスキュリン' },
  { slug: 'boho-chic',        label: 'ボヘミアンシック' },
  { slug: 'prep-cool',        label: 'プレッピー×クール' },
  { slug: 'all-pink',         label: '全身ピンクコーデ' },
  { slug: 'leather-accent',   label: 'レザーアクセントコーデ' },
  { slug: 'sneaker-style',    label: 'スニーカースタイル' },
  { slug: 'hat-required',     label: '帽子を主役にしたコーデ' },
]

/** 日本時間の日付ベースで当日テーマを返す（全ユーザー共通） */
export function getTodayHypeTheme(): HypeTheme {
  const jstDate = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const year  = jstDate.getUTCFullYear()
  const month = jstDate.getUTCMonth() + 1
  const day   = jstDate.getUTCDate()
  // YYYYMMDD を数値にしてインデックスを決定
  const seed = year * 10000 + month * 100 + day
  const index = seed % HYPE_THEMES.length
  return HYPE_THEMES[index]
}

/** slug → label の変換マップ（/post/new で使用） */
export const HYPE_THEME_MAP: Record<string, string> = Object.fromEntries(
  HYPE_THEMES.map(t => [t.slug, t.label])
)
