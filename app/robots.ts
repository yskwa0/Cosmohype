// =============================================================================
// app/robots.ts  (Phase 4-C.7 privacy 方針変更)
//
// admin 系 route (/cosmohype-admin, /brand-admin) と旧 public route
// /merchant-agreement を検索対象外にする。
//
// ★ 重要: robots.txt / X-Robots-Tag だけを security としては扱わない。
//   実際のアクセス制御は proxy.ts の X-Robots-Tag + 各 layout の
//   getCosmohypeAdminContext / getBrandAdminContext による auth gate 二段。
//   本 robots.ts は「検索エンジンに拾われて存在が漏れる」ことを防ぐ
//   defense-in-depth の 1 段目に過ぎない。
//
// Next.js App Router の robots.ts convention:
//   https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
// =============================================================================

import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/cosmohype-admin',
        '/cosmohype-admin/',
        '/brand-admin',
        '/brand-admin/',
        // 旧 public merchant-agreement route は Phase 4-C.7 で削除済。
        // Vercel キャッシュや外部リンク経由の 404 hit を対象外にするため念のため残す。
        '/merchant-agreement',
        '/merchant-agreement/',
        // API routes は原則 buyer/web-side 呼出しで search 対象外
        '/api/',
      ],
    },
  }
}
