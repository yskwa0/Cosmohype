import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { safeInternalPath } from '@/lib/safeInternalPath'

const PROTECTED_PATHS = ['/feed', '/profile', '/post']
const AUTH_PATHS = ['/login', '/register', '/onboarding']

// Invite finalize safety net: proxy はここに redirect するだけ。RPC は呼ばない。
const INVITE_INTENT_COOKIE_NAME = 'invite_intent_token'
const INVITE_FINALIZE_BACKOFF_COOKIE = 'invite_finalize_backoff'
const INVITE_FINALIZE_PATH = '/api/invite/finalize'

// Server Component / Server Action から現在の pathname を読めるように、
// request header に注入して forward する。 Next.js の `headers()` API は
// 転送された request header を返すため、これで下流から取得できる。
const X_PATHNAME_HEADER = 'x-pathname'

export async function proxy(request: NextRequest) {
  // Server Component 側で `headers().get('x-pathname')` を可能にするため、
  // 転送 request headers に pathname を注入して NextResponse.next({request}) する。
  const forwardHeaders = new Headers(request.headers)
  forwardHeaders.set(X_PATHNAME_HEADER, request.nextUrl.pathname)

  let supabaseResponse = NextResponse.next({ request: { headers: forwardHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: { headers: forwardHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, { ...options, maxAge: 60 * 60 * 24 * 90 })
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p))
  const isAuthPath = AUTH_PATHS.some(p => pathname.startsWith(p))

  // Phase 4-C.7 privacy: /cosmohype-admin と /brand-admin は検索対象外にする。
  // 認証 gate は各 layout の getCosmohypeAdminContext/getBrandAdminContext が SoT
  // (layout SSR で未認証は redirect される)。 middleware 側では noindex header の
  // 付与のみ行い、URL secrecy を security として扱わない (defense-in-depth の 3 段目)。
  const isAdminPath =
    pathname === '/cosmohype-admin' ||
    pathname.startsWith('/cosmohype-admin/') ||
    pathname === '/brand-admin' ||
    pathname.startsWith('/brand-admin/')
  if (isAdminPath) {
    supabaseResponse.headers.set(
      'X-Robots-Tag',
      'noindex, nofollow, noarchive, nosnippet, noimageindex',
    )
  }

  // Suspension check — only for logged-in users accessing protected paths.
  // Suspended users are redirected to /suspended (which signs them out client-side).
  if (isProtected && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_suspended')
      .eq('id', user.id)
      .single()

    if (profile?.is_suspended) {
      const redirectResponse = NextResponse.redirect(new URL('/suspended', request.url))
      supabaseResponse.cookies.getAll().forEach(cookie => redirectResponse.cookies.set(cookie))
      return redirectResponse
    }
  }

  // Invite finalize safety net (proxy は redirect のみ、RPC は Route Handler 側で実行):
  //   条件:
  //     - authenticated user
  //     - protected path (auth 経路では発火させない)
  //     - invite_intent_token Cookie あり
  //     - invite_finalize_backoff Cookie なし (retryable 失敗後 5 分は再試行しない)
  //     - 現在 path が /api/invite/finalize ではない (無限ループ防止)
  //   → 元 path を next query に載せて /api/invite/finalize へ 302 redirect
  //   Route Handler 側で SHA-256 → finish_invited_signup RPC → Cookie 更新 → 元 path へ redirect
  if (
    isProtected &&
    user &&
    pathname !== INVITE_FINALIZE_PATH &&
    request.cookies.get(INVITE_INTENT_COOKIE_NAME)?.value &&
    !request.cookies.get(INVITE_FINALIZE_BACKOFF_COOKIE)?.value
  ) {
    // next には現在アクセスしようとしていた path + search を relative で載せる。
    // 危険な絶対 URL / protocol-relative は Route Handler 側でも safeNextPath で再検証される。
    const nextPathAndSearch = pathname + (request.nextUrl.search ?? '')
    const finalizeUrl = new URL(INVITE_FINALIZE_PATH, request.url)
    finalizeUrl.searchParams.set('next', nextPathAndSearch)
    const redirectResponse = NextResponse.redirect(finalizeUrl)
    supabaseResponse.cookies.getAll().forEach(cookie => redirectResponse.cookies.set(cookie))
    return redirectResponse
  }

  if (isProtected && !user) {
    const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
    supabaseResponse.cookies.getAll().forEach(cookie => redirectResponse.cookies.set(cookie))
    return redirectResponse
  }

  // authenticated user が /login /register /onboarding に到達したら /feed へ。
  //
  // 例外: pathname が **exactly** '/login' の場合のみ `?redirect=<internal path>`
  //   を尊重する (Cosmohype Admin bookmark 経路 /login?redirect=/cosmohype-admin/…
  //   の deep path 保持のための hotfix scope)。
  //   validation は safeInternalPath (/ 開始・// 禁止・\ 禁止) で厳格に。
  //   /register / /onboarding は redirect param が付いていても採用せず、従来通り /feed。
  //   redirect 指定なし or reject 値も従来通り /feed。
  if (isAuthPath && user) {
    const requestedRedirect = pathname === '/login'
      ? request.nextUrl.searchParams.get('redirect')
      : null
    const dest = safeInternalPath(requestedRedirect) ?? '/feed'
    const redirectResponse = NextResponse.redirect(new URL(dest, request.url))
    supabaseResponse.cookies.getAll().forEach(cookie => redirectResponse.cookies.set(cookie))
    return redirectResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
