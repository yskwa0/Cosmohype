import type { StyleId } from './types'

// Cosmohype ネイティブアプリの Assets.xcassets/{z*,y*}.imageset と同一の JPG を
// /public/style-id-chars/ に配置し、Web と iOS でキャラクターの見た目を統一する。
//
// 用途分離 (2026-07 追記):
//   ・Z 系 (zurban, zcosmic, …): ランディング / 診断中の演出画像。多数を並べても
//     まとまるカード寄りのアセット。
//   ・Y 系 (yurban, ycosmic, …): 「YOUR STYLE ID」結果画面のメインビジュアル。
//     ヒーロー用のよりリッチなアセット。

// Z 系: /style-id (ランディング) と /style-id/quiz で使用
const Z_IMAGE_BY_STYLE: Record<StyleId, string> = {
  URBAN_EDGE:    '/style-id-chars/zurban.jpg',
  COSMIC_REBEL:  '/style-id-chars/zcosmic.jpg',
  SOFT_DREAMER:  '/style-id-chars/zsoft.jpg',
  CLASSIC_ELITE: '/style-id-chars/zclassic.jpg',
  FREE_SPIRIT:   '/style-id-chars/zfree.jpg',
  DARK_POET:     '/style-id-chars/zdark.jpg',
  RETRO_WAVE:    '/style-id-chars/zretro.jpg',
  MINIMAL_SOUL:  '/style-id-chars/zminimal.jpg',
}

// Y 系: /style-id/result の「YOUR STYLE ID」ヒーロー用
const Y_IMAGE_BY_STYLE: Record<StyleId, string> = {
  URBAN_EDGE:    '/style-id-chars/yurban.jpg',
  COSMIC_REBEL:  '/style-id-chars/ycosmic.jpg',
  SOFT_DREAMER:  '/style-id-chars/ysoft.jpg',
  CLASSIC_ELITE: '/style-id-chars/yclassic.jpg',
  FREE_SPIRIT:   '/style-id-chars/yfree.jpg',
  DARK_POET:     '/style-id-chars/ydark.jpg',
  RETRO_WAVE:    '/style-id-chars/yretro.jpg',
  MINIMAL_SOUL:  '/style-id-chars/yminimal.jpg',
}

/**
 * ランディング / 診断中 UI 用の Z 系画像パスを返す。
 * (旧 characterImageFor と同挙動、名前を明示的にした)
 */
export function landingCharacterImageFor(styleId: StyleId): string {
  return Z_IMAGE_BY_STYLE[styleId]
}

/**
 * 結果画面 (「YOUR STYLE ID」ヒーロー) 用の Y 系画像パスを返す。
 */
export function resultCharacterImageFor(styleId: StyleId): string {
  return Y_IMAGE_BY_STYLE[styleId]
}

/**
 * 後方互換用エイリアス。既存の呼び出し (landing 側) は自動的に Z 系を返す。
 * result ページは `resultCharacterImageFor` を明示的に呼ぶこと。
 */
export const characterImageFor = landingCharacterImageFor
