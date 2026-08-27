import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PATHS = ['/feed', '/profile', '/post']
const AUTH_PATHS = ['/login', '/register', '/onboarding']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
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

  if (isProtected && !user) {
    const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
    supabaseResponse.cookies.getAll().forEach(cookie => redirectResponse.cookies.set(cookie))
    return redirectResponse
  }

  if (isAuthPath && user) {
    const redirectResponse = NextResponse.redirect(new URL('/feed', request.url))
    supabaseResponse.cookies.getAll().forEach(cookie => redirectResponse.cookies.set(cookie))
    return redirectResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
