import type { Question } from './types'

export const QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: '普段の服装で一番近い雰囲気は？',
    options: [
      { text: 'ストリート',  scores: { URBAN_EDGE: 3, COSMIC_REBEL: 2, RETRO_WAVE: 1 } },
      { text: 'きれいめ',   scores: { CLASSIC_ELITE: 3, MINIMAL_SOUL: 2 } },
      { text: 'カジュアル', scores: { FREE_SPIRIT: 3, SOFT_DREAMER: 2 } },
      { text: 'モード',     scores: { DARK_POET: 3, MINIMAL_SOUL: 2, COSMIC_REBEL: 1 } },
    ],
  },
  {
    id: 'q2',
    text: 'コーデで一番大事にしたいことは？',
    options: [
      { text: '動きやすさ', scores: { FREE_SPIRIT: 3, URBAN_EDGE: 2 } },
      { text: 'おしゃれ感', scores: { CLASSIC_ELITE: 3, MINIMAL_SOUL: 2, RETRO_WAVE: 1 } },
      { text: '個性',       scores: { COSMIC_REBEL: 3, DARK_POET: 2 } },
      { text: '清潔感',     scores: { MINIMAL_SOUL: 3, CLASSIC_ELITE: 2, SOFT_DREAMER: 1 } },
    ],
  },
  {
    id: 'q3',
    text: 'よく選ぶ色は？',
    options: [
      { text: '黒・白・グレー',    scores: { MINIMAL_SOUL: 3, DARK_POET: 2, URBAN_EDGE: 1 } },
      { text: 'ベージュ・ブラウン', scores: { FREE_SPIRIT: 3, CLASSIC_ELITE: 2, SOFT_DREAMER: 1 } },
      { text: 'カラフル',          scores: { RETRO_WAVE: 3, COSMIC_REBEL: 2, SOFT_DREAMER: 1 } },
      { text: 'ネイビー・ブルー系', scores: { CLASSIC_ELITE: 3, MINIMAL_SOUL: 2, URBAN_EDGE: 1 } },
    ],
  },
  {
    id: 'q4',
    text: '好きなシルエットは？',
    options: [
      { text: 'ゆったり',       scores: { FREE_SPIRIT: 3, URBAN_EDGE: 2, RETRO_WAVE: 1 } },
      { text: 'ジャストサイズ', scores: { MINIMAL_SOUL: 3, CLASSIC_ELITE: 2 } },
      { text: '細め',           scores: { DARK_POET: 3, CLASSIC_ELITE: 2, MINIMAL_SOUL: 1 } },
      { text: 'メリハリがある', scores: { COSMIC_REBEL: 3, RETRO_WAVE: 2, SOFT_DREAMER: 1 } },
    ],
  },
  {
    id: 'q5',
    text: 'コーデの主役にしたいものは？',
    options: [
      { text: 'トップス',         scores: { URBAN_EDGE: 3, FREE_SPIRIT: 2, RETRO_WAVE: 1 } },
      { text: 'パンツ・スカート', scores: { CLASSIC_ELITE: 3, MINIMAL_SOUL: 2, SOFT_DREAMER: 1 } },
      { text: '靴',               scores: { DARK_POET: 3, URBAN_EDGE: 2, COSMIC_REBEL: 1 } },
      { text: '小物・バッグ',     scores: { COSMIC_REBEL: 3, RETRO_WAVE: 2, SOFT_DREAMER: 1 } },
    ],
  },
  {
    id: 'q6',
    text: '好きな素材感は？',
    options: [
      { text: 'デニム',                  scores: { FREE_SPIRIT: 3, RETRO_WAVE: 2, URBAN_EDGE: 1 } },
      { text: 'レザー',                  scores: { DARK_POET: 3, URBAN_EDGE: 2, COSMIC_REBEL: 1 } },
      { text: 'ニット',                  scores: { SOFT_DREAMER: 3, FREE_SPIRIT: 2, CLASSIC_ELITE: 1 } },
      { text: 'ナイロン・スポーティー素材', scores: { URBAN_EDGE: 3, COSMIC_REBEL: 2, MINIMAL_SOUL: 1 } },
    ],
  },
  {
    id: 'q7',
    text: '服を買う時に重視することは？',
    options: [
      { text: '着回しやすさ',     scores: { MINIMAL_SOUL: 3, CLASSIC_ELITE: 2 } },
      { text: 'トレンド感',       scores: { URBAN_EDGE: 3, RETRO_WAVE: 2, SOFT_DREAMER: 1 } },
      { text: 'ブランド感',       scores: { CLASSIC_ELITE: 3, DARK_POET: 2, MINIMAL_SOUL: 1 } },
      { text: '人と被らないこと', scores: { COSMIC_REBEL: 3, DARK_POET: 2, FREE_SPIRIT: 1 } },
    ],
  },
  {
    id: 'q8',
    text: '好きなコーデの印象は？',
    options: [
      { text: 'ラフで自然',     scores: { FREE_SPIRIT: 3, SOFT_DREAMER: 2 } },
      { text: '大人っぽい',     scores: { CLASSIC_ELITE: 3, DARK_POET: 2, MINIMAL_SOUL: 1 } },
      { text: '目を引く',       scores: { COSMIC_REBEL: 3, URBAN_EDGE: 2, RETRO_WAVE: 1 } },
      { text: 'シンプルで洗練', scores: { MINIMAL_SOUL: 3, CLASSIC_ELITE: 2 } },
    ],
  },
  {
    id: 'q9',
    text: '休日に着たい服は？',
    options: [
      { text: 'パーカーやスウェット',    scores: { URBAN_EDGE: 3, FREE_SPIRIT: 2 } },
      { text: 'シャツやジャケット',      scores: { CLASSIC_ELITE: 3, MINIMAL_SOUL: 2 } },
      { text: '古着・個性派アイテム',    scores: { RETRO_WAVE: 3, COSMIC_REBEL: 2, DARK_POET: 1 } },
      { text: 'ワンピースやセットアップ', scores: { SOFT_DREAMER: 3, FREE_SPIRIT: 2 } },
    ],
  },
  {
    id: 'q10',
    text: '靴を選ぶなら？',
    options: [
      { text: 'スニーカー',               scores: { URBAN_EDGE: 3, RETRO_WAVE: 2, FREE_SPIRIT: 1 } },
      { text: 'ローファー・革靴',         scores: { CLASSIC_ELITE: 3, MINIMAL_SOUL: 2, DARK_POET: 1 } },
      { text: 'ブーツ',                   scores: { DARK_POET: 3, COSMIC_REBEL: 2, RETRO_WAVE: 1 } },
      { text: 'サンダル・抜け感のある靴', scores: { FREE_SPIRIT: 3, SOFT_DREAMER: 2 } },
    ],
  },
  {
    id: 'q11',
    text: '小物の使い方は？',
    options: [
      { text: 'あまり使わない',           scores: { MINIMAL_SOUL: 3, DARK_POET: 2 } },
      { text: 'さりげなく使う',           scores: { CLASSIC_ELITE: 3, MINIMAL_SOUL: 2, FREE_SPIRIT: 1 } },
      { text: 'コーデのポイントにする',   scores: { URBAN_EDGE: 3, RETRO_WAVE: 2, SOFT_DREAMER: 1 } },
      { text: '帽子やアクセで個性を出す', scores: { COSMIC_REBEL: 3, DARK_POET: 2, RETRO_WAVE: 1 } },
    ],
  },
  {
    id: 'q12',
    text: '投稿するならどんな写真が好き？',
    options: [
      { text: '全身コーデ',         scores: { CLASSIC_ELITE: 3, MINIMAL_SOUL: 2, SOFT_DREAMER: 1 } },
      { text: '鏡越しコーデ',       scores: { URBAN_EDGE: 3, RETRO_WAVE: 2 } },
      { text: '街中スナップ風',     scores: { FREE_SPIRIT: 3, URBAN_EDGE: 2 } },
      { text: 'アイテム寄りの写真', scores: { MINIMAL_SOUL: 3, DARK_POET: 2, COSMIC_REBEL: 1 } },
    ],
  },
  {
    id: 'q13',
    text: '憧れるファッションの方向性は？',
    options: [
      { text: '韓国っぽい',              scores: { SOFT_DREAMER: 3, URBAN_EDGE: 2, MINIMAL_SOUL: 1 } },
      { text: '海外ストリート',          scores: { URBAN_EDGE: 3, RETRO_WAVE: 2, FREE_SPIRIT: 1 } },
      { text: '雑誌っぽいモード',        scores: { DARK_POET: 3, COSMIC_REBEL: 2, CLASSIC_ELITE: 1 } },
      { text: 'ナチュラルで親しみやすい', scores: { FREE_SPIRIT: 3, SOFT_DREAMER: 2 } },
    ],
  },
  {
    id: 'q14',
    text: 'コーデで避けたいことは？',
    options: [
      { text: '派手すぎる',         scores: { MINIMAL_SOUL: 3, CLASSIC_ELITE: 2, SOFT_DREAMER: 1 } },
      { text: '地味すぎる',         scores: { RETRO_WAVE: 3, COSMIC_REBEL: 2, URBAN_EDGE: 1 } },
      { text: '子どもっぽく見える', scores: { CLASSIC_ELITE: 3, DARK_POET: 2, MINIMAL_SOUL: 1 } },
      { text: '量産型っぽく見える', scores: { COSMIC_REBEL: 3, FREE_SPIRIT: 2, DARK_POET: 1 } },
    ],
  },
  {
    id: 'q15',
    text: '自分のファッションを一言で言うなら？',
    options: [
      { text: '自然体', scores: { FREE_SPIRIT: 3, SOFT_DREAMER: 2 } },
      { text: '都会的', scores: { URBAN_EDGE: 3, CLASSIC_ELITE: 2, MINIMAL_SOUL: 1 } },
      { text: '個性的', scores: { COSMIC_REBEL: 3, DARK_POET: 2, RETRO_WAVE: 1 } },
      { text: '上品',   scores: { CLASSIC_ELITE: 3, MINIMAL_SOUL: 2, SOFT_DREAMER: 1 } },
    ],
  },
]
