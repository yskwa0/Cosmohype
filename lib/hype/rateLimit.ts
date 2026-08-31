// =============================================================================
// lib/hype/rateLimit.ts
//
// /hype/apply の server-side rate limit (DB カウント方式)。
//
// - Turnstile / CAPTCHA は Production 公開前に別チケットで追加。
// - Test 段階ではこの DB カウントで対応する。
//
// 判定:
//   同一 ip_hash の申請が過去 10 分間に 3 件超 → 拒否
//   同一 contact_email の pending 申請重複は DB 側 partial unique index で拒否
// =============================================================================

import 'server-only'
import { createAdminClient } from '@/lib/supabase/server'

interface RateLimitResult {
  ok: boolean
  reason?: 'ip_hourly_limit' | 'ip_burst_limit'
}

export async function checkApplyRateLimit(params: {
  ipHash: string | null
}): Promise<RateLimitResult> {
  if (!params.ipHash) return { ok: true } // IP 取得失敗時は許可 (server 側環境依存)

  const admin = createAdminClient()
  const nowIso = new Date().toISOString()
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  // 10 分間 3 件まで
  const looseAdmin = admin as unknown as {
    from: (t: string) => {
      select: (s: string, opts?: unknown) => {
        eq: (c: string, v: string) => {
          gte: (c: string, v: string) => Promise<{ count: number | null; error: unknown }>
        }
      }
    }
  }
  const { count: burst } = await looseAdmin
    .from('shop_brand_applications')
    .select('id', { count: 'exact', head: true } as unknown)
    .eq('ip_hash', params.ipHash)
    .gte('created_at', tenMinAgo)
  if ((burst ?? 0) >= 3) return { ok: false, reason: 'ip_burst_limit' }

  // 1 時間 10 件まで
  const { count: hourly } = await looseAdmin
    .from('shop_brand_applications')
    .select('id', { count: 'exact', head: true } as unknown)
    .eq('ip_hash', params.ipHash)
    .gte('created_at', oneHourAgo)
  if ((hourly ?? 0) >= 10) return { ok: false, reason: 'ip_hourly_limit' }

  void nowIso // reserved for future window logic
  return { ok: true }
}
