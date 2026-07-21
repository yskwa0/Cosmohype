// =============================================================================
// quiz-v2.ts
//
// iOS 完全同期版 STYLE ID 診断 (20 問 / +2 単純タリー / 末尾ウォークバック)。
//
// 【正典】
//   CosmohypeNative/Views/Cosmo/StyleIdQuizView.swift
//
// 【禁止事項】
//   - 質問文 / 選択肢文 / typeId / 選択肢順の変更
//   - 15 問版 (lib/style-id/questions.ts, scoring.ts) の再利用
//   - 3/2/1 重み付けスコアリング
//
// 【構造】
//   1. 型定義          — types.ts の StyleId を再利用
//   2. STYLE_ID_ORDER  — iOS `allTypeIds` と同順
//   3. NONE_OPTION     — 全 20 問共通の 5 択目
//   4. QUIZ_V2_QUESTIONS — 20 問 (Q1..Q20)、各 5 択
//   5. computeScoresV2 — +2 単純タリー
//   6. topStyleV2      — argmax + 末尾ウォークバック + neutral
//
// 【iOS 側との対応】
//   iOS Swift                                      TS 側
//   ---------------------------------------------  --------------------------
//   StyleIdQuiz.allTypeIds                         STYLE_ID_ORDER_V2
//   StyleIdQuiz.noneOptionText                     NONE_OPTION_TEXT_V2
//   StyleIdQuiz.questions                          QUIZ_V2_QUESTIONS
//   StyleIdQuiz.computeScores(answers:)            computeScoresV2(answers)
//   StyleIdQuiz.topStyle(from:answers:)            topStyleV2(scores, answers)
//   Option.typeId (String?)                        QuizV2Option.typeId (StyleId | null)
// =============================================================================

import type { StyleId } from './types'

export interface QuizV2Option {
  text: string
  /** この選択肢が加点する STYLE ID。null = 「この中に自分に近いスタイルはない」(0 点) */
  typeId: StyleId | null
}

export interface QuizV2Question {
  text: string
  options: QuizV2Option[]
}

/** ユーザーの 1 回答。qi = 質問 index (0..19)、oi = 選択肢 index (0..4)。 */
export interface QuizV2Answer {
  qi: number
  oi: number
}

/** STYLE ID の定義順 (iOS `allTypeIds` と同一)。表記揺れ回避のため 1 箇所に集約。 */
export const STYLE_ID_ORDER_V2: readonly StyleId[] = [
  'URBAN_EDGE',
  'COSMIC_REBEL',
  'SOFT_DREAMER',
  'CLASSIC_ELITE',
  'FREE_SPIRIT',
  'DARK_POET',
  'RETRO_WAVE',
  'MINIMAL_SOUL',
] as const

/** 全 20 問共通の 5 択目 (typeId = null で 0 点)。 */
export const NONE_OPTION_TEXT_V2 = 'この中に自分に近いスタイルはない'

/** 20 問 / 各 5 択。iOS `StyleIdQuiz.questions` からの一字一句転記。 */
export const QUIZ_V2_QUESTIONS: readonly QuizV2Question[] = [
  // Q1
  {
    text: 'コーデを見た時、最初に惹かれるのは？',
    options: [
      { text: 'ワイドパンツやスニーカーを使った、今っぽい着こなし',   typeId: 'URBAN_EDGE'    },
      { text: '違う雰囲気の服を何枚も重ねた、見どころの多い着こなし', typeId: 'COSMIC_REBEL'  },
      { text: '使う服は少ないのに、全体の形がきれいな着こなし',       typeId: 'MINIMAL_SOUL'  },
      { text: '黒を中心に、形や雰囲気までかっこよくまとめた着こなし', typeId: 'DARK_POET'     },
      { text: NONE_OPTION_TEXT_V2,                                    typeId: null            },
    ],
  },
  // Q2
  {
    text: '一番好きな服装に近いのは？',
    options: [
      { text: 'きれいめで上品な服装',                              typeId: 'CLASSIC_ELITE' },
      { text: 'レースやスカート、ワンピースを使った服装',          typeId: 'SOFT_DREAMER'  },
      { text: '古着屋やフリマで見つけた服を組み合わせた服装',      typeId: 'FREE_SPIRIT'   },
      { text: '平成や2000年代など、少し前の流行を感じる服装',      typeId: 'RETRO_WAVE'    },
      { text: NONE_OPTION_TEXT_V2,                                 typeId: null            },
    ],
  },
  // Q3
  {
    text: 'コーデに使う色で、一番近いのは？',
    options: [
      { text: '黒・グレー・白などを中心に、靴や形で今っぽく見せる',   typeId: 'URBAN_EDGE'    },
      { text: 'ネイビー・白・茶色など、落ち着いた色を上品に合わせる', typeId: 'CLASSIC_ELITE' },
      { text: '色や柄の違う服を、何枚か組み合わせることがある',       typeId: 'COSMIC_REBEL'  },
      { text: '赤・青・黄色など、はっきりした色をよく取り入れる',     typeId: 'RETRO_WAVE'    },
      { text: NONE_OPTION_TEXT_V2,                                    typeId: null            },
    ],
  },
  // Q4
  {
    text: '好きな服の形は？',
    options: [
      { text: 'シンプルで、着た時の形がきれい',                    typeId: 'MINIMAL_SOUL' },
      { text: '細め、長め、大きめなど、少し特徴のある形',          typeId: 'DARK_POET'    },
      { text: 'スカートやワンピースなど、女性らしい形',            typeId: 'SOFT_DREAMER' },
      { text: '大きめのシャツやパンツを、ゆったり組み合わせる',    typeId: 'FREE_SPIRIT'  },
      { text: NONE_OPTION_TEXT_V2,                                 typeId: null           },
    ],
  },
  // Q5
  {
    text: 'コーデが少し物足りない時、どうする？',
    options: [
      { text: 'パンツや靴を変えて、全体のバランスを今っぽくする', typeId: 'URBAN_EDGE'    },
      { text: '何かを足すより、服の数を減らして形を整える',       typeId: 'MINIMAL_SOUL'  },
      { text: 'バッグや時計などを加えて、上品にまとめる',         typeId: 'CLASSIC_ELITE' },
      { text: '古着屋で見つけたシャツやジャケットを加える',       typeId: 'FREE_SPIRIT'   },
      { text: NONE_OPTION_TEXT_V2,                                typeId: null            },
    ],
  },
  // Q6
  {
    text: '一番テンションが上がるのは？',
    options: [
      { text: '黒を中心にした服が、かっこよくまとまった時',       typeId: 'DARK_POET'    },
      { text: 'レースやスカートなどが、自分らしくまとまった時',   typeId: 'SOFT_DREAMER' },
      { text: '昔っぽい服や小物を、今の服とうまく合わせられた時', typeId: 'RETRO_WAVE'   },
      { text: '違う系統の服を何枚も重ねて、うまくまとまった時',   typeId: 'COSMIC_REBEL' },
      { text: NONE_OPTION_TEXT_V2,                                typeId: null           },
    ],
  },
  // Q7
  {
    text: 'コーデを褒められるなら、一番うれしいのは？',
    options: [
      { text: '今っぽくておしゃれ',           typeId: 'URBAN_EDGE'    },
      { text: '上品で、ちゃんとして見える',   typeId: 'CLASSIC_ELITE' },
      { text: '雰囲気があってかっこいい',     typeId: 'DARK_POET'     },
      { text: '女性らしくて素敵',             typeId: 'SOFT_DREAMER'  },
      { text: NONE_OPTION_TEXT_V2,            typeId: null            },
    ],
  },
  // Q8
  {
    text: '服を買う時、一番決め手になりやすいのは？',
    options: [
      { text: '手持ちの服と重ねたり、意外な組み合わせができそう', typeId: 'COSMIC_REBEL' },
      { text: 'いろいろな服に合わせやすく、長く使えそう',         typeId: 'MINIMAL_SOUL' },
      { text: '古着屋やフリマで、安くていいものを見つけた',       typeId: 'FREE_SPIRIT'  },
      { text: '昔流行った形や、懐かしいデザインに惹かれた',       typeId: 'RETRO_WAVE'   },
      { text: NONE_OPTION_TEXT_V2,                                typeId: null           },
    ],
  },
  // Q9
  {
    text: 'アウターを1着選ぶなら？',
    options: [
      { text: '大きめで、スニーカーやワイドパンツに合うジャケット',   typeId: 'URBAN_EDGE'   },
      { text: '中にいろいろな服を重ねられる、少し変わったジャケット', typeId: 'COSMIC_REBEL' },
      { text: '古着屋で見つけた、カーキやベージュのジャケット',       typeId: 'FREE_SPIRIT'  },
      { text: 'ワンピースやスカートに合わせやすいコート',             typeId: 'SOFT_DREAMER' },
      { text: NONE_OPTION_TEXT_V2,                                    typeId: null           },
    ],
  },
  // Q10
  {
    text: '靴を選ぶなら？',
    options: [
      { text: '飾りが少なく、どんな服にも合わせやすいスニーカー', typeId: 'MINIMAL_SOUL'  },
      { text: '黒いブーツや、少し存在感のある靴',                 typeId: 'DARK_POET'     },
      { text: 'ローファーや革靴など、上品に見える靴',             typeId: 'CLASSIC_ELITE' },
      { text: '昔流行った形や色を取り入れたスニーカー',           typeId: 'RETRO_WAVE'    },
      { text: NONE_OPTION_TEXT_V2,                                typeId: null            },
    ],
  },
  // Q11
  {
    text: 'レイヤード(重ね着)をするなら？',
    options: [
      { text: 'Tシャツに大きめのシャツやジャケットを重ねる', typeId: 'URBAN_EDGE'   },
      { text: '昔っぽい服と今の服を重ねる',                   typeId: 'RETRO_WAVE'   },
      { text: 'あまり重ねず、1枚か2枚ですっきり着る',        typeId: 'MINIMAL_SOUL' },
      { text: 'レースや薄い素材を重ねる',                     typeId: 'SOFT_DREAMER' },
      { text: NONE_OPTION_TEXT_V2,                            typeId: null           },
    ],
  },
  // Q12
  {
    text: 'コーデに少し『合ってないかも』と感じる部分があったら？',
    options: [
      { text: '面白いと思ったら、さらに別の服を重ねて活かす', typeId: 'COSMIC_REBEL'  },
      { text: '古着を加えて、全体になじませる',               typeId: 'FREE_SPIRIT'   },
      { text: '色を減らしたり、形の強い服に変えてまとめる',   typeId: 'DARK_POET'     },
      { text: '目立ちすぎる部分を抑えて、上品にまとめる',     typeId: 'CLASSIC_ELITE' },
      { text: NONE_OPTION_TEXT_V2,                            typeId: null            },
    ],
  },
  // Q13
  {
    text: '一番近い服の選び方は？',
    options: [
      { text: '今よく見かける形やスニーカーを取り入れる',           typeId: 'URBAN_EDGE'  },
      { text: '古着屋やフリマを見て、気に入ったものを組み合わせる', typeId: 'FREE_SPIRIT' },
      { text: '黒を中心に、服の形までこだわって選ぶ',               typeId: 'DARK_POET'   },
      { text: '昔の流行や時代を感じる服を探す',                     typeId: 'RETRO_WAVE'  },
      { text: NONE_OPTION_TEXT_V2,                                  typeId: null          },
    ],
  },
  // Q14
  {
    text: 'バッグやアクセサリーを選ぶなら？',
    options: [
      { text: '他の服と重ねた時に目立つ、少し変わったもの',       typeId: 'COSMIC_REBEL'  },
      { text: 'レースや細かい飾りが入ったもの',                   typeId: 'SOFT_DREAMER'  },
      { text: '飾りが少なく、シンプルなもの',                     typeId: 'MINIMAL_SOUL'  },
      { text: '名前を知っているブランドや、人気のブランドのもの', typeId: 'CLASSIC_ELITE' },
      { text: NONE_OPTION_TEXT_V2,                                typeId: null            },
    ],
  },
  // Q15
  {
    text: '白いTシャツを着るなら、何と合わせたい？',
    options: [
      { text: 'ワイドパンツとスニーカー',                     typeId: 'URBAN_EDGE'   },
      { text: 'スカートや、レースの入ったアイテム',           typeId: 'SOFT_DREAMER' },
      { text: '黒いパンツやブーツを合わせて、モード寄りにする', typeId: 'DARK_POET'    },
      { text: '形のきれいなパンツだけを合わせて、すっきり着る', typeId: 'MINIMAL_SOUL' },
      { text: NONE_OPTION_TEXT_V2,                             typeId: null           },
    ],
  },
  // Q16
  {
    text: 'コーデの主役を1つ選ぶなら？',
    options: [
      { text: '重ね着した時に目立つ、少し変わったデザインの服', typeId: 'COSMIC_REBEL'  },
      { text: '有名なブランドのジャケットやコート',             typeId: 'CLASSIC_ELITE' },
      { text: 'フリマや古着屋で安く見つけた一点物',             typeId: 'FREE_SPIRIT'   },
      { text: '平成や2000年代を感じる、色や柄のある服',         typeId: 'RETRO_WAVE'    },
      { text: NONE_OPTION_TEXT_V2,                              typeId: null            },
    ],
  },
  // Q17
  {
    text: '一番避けたいのは？',
    options: [
      { text: '今の流行からかなり遅れて見える',       typeId: 'URBAN_EDGE'    },
      { text: '使っている服が少なく、見どころがない', typeId: 'COSMIC_REBEL'  },
      { text: '色や飾りが多く、自分には明るすぎる',   typeId: 'DARK_POET'     },
      { text: '全体が安っぽく見える',                 typeId: 'CLASSIC_ELITE' },
      { text: NONE_OPTION_TEXT_V2,                    typeId: null            },
    ],
  },
  // Q18
  {
    text: 'クローゼットに一番多いのは？',
    options: [
      { text: '無地で、形のきれいな服',                   typeId: 'MINIMAL_SOUL' },
      { text: '古着屋やフリマで買った服',                 typeId: 'FREE_SPIRIT'  },
      { text: 'スカート、ワンピース、レースを使った服',   typeId: 'SOFT_DREAMER' },
      { text: '昔流行ったデザインや、色のある服',         typeId: 'RETRO_WAVE'   },
      { text: NONE_OPTION_TEXT_V2,                        typeId: null           },
    ],
  },
  // Q19
  {
    text: '普段、コーデを組む時に最初に決めるのは？',
    options: [
      { text: 'スニーカーやワイドパンツなど、今っぽいアイテム',           typeId: 'URBAN_EDGE'    },
      { text: '色や柄のある、昔っぽいアイテム',                           typeId: 'RETRO_WAVE'    },
      { text: 'バッグ・時計・ジャケットなど、ブランドを意識したアイテム', typeId: 'CLASSIC_ELITE' },
      { text: '一番形がきれいに見えるトップスやパンツ',                   typeId: 'MINIMAL_SOUL'  },
      { text: NONE_OPTION_TEXT_V2,                                        typeId: null            },
    ],
  },
  // Q20
  {
    text: '一番自分に近いのは？',
    options: [
      { text: '1つの系統にそろえるより、違う服を何枚も重ねたい',         typeId: 'COSMIC_REBEL' },
      { text: '黒を着るだけでなく、形まで含めてモードっぽくまとめたい',   typeId: 'DARK_POET'    },
      { text: '新品だけでそろえるより、安く見つけた古着を混ぜたい',       typeId: 'FREE_SPIRIT'  },
      { text: 'パンツ中心より、スカートやワンピースを選ぶことが多い',     typeId: 'SOFT_DREAMER' },
      { text: NONE_OPTION_TEXT_V2,                                        typeId: null           },
    ],
  },
] as const

// =============================================================================
// Scoring
// =============================================================================

/**
 * iOS `StyleIdQuiz.computeScores(answers:)` と同一挙動。
 *   - typeId != null → 対応 STYLE ID に +2
 *   - typeId == null → 0 点 (何も加点しない)
 *
 * 範囲外 answer (qi/oi が範囲外) は Swift 側と同じく無視する。
 */
export function computeScoresV2(answers: readonly QuizV2Answer[]): Record<StyleId, number> {
  const scores: Record<StyleId, number> = {
    URBAN_EDGE:    0,
    COSMIC_REBEL:  0,
    SOFT_DREAMER:  0,
    CLASSIC_ELITE: 0,
    FREE_SPIRIT:   0,
    DARK_POET:     0,
    RETRO_WAVE:    0,
    MINIMAL_SOUL:  0,
  }
  for (const a of answers) {
    if (a.qi < 0 || a.qi >= QUIZ_V2_QUESTIONS.length) continue
    const opts = QUIZ_V2_QUESTIONS[a.qi].options
    if (a.oi < 0 || a.oi >= opts.length) continue
    const tid = opts[a.oi].typeId
    if (tid !== null) {
      scores[tid] += 2
    }
  }
  return scores
}

export interface TopStyleV2Result {
  styleId: StyleId
  isNeutral: boolean
}

/**
 * iOS `StyleIdQuiz.topStyle(from:answers:)` と同一挙動:
 *   - 全タイプ 0                       → neutral (isNeutral=true, styleId=FREE_SPIRIT placeholder)
 *   - 単独 max                         → その type
 *   - 複数 top で同点                  → answers を末尾から走査、最初に出会う同点候補が勝者
 *
 * neutral 時の styleId=FREE_SPIRIT は表示用 placeholder。呼び出し側は `isNeutral === true`
 * を必ずチェックして、通常の STYLE ID 表示に流用しないこと。
 *
 * 論理不変条件: maxScore > 0 なら少なくとも 1 つの同点タイプが answers に必ず存在する。
 * 破れた場合 (実挙動では到達しない) は防御的に neutral に落とす。
 */
export function topStyleV2(
  scores: Record<StyleId, number>,
  answers: readonly QuizV2Answer[]
): TopStyleV2Result {
  let maxScore = 0
  for (const id of STYLE_ID_ORDER_V2) {
    if (scores[id] > maxScore) maxScore = scores[id]
  }
  if (maxScore === 0) {
    return { styleId: 'FREE_SPIRIT', isNeutral: true }
  }
  // STYLE_ID_ORDER_V2 の定義順で走査 (= 決定的)
  const topIds: StyleId[] = []
  for (const id of STYLE_ID_ORDER_V2) {
    if (scores[id] === maxScore) topIds.push(id)
  }
  if (topIds.length === 1) {
    return { styleId: topIds[0], isNeutral: false }
  }
  const topSet = new Set<StyleId>(topIds)
  for (let i = answers.length - 1; i >= 0; i--) {
    const a = answers[i]
    if (a.qi < 0 || a.qi >= QUIZ_V2_QUESTIONS.length) continue
    const opts = QUIZ_V2_QUESTIONS[a.qi].options
    if (a.oi < 0 || a.oi >= opts.length) continue
    const tid = opts[a.oi].typeId
    if (tid !== null && topSet.has(tid)) {
      return { styleId: tid, isNeutral: false }
    }
  }
  // 論理不変条件破れの防御 (実挙動では到達しない)
  return { styleId: 'FREE_SPIRIT', isNeutral: true }
}
