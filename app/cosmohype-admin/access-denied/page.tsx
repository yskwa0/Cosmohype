import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { safeInternalPath } from '@/lib/safeInternalPath'
import { signOutAndReloginAction } from './actions'

/**
 * /cosmohype-admin/access-denied
 *
 * 認証済みだが `profiles.role !== 'admin'` の user が
 * `/cosmohype-admin/**` にアクセスしたときの明示的な誘導 page。
 *
 * ・ silent redirect (`/`) は user が「なぜホームに戻された」か分からず bookmark
 *   が壊れているように見えるため廃止。
 * ・ getCosmohypeAdminContext() は呼ばない (呼ぶと redirect loop になる。
 *   親 layout.tsx 側で pathname を見て auth check を skip する)。
 * ・ `?next=/cosmohype-admin/...` を保持し、「別のアカウントでログイン」CTA で
 *   signOut → /login?redirect=<next> に誘導 (deep path 保持)。
 */
export const metadata: Metadata = {
  title: '権限がありません — Cosmohype Admin',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noarchive: true, nosnippet: true },
  },
}

export const dynamic = 'force-dynamic'

// login 後に戻す先を決める:
//   ・ ?next が /cosmohype-admin 配下の safeInternalPath ならそれを採用
//   ・ 外なら /cosmohype-admin に丸める (open redirect / 別コンテキスト誘導防止)
function computeReturnPath(rawNext: string | null): string {
  const s = safeInternalPath(rawNext)
  if (!s) return '/cosmohype-admin'
  if (s === '/cosmohype-admin' || s.startsWith('/cosmohype-admin/')) return s
  return '/cosmohype-admin'
}

export default async function CosmohypeAdminAccessDeniedPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>
}) {
  const sp = (await searchParams) ?? {}
  const returnPath = computeReturnPath(sp.next ?? null)

  // 現在の user email を表示 (どのアカウントで到達しているかを user に伝える)
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const currentEmail = userData?.user?.email ?? null

  // Fallback: x-pathname を read するのは layout 側でも同様。 ここでは表示のみ。
  const h = await headers()
  const pathname = h.get('x-pathname') ?? '/cosmohype-admin/access-denied'
  void pathname

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-6 py-14">
      <div className="max-w-md w-full bg-white border border-neutral-200 rounded-xl p-8 shadow-sm">
        <div className="text-[10px] tracking-[0.35em] text-neutral-500 mb-3">COSMOHYPE ADMIN</div>
        <h1 className="text-xl font-semibold text-neutral-900 mb-3">
          Cosmohype Admin 権限がありません
        </h1>
        <p className="text-sm text-neutral-700 leading-relaxed mb-6">
          このアカウントには Cosmohype Admin にアクセスする権限がありません。<br />
          運営アカウントでログインしてください。
        </p>

        {currentEmail && (
          <div className="mb-6 rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] text-neutral-700 leading-relaxed break-words">
            <span className="text-neutral-500 mr-2">現在サインイン中</span>
            <span className="font-medium">{currentEmail}</span>
          </div>
        )}

        <form action={signOutAndReloginAction} className="space-y-3">
          <input type="hidden" name="next" value={returnPath} />
          <button
            type="submit"
            className={
              'w-full h-11 rounded-md text-sm font-semibold ' +
              'bg-neutral-900 text-white ' +
              'inline-flex items-center justify-center gap-2 ' +
              'transition-[transform,opacity,filter] duration-150 ease-out ' +
              'origin-center will-change-transform ' +
              'active:scale-[0.97] active:opacity-90 ' +
              'disabled:opacity-70 disabled:cursor-not-allowed ' +
              'cursor-pointer select-none touch-manipulation ' +
              '[-webkit-tap-highlight-color:transparent]'
            }
          >
            別のアカウントでログイン
          </button>
        </form>

        <p className="mt-8 text-[11px] text-neutral-500 leading-relaxed">
          「別のアカウントでログイン」を押すと、現在のセッションをサインアウトし、
          ログイン画面に移動します (元のリンク先は保持されます)。
        </p>
      </div>
    </div>
  )
}
