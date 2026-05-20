import type { Question } from './types'

export const QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: 'つい目が行くのは？',
    options: [
      { text: '着こなし',      scores: { CLASSIC_ELITE: 3, MINIMAL_SOUL: 2 } },
      { text: '素材感',        scores: { MINIMAL_SOUL: 3, FREE_SPIRIT: 2, DARK_POET: 1 } },
      { text: 'かわいさ',      scores: { SOFT_DREAMER: 3, RETRO_WAVE: 1, FREE_SPIRIT: 1 } },
      { text: '目を引くこと',  scores: { COSMIC_REBEL: 3, URBAN_EDGE: 2, RETRO_WAVE: 2 } },
    ],
  },
  {
    id: 'q2',
    text: 'つい選びがちな色は？',
    options: [
      { text: '黒・グレー系',      scores: { DARK_POET: 3, URBAN_EDGE: 2, MINIMAL_SOUL: 2 } },
      { text: '白・ベージュ系',    scores: { MINIMAL_SOUL: 3, CLASSIC_ELITE: 2 } },
      { text: '淡い色',            scores: { SOFT_DREAMER: 3, FREE_SPIRIT: 2 } },
      { text: 'はっきりした色',    scores: { RETRO_WAVE: 3, COSMIC_REBEL: 2, URBAN_EDGE: 1 } },
    ],
  },
  {
    id: 'q3',
    text: '友達に言われたらうれしいのは？',
    options: [
      { text: '大人っぽい',            scores: { CLASSIC_ELITE: 3, DARK_POET: 2, MINIMAL_SOUL: 1 } },
      { text: 'センスある',            scores: { URBAN_EDGE: 2, FREE_SPIRIT: 2, MINIMAL_SOUL: 2 } },
      { text: 'かわいい・やわらかい',  scores: { SOFT_DREAMER: 3, FREE_SPIRIT: 1, RETRO_WAVE: 1 } },
      { text: '個性的',                scores: { COSMIC_REBEL: 3, DARK_POET: 2, RETRO_WAVE: 1 } },
    ],
  },
  {
    id: 'q4',
    text: '休日の服はどれが近い？',
    options: [
      { text: 'シンプルで整った感じ',      scores: { MINIMAL_SOUL: 3, CLASSIC_ELITE: 2 } },
      { text: 'ラフだけど雰囲気ある感じ',  scores: { FREE_SPIRIT: 3, URBAN_EDGE: 2, DARK_POET: 1 } },
      { text: 'やさしく親しみやすい感じ',  scores: { SOFT_DREAMER: 3, FREE_SPIRIT: 1 } },
      { text: 'トレンド感がある感じ',      scores: { URBAN_EDGE: 3, RETRO_WAVE: 2, COSMIC_REBEL: 1 } },
    ],
  },
  {
    id: 'q5',
    text: '服で目指したい印象は？',
    options: [
      { text: '洗練されてる',    scores: { CLASSIC_ELITE: 3, MINIMAL_SOUL: 2 } },
      { text: 'こなれてる',      scores: { FREE_SPIRIT: 3, URBAN_EDGE: 2, DARK_POET: 1 } },
      { text: '親しみやすい',    scores: { SOFT_DREAMER: 3, FREE_SPIRIT: 1 } },
      { text: '華やか',          scores: { RETRO_WAVE: 3, COSMIC_REBEL: 2 } },
    ],
  },
  {
    id: 'q6',
    text: '形で好きなのは？',
    options: [
      { text: 'すっきりした形',        scores: { MINIMAL_SOUL: 3, CLASSIC_ELITE: 2 } },
      { text: 'ゆるめの形',            scores: { FREE_SPIRIT: 3, URBAN_EDGE: 2 } },
      { text: 'ふんわりした形',        scores: { SOFT_DREAMER: 3, FREE_SPIRIT: 1 } },
      { text: 'メリハリのある形',      scores: { COSMIC_REBEL: 2, DARK_POET: 2, URBAN_EDGE: 1, RETRO_WAVE: 1 } },
    ],
  },
  {
    id: 'q7',
    text: '小物を足すならどれが好き？',
    options: [
      { text: 'ブーツ・革小物',              scores: { DARK_POET: 3, CLASSIC_ELITE: 2 } },
      { text: 'スニーカー・キャップ',        scores: { URBAN_EDGE: 3, FREE_SPIRIT: 1, RETRO_WAVE: 1 } },
      { text: 'カーディガン・やわらか小物',  scores: { SOFT_DREAMER: 3, FREE_SPIRIT: 2 } },
      { text: 'アクセサリー・目立つ小物',    scores: { COSMIC_REBEL: 3, RETRO_WAVE: 2 } },
    ],
  },
  {
    id: 'q8',
    text: '自分の理想の雰囲気は？',
    options: [
      { text: 'きれいで上品',          scores: { CLASSIC_ELITE: 3, MINIMAL_SOUL: 2, SOFT_DREAMER: 1 } },
      { text: '自然におしゃれ',        scores: { FREE_SPIRIT: 3, URBAN_EDGE: 2 } },
      { text: 'やさしくて透明感がある', scores: { SOFT_DREAMER: 3, FREE_SPIRIT: 1 } },
      { text: '個性的で唯一無二',      scores: { COSMIC_REBEL: 3, DARK_POET: 2, RETRO_WAVE: 1 } },
    ],
  },
]
