import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Cosmohype 運営者 (`profiles.role = 'admin'`) 判定コンテキスト。
 *
 * Brand Admin (`shop_brand_members` ベース) とは完全に別物。 iOS 側の HYPE 商品詳細
 * STYLE ID 管理 (Migration 151) と同じ判定 source (`profiles.role`) を使う。
 *
 * ★ 高速化: React `cache()` で 1 リクエスト内の重複呼出を dedupe (brandAdmin と同じ pattern)。
 *    layout.tsx が呼び、その後の page.tsx が同一 request 内で再度呼んでも
 *    Supabase auth.getUser + profiles query は 1 回のみ実行される。
 */

export interface CosmohypeAdminContext {
  user: { id: string; email: string | null }
}

/**
 * `/cosmohype-admin` 配下のすべての Server Component / Server Action から呼ぶ。
 * - 未認証 → `/login?redirect=/cosmohype-admin` に redirect
 *   (login 成功後、AuthForm は `?redirect=` を startsWith('/') validate してから
 *    採用するため open redirect にならず、Cosmohype Admin に戻る)
 * - 認証済みだが `profiles.role != 'admin'` → `/` に silent redirect
 *   (存在自体を隠す。 `app/page.tsx` の「認証済 → /feed 自動 redirect」は撤去済
 *    のため / は homepage を render し、Feed に二次遷移しない)
 * - 認証済み + admin → context を返す
 *
 * 【禁止事項】
 * - email hardcode
 * - device id
 * - cookie / UserDefaults だけの admin 判定
 * - Brand Admin の owner/admin を運営者として扱う
 * すべて frontend 表示制御では NOT sufficient — 必ず本 helper を Server Component で
 * 呼び、その帰結として render が行われる (URL 直打ちでもここで redirect される)。
 */
export const getCosmohypeAdminContext = cache(
  async (): Promise<CosmohypeAdminContext> => {
    const supabase = await createClient()

    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    if (!user) {
      redirect('/login?redirect=/cosmohype-admin')
    }

    // types/database.ts には shop_* が未生成なので as any でクエリ (型は下で厳密化)。
    const { data: profileRow, error } = await (
      supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{
                data: { role: string | null } | null
                error: unknown
              }>
            }
          }
        }
      }
    )
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .maybeSingle()

    if (error) {
      // eslint-disable-next-line no-console
      console.error('[cosmohypeAdmin] profiles.role fetch failed', error)
      redirect('/')
    }

    if (profileRow?.role !== 'admin') {
      // 非 admin は存在すら悟らせず、通常ユーザー扱いで / へ送る。
      redirect('/')
    }

    return {
      user: { id: user!.id, email: user!.email ?? null },
    }
  }
)
