import type { StyleId, CompatibilityResult } from './types'

type CompatEntry = { score: number; label: string; description: string }

const COMPAT_MAP: Partial<Record<StyleId, Partial<Record<StyleId, CompatEntry>>>> = {
  COSMIC_REBEL: {
    COSMIC_REBEL: { score: 95, label: '宇宙的共鳴', description: '二人の前衛的なエネルギーが重なり、誰も見たことのないスタイルを生み出す。' },
    DARK_POET:    { score: 88, label: '闇と星の融合', description: '反逆と詩情が交わり、独特のダークファンタジーな世界観が生まれる。' },
    URBAN_EDGE:   { score: 72, label: 'ストリートの実験場', description: 'お互いの「やんちゃさ」が化学反応を起こす。衝突もあるが刺激的。' },
    SOFT_DREAMER: { score: 60, label: '対極の引力', description: '正反対の美学が引き合い、時に美しく、時に理解できない関係。' },
    MINIMAL_SOUL: { score: 55, label: '沈黙の対話', description: 'どちらも本質を追求するが、その方向性がまったく異なる。' },
    RETRO_WAVE:   { score: 70, label: 'タイムスリップコラボ', description: '未来と過去が交差する、奇妙で面白い組み合わせ。' },
    FREE_SPIRIT:  { score: 78, label: '自由の惑星', description: '二人とも型破り。一緒にいると予測不能な何かが起きる。' },
    CLASSIC_ELITE:{ score: 45, label: '異星人の出会い', description: 'スタイルの基盤が根本的に異なる。理解し合うには時間がかかる。' },
  },
  SOFT_DREAMER: {
    SOFT_DREAMER: { score: 92, label: '夢の中の約束', description: '柔らかな感性が溶け合い、ふんわりとした夢世界を共に作り出す。' },
    FREE_SPIRIT:  { score: 85, label: '花畑の散歩', description: '自然体の美しさが共鳴し、温かく心地よい空間が生まれる。' },
    RETRO_WAVE:   { score: 80, label: 'ノスタルジックロマンス', description: '懐かしさと夢想が重なり、ロマンティックな時間をともに過ごす。' },
    CLASSIC_ELITE:{ score: 75, label: '上品な夢', description: '品のある美意識が重なり、エレガントで柔らかな世界観に。' },
    MINIMAL_SOUL: { score: 65, label: '静かな共存', description: 'それぞれのこだわりがあるが、シンプルへの愛着が繋ぐ。' },
    URBAN_EDGE:   { score: 50, label: '街と花畑', description: 'スタイルは対照的。でも互いが新鮮に映る不思議な関係。' },
    DARK_POET:    { score: 68, label: '影の中の光', description: '闇と光が共存する、深みのある関係。引き合う力がある。' },
    COSMIC_REBEL: { score: 60, label: '対極の引力', description: '正反対の美学が引き合い、時に美しく、時に理解できない関係。' },
  },
  URBAN_EDGE: {
    URBAN_EDGE:   { score: 90, label: 'ダブルキング', description: 'ストリートを支配する二人。互いのスタイルを高め合う最強コンビ。' },
    RETRO_WAVE:   { score: 82, label: 'レトロストリート', description: 'ヴィンテージとストリートが融合した、トレンドの最先端。' },
    COSMIC_REBEL: { score: 72, label: 'ストリートの実験場', description: 'お互いの「やんちゃさ」が化学反応を起こす。衝突もあるが刺激的。' },
    FREE_SPIRIT:  { score: 65, label: '都市と自然の衝突', description: 'まったく異なるエネルギーだが、お互いに学べるものがある。' },
    DARK_POET:    { score: 70, label: 'ダークストリート', description: 'ハードなエッジが共鳴し、かっこよさを競い合う関係。' },
    MINIMAL_SOUL: { score: 58, label: 'ノイズとシンプル', description: 'スタイルの強度が対照的。落としどころを見つけるまで時間がかかる。' },
    SOFT_DREAMER: { score: 50, label: '街と花畑', description: 'スタイルは対照的。でも互いが新鮮に映る不思議な関係。' },
    CLASSIC_ELITE:{ score: 55, label: '教室の前と後', description: '価値観が異なるが、互いのスタイルに隠れた敬意がある。' },
  },
  CLASSIC_ELITE: {
    CLASSIC_ELITE:{ score: 95, label: '永遠の品格', description: '共通の美意識と品格が響き合い、完璧に洗練されたペアになる。' },
    MINIMAL_SOUL: { score: 88, label: '純粋の美学', description: '質へのこだわりと洗練さが共鳴する、静かで深い関係。' },
    SOFT_DREAMER: { score: 75, label: '上品な夢', description: '品のある美意識が重なり、エレガントで柔らかな世界観に。' },
    DARK_POET:    { score: 62, label: '光と影の貴族', description: '異なる美学を持ちながら、深みへの追求が共通する。' },
    FREE_SPIRIT:  { score: 48, label: '城と野原', description: 'まったく異なる価値観。でも時に自由さが城の扉を開く。' },
    COSMIC_REBEL: { score: 45, label: '異星人の出会い', description: 'スタイルの基盤が根本的に異なる。理解し合うには時間がかかる。' },
    URBAN_EDGE:   { score: 55, label: '教室の前と後', description: '価値観が異なるが、互いのスタイルに隠れた敬意がある。' },
    RETRO_WAVE:   { score: 60, label: '時代の対話', description: '過去への敬意が共通点。アプローチは違うが惹かれ合う部分がある。' },
  },
  FREE_SPIRIT: {
    FREE_SPIRIT:  { score: 93, label: '魂の共鳴', description: '二つの自由な魂が出会い、お互いをさらに解き放つ。' },
    SOFT_DREAMER: { score: 85, label: '花畑の散歩', description: '自然体の美しさが共鳴し、温かく心地よい空間が生まれる。' },
    RETRO_WAVE:   { score: 80, label: 'ヴィンテージガーデン', description: '懐かしさと自然な豊かさが重なる、温かいコラボレーション。' },
    COSMIC_REBEL: { score: 78, label: '自由の惑星', description: '二人とも型破り。一緒にいると予測不能な何かが起きる。' },
    DARK_POET:    { score: 70, label: '森の詩人', description: '自然の詩情が共鳴し、深みのある世界観を共に作る。' },
    URBAN_EDGE:   { score: 65, label: '都市と自然の衝突', description: 'まったく異なるエネルギーだが、お互いに学べるものがある。' },
    MINIMAL_SOUL: { score: 60, label: '空とシンプル', description: '自由さとシンプルさは近いようで遠い。でも共鳴する瞬間がある。' },
    CLASSIC_ELITE:{ score: 48, label: '城と野原', description: 'まったく異なる価値観。でも時に自由さが城の扉を開く。' },
  },
  DARK_POET: {
    DARK_POET:    { score: 90, label: '闇の共鳴', description: '深い感受性と美への追求が重なり、孤高の世界を共に創る。' },
    COSMIC_REBEL: { score: 88, label: '闇と星の融合', description: '反逆と詩情が交わり、独特のダークファンタジーな世界観が生まれる。' },
    FREE_SPIRIT:  { score: 70, label: '森の詩人', description: '自然の詩情が共鳴し、深みのある世界観を共に作る。' },
    URBAN_EDGE:   { score: 70, label: 'ダークストリート', description: 'ハードなエッジが共鳴し、かっこよさを競い合う関係。' },
    SOFT_DREAMER: { score: 68, label: '影の中の光', description: '闇と光が共存する、深みのある関係。引き合う力がある。' },
    RETRO_WAVE:   { score: 55, label: '夜のヴィンテージ', description: '過去への郷愁と闇が交差する、ミステリアスな関係。' },
    CLASSIC_ELITE:{ score: 62, label: '光と影の貴族', description: '異なる美学を持ちながら、深みへの追求が共通する。' },
    MINIMAL_SOUL: { score: 75, label: '沈黙の芸術家', description: '少ない言葉の中に深みを宿す二人。静けさが共鳴する。' },
  },
  RETRO_WAVE: {
    RETRO_WAVE:   { score: 94, label: 'タイムカプセル', description: '同じ時代の空気を吸い、ノスタルジアの海を共に泳ぐ。' },
    FREE_SPIRIT:  { score: 80, label: 'ヴィンテージガーデン', description: '懐かしさと自然な豊かさが重なる、温かいコラボレーション。' },
    SOFT_DREAMER: { score: 80, label: 'ノスタルジックロマンス', description: '懐かしさと夢想が重なり、ロマンティックな時間をともに過ごす。' },
    URBAN_EDGE:   { score: 82, label: 'レトロストリート', description: 'ヴィンテージとストリートが融合した、トレンドの最先端。' },
    COSMIC_REBEL: { score: 70, label: 'タイムスリップコラボ', description: '未来と過去が交差する、奇妙で面白い組み合わせ。' },
    DARK_POET:    { score: 55, label: '夜のヴィンテージ', description: '過去への郷愁と闇が交差する、ミステリアスな関係。' },
    CLASSIC_ELITE:{ score: 60, label: '時代の対話', description: '過去への敬意が共通点。アプローチは違うが惹かれ合う部分がある。' },
    MINIMAL_SOUL: { score: 52, label: '賑やかとシンプル', description: 'にぎやかなヴィンテージとミニマルは対照的。でも学び合える関係。' },
  },
  MINIMAL_SOUL: {
    MINIMAL_SOUL: { score: 96, label: '完全な静寂', description: '二つのミニマルな魂が重なり、何も足さない・何も引かない完璧な調和。' },
    CLASSIC_ELITE:{ score: 88, label: '純粋の美学', description: '質へのこだわりと洗練さが共鳴する、静かで深い関係。' },
    DARK_POET:    { score: 75, label: '沈黙の芸術家', description: '少ない言葉の中に深みを宿す二人。静けさが共鳴する。' },
    SOFT_DREAMER: { score: 65, label: '静かな共存', description: 'それぞれのこだわりがあるが、シンプルへの愛着が繋ぐ。' },
    FREE_SPIRIT:  { score: 60, label: '空とシンプル', description: '自由さとシンプルさは近いようで遠い。でも共鳴する瞬間がある。' },
    COSMIC_REBEL: { score: 55, label: '沈黙の対話', description: 'どちらも本質を追求するが、その方向性がまったく異なる。' },
    RETRO_WAVE:   { score: 52, label: '賑やかとシンプル', description: 'にぎやかなヴィンテージとミニマルは対照的。でも学び合える関係。' },
    URBAN_EDGE:   { score: 58, label: 'ノイズとシンプル', description: 'スタイルの強度が対照的。落としどころを見つけるまで時間がかかる。' },
  },
}

export function getCompatibility(styleA: StyleId, styleB: StyleId): CompatibilityResult {
  const entry =
    COMPAT_MAP[styleA]?.[styleB] ??
    COMPAT_MAP[styleB]?.[styleA] ??
    { score: 60, label: '未知の相性', description: '異なるスタイルが交差する未知の領域。新しい発見があるかも。' }

  return { styleA, styleB, ...entry }
}
