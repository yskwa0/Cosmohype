import { ImageResponse } from 'next/og'
import fs from 'node:fs/promises'
import path from 'node:path'

// ─── Route Segment Config (Next.js opengraph-image file convention) ────
// Node runtime にすることで public/ からの fs 読みができるようにする。
// edge runtime だと fs.readFile が使えないため base64 化ができない。
export const runtime = 'nodejs'

// LINE / Twitter Card summary_large_image の想定サイズ (1.9:1)。
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Cosmohype — 友達から招待されています'

/**
 * 招待 route (/invite/[inviteCode]) の og:image を動的生成する。
 *
 * 問題:
 *   /image.png (1358x313 の Cosmohype wordmark、aspect 4.34:1) を og:image に
 *   直接指定すると、LINE の 1200x630 (1.9:1) カード枠で cover crop され、
 *   wordmark の左右がぶった切れて「smoh...」のような一部だけ表示される。
 *
 * 解決:
 *   本 file convention で 1200x630 canvas に wordmark を「余白付き中央配置」した
 *   PNG を dynamically 生成し、それを og:image として使う。
 *
 * デザイン:
 *   * 背景: 白 → very light warm orange の縦グラデ (Landing 本体と同じブランドトーン)
 *   * 中央: /image.png wordmark を 720x166 (元 aspect 4.34:1 を保持) で配置
 *   * text 追加なし: project に custom font 未導入 (Web/iOS 共に system font)、
 *                    system font での日本語テキストがブランドに合わないため wordmark 単独
 *
 * 依存:
 *   * public/image.png (元 wordmark asset)
 *
 * 注意:
 *   ImageResponse (Satori) は img の src に data:URL / URL を取れるが、
 *   self-domain の HTTP fetch は循環になり得るため fs 読みで base64 化する方式を採用。
 */
export default async function OpenGraphImage() {
  const wordmarkPath = path.join(process.cwd(), 'public', 'image.png')
  const wordmarkBuffer = await fs.readFile(wordmarkPath)
  const wordmarkDataUrl = `data:image/png;base64,${wordmarkBuffer.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #FFF7ED 0%, #FFFFFF 55%, #FFFFFF 100%)',
        }}
      >
        {/* wordmark: 1358x313 → 720x166 (aspect 4.34:1 保持、20% 余白ゲージ) */}
        <img
          src={wordmarkDataUrl}
          alt="Cosmohype"
          width={720}
          height={166}
          style={{ objectFit: 'contain' }}
        />
      </div>
    ),
    { ...size }
  )
}
