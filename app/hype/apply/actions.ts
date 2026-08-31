'use server'

// =============================================================================
// app/hype/apply/actions.ts
//
// 公開 HYPE 出店申請の Server Action。
// - 未認証 (anon) からも呼べる SECURITY DEFINER RPC を叩く
// - Server 側で rate limit / basic validation / IP hash / 二重 submit ガード
// - client には raw エラーメッセージを露出しない (code のみ)
// =============================================================================

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { hashIp } from '@/lib/hype/tokens'
import { checkApplyRateLimit } from '@/lib/hype/rateLimit'
import { verifyTurnstile } from '@/lib/hype/turnstile'

const MAX_BRAND_NAME = 100
const MAX_CONTACT_NAME = 100
const MAX_URL = 500
const MAX_NOTES = 500
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i
const HTTPS_RE = /^https?:\/\//i

function s(fd: FormData, key: string): string {
  const v = fd.get(key)
  return typeof v === 'string' ? v.trim() : ''
}
function opt(v: string): string | null {
  return v.length === 0 ? null : v
}

export async function submitHypeApplicationAction(formData: FormData): Promise<void> {
  const brandName    = s(formData, 'brand_name')
  const contactName  = s(formData, 'contact_name')
  const contactEmail = s(formData, 'contact_email').toLowerCase()
  const websiteUrl   = s(formData, 'website_url')
  const instagramUrl = s(formData, 'instagram_url')
  const notes        = s(formData, 'notes')

  const err = (code: string): never => {
    redirect(`/hype/apply?err=${encodeURIComponent(code)}`)
  }

  // Basic validation
  if (!brandName || brandName.length > MAX_BRAND_NAME) return err('brand_name_invalid')
  if (!contactName || contactName.length > MAX_CONTACT_NAME) return err('contact_name_invalid')
  if (!contactEmail || contactEmail.length > 200 || !EMAIL_RE.test(contactEmail)) return err('contact_email_invalid')
  if (websiteUrl && (websiteUrl.length > MAX_URL || !HTTPS_RE.test(websiteUrl))) return err('website_url_invalid')
  if (instagramUrl && (instagramUrl.length > MAX_URL || !HTTPS_RE.test(instagramUrl))) return err('instagram_url_invalid')
  if (notes && notes.length > MAX_NOTES) return err('notes_too_long')

  // IP hash (Vercel: x-forwarded-for、ローカル: request のリモート IP)
  const h = await headers()
  const xff = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null
  const ipHash = hashIp(xff)

  // Turnstile: client-only 判定禁止、必ず server-side verify
  const turnstileToken = s(formData, 'cf-turnstile-response')
  const tsRes = await verifyTurnstile({ token: turnstileToken, ip: xff })
  if (!tsRes.ok) {
    if (tsRes.reason === 'missing_token') return err('captcha_required')
    return err('captcha_failed')
  }

  // Rate limit
  const rl = await checkApplyRateLimit({ ipHash })
  if (!rl.ok) return err(rl.reason ?? 'rate_limited')

  // RPC 呼出 (anon key で OK。 SECURITY DEFINER)
  const supabase = await createClient()
  const loose = supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: string | null; error: { code?: string; message?: string } | null }>
  }
  const { error } = await loose.rpc('shop_hype_submit_application', {
    p_brand_name:    brandName,
    p_contact_name:  contactName,
    p_contact_email: contactEmail,
    p_website_url:   opt(websiteUrl),
    p_instagram_url: opt(instagramUrl),
    p_notes:         opt(notes),
    p_ip_hash:       ipHash,
  })

  if (error) {
    // PG code 23505 (duplicate_pending_application) — 同一メール pending 重複
    const msg = (error.message ?? '').toLowerCase()
    if (msg.includes('duplicate_pending_application') || error.code === '23505') {
      return err('duplicate_pending_application')
    }
    console.error('[hype/apply] submit failed', error)
    return err('submit_failed')
  }

  redirect('/hype/apply/thanks')
}
