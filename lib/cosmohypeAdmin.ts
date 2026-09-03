import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { safeInternalPath } from '@/lib/safeInternalPath'

/**
 * Cosmohype 運営者 (`profiles.role = 'admin'`) 判定コンテキスト。
 *
 * Brand Admin (`shop_brand_members` ベース) とは完全に別物。 iOS 側の HYPE 商品詳細
 * STYLE ID 管理 (Migration 151) と同じ判定 source (`profiles.role`) を使う。
 *
 * ★ 高速化: React `cache()` で 1 リクエスト内の重複呼出を dedupe (brandAdmin と同じ pattern)。
 *    layout.tsx が呼び、その後の page.tsx が同一 request 内で再度呼んでも
 *    Supabase auth.getUser + profiles query は 1 回のみ実行される。
 *
 * ★ Deep path 保持: 未認証 / 非-admin の redirect target を computeAdminReturnPath()
 *    で decide し、Safari bookmark で /cosmohype-admin/hype-applications 等を
 *    直開きしても login 後に「元 URL」まで戻す。 proxy.ts の x-pathname header と
 *    isAuthPath && user 分岐 (?redirect= 尊重) がこの deep path を保持する。
 */

export interface CosmohypeAdminContext {
  user: { id: string; email: string | null }
}

// deep path の decide ルール:
//   ・ proxy.ts が注入する x-pathname を SoT にする
//   ・ / 開始 + // 禁止 + \ 禁止 (safeInternalPath) で validate
//   ・ 更に /cosmohype-admin 配下に限定 (open redirect / 別コンテキスト誘導防止)
//   ・ 上記いずれも満たさない場合は /cosmohype-admin にフォールバック
async function computeAdminReturnPath(): Promise<string> {
  const h = await headers()
  const raw = h.get('x-pathname')
  const s = safeInternalPath(raw)
  if (!s) return '/cosmohype-admin'
  if (s === '/cosmohype-admin' || s.startsWith('/cosmohype-admin/')) return s
  return '/cosmohype-admin'
}

/**
 * `/cosmohype-admin` 配下のすべての Server Component / Server Action から呼ぶ。
 *
 * - 未認証 → `/login?redirect=<現 pathname>` に redirect (Safari bookmark の
 *   deep path を保持。 login 成功後、proxy.ts の isAuthPath && user 分岐と
 *   AuthForm.handleAction が redirect param を尊重して元 URL に戻す。)
 *
 * - 認証済みだが `profiles.role != 'admin'` → `/cosmohype-admin/access-denied?next=<現 pathname>`
 *   に redirect (silent `/` fallback は廃止。 dedicated page で「権限がない」ことを
 *   明示し、CTA で signOut → /login?redirect=<next> に誘導する)。
 *
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
      const returnPath = await computeAdminReturnPath()
      redirect(`/login?redirect=${encodeURIComponent(returnPath)}`)
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
      console.error('[cosmohypeAdmin] profiles.role fetch failed', error)
      // fetch エラー時は Admin ではないと同等に扱い、access-denied に誘導
      // (silent `/` fallback は user が「なぜ戻された」か分からず bookmark
      //  破損に見えるため廃止)。
      const returnPath = await computeAdminReturnPath()
      redirect(`/cosmohype-admin/access-denied?next=${encodeURIComponent(returnPath)}`)
    }

    if (profileRow?.role !== 'admin') {
      // 非 admin authenticated user: dedicated access-denied 画面へ。
      // deep path (next) は保持し、CTA で signOut → /login?redirect=<next> に誘導。
      const returnPath = await computeAdminReturnPath()
      redirect(`/cosmohype-admin/access-denied?next=${encodeURIComponent(returnPath)}`)
    }

    return {
      user: { id: user!.id, email: user!.email ?? null },
    }
  }
)
