'use client'

// =============================================================================
// SourceCookieSetter.tsx
//
// /style-id?source=<val> で来た場合、値をホワイトリスト検証して
// Cookie `style_id_source` に保存する。
// 引き継ぎコード発行 API 側で読み取り、transfer.source として記録する。
//
// TTL 24 時間:
//   ・20 問回答途中で離席する可能性
//   ・同日中に別セッションで再開する可能性
//   ・物理カード流入計測を失わないため
// SameSite=Lax: /api/style-id/transfers を同一オリジンからの POST で読めるようにする。
// サーバー側でも style_id_source を再検証してから採用する (result page → API 経路)。
// =============================================================================

import { useEffect } from 'react'

const SOURCE_RE = /^[A-Za-z0-9_.\-]{1,64}$/
const MAX_AGE_SEC = 24 * 60 * 60

export function SourceCookieSetter() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const raw = params.get('source')
      if (!raw) return
      if (!SOURCE_RE.test(raw)) return
      document.cookie = `style_id_source=${encodeURIComponent(raw)}; path=/; max-age=${MAX_AGE_SEC}; SameSite=Lax`
    } catch {
      /* no-op */
    }
  }, [])
  return null
}
