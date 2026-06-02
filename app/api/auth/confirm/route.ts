import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ token_hash, type })

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  let needsSetup = true
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
    needsSetup = !profile
  }

  // Let the client page detect Capacitor and decide where to navigate.
  return NextResponse.redirect(`${origin}/auth/confirmed?setup=${needsSetup ? '1' : '0'}`)
}
