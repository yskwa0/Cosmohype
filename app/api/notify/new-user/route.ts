import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyNewUser } from '@/lib/notifications/notifyNewUser'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  // プロフィールはDB直読み（リクエストボディを信頼しない）
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, style_id, created_at, updated_at')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ ok: false }, { status: 404 })

  // 新規作成（INSERT）時は created_at == updated_at。
  // BEFORE UPDATE トリガーが updated_at を更新するため、
  // 一度でも編集されると updated_at > created_at になる。
  // また、作成から 30 分以上経過したプロフィールは新規とみなさない。
  const createdAt = new Date(profile.created_at)
  const updatedAt = new Date(profile.updated_at)
  const diffMs = updatedAt.getTime() - createdAt.getTime()
  const ageMs = Date.now() - createdAt.getTime()

  const isNewProfile = diffMs < 60_000 && ageMs < 30 * 60_000
  if (!isNewProfile) {
    return NextResponse.json({ ok: true })
  }

  // webhook失敗でもユーザー登録は成功扱い（notifyNewUser内でcatch済み）
  await notifyNewUser({
    username: profile.username,
    displayName: profile.display_name ?? null,
    styleId: profile.style_id ?? null,
    createdAt: profile.created_at,
  })

  return NextResponse.json({ ok: true })
}
