import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { targetUserId } = body
    console.log('[api/dm/start] POST called, targetUserId:', targetUserId)

    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 })
    }

    // ユーザー検証はanon client（JWT検証あり）
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('[api/dm/start] user:', user?.id ?? 'null', 'authError:', authError?.message ?? 'none')

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'cannot DM yourself' }, { status: 400 })
    }

    // DB操作はadmin client（service role）。ユーザー確認済みのサーバーサイドのみ使用。
    const db = createAdminClient()

    // 双方向ブロック確認（自分→相手、相手→自分）
    const { data: blockRows } = await db
      .from('blocks')
      .select('id')
      .or(
        `and(blocker_id.eq.${user.id},blocked_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_id.eq.${user.id})`
      )

    if (blockRows && blockRows.length > 0) {
      return NextResponse.json({ error: 'blocked' }, { status: 403 })
    }

    // 相互フォロー確認
    const [{ data: iFollow }, { data: theyFollow }] = await Promise.all([
      db.from('follows').select('id')
        .eq('follower_id', user.id).eq('following_id', targetUserId).maybeSingle(),
      db.from('follows').select('id')
        .eq('follower_id', targetUserId).eq('following_id', user.id).maybeSingle(),
    ])

    if (!iFollow || !theyFollow) {
      return NextResponse.json({ error: 'not_mutual_follow' }, { status: 403 })
    }

    // 既存会話を検索
    const { data: myConvs } = await db
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)

    const myConvIds = (myConvs ?? []).map(c => c.conversation_id)
    let conversationId: string | null = null

    if (myConvIds.length > 0) {
      const { data: shared } = await db
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', targetUserId)
        .in('conversation_id', myConvIds)
        .limit(1)
        .maybeSingle()

      conversationId = shared?.conversation_id ?? null
    }

    // 既存会話の双方向ブロック確認（is_dm_blocked は user_blocks を参照するため、
    // blocks テーブルで確認済みだが念のため既存会話でも確認）
    if (conversationId) {
      const { data: isBlocked } = await db
        .rpc('is_dm_blocked', { conv_id: conversationId })

      if (isBlocked) {
        return NextResponse.json({ error: 'blocked' }, { status: 403 })
      }
    }

    // 会話がなければ新規作成
    if (!conversationId) {
      const { data: newConv, error: convError } = await db
        .from('conversations')
        .insert({})
        .select('id')
        .single()

      console.log('[api/dm/start] conversations insert:', newConv?.id ?? 'null', 'error:', convError?.message ?? 'none', convError?.code ?? '')

      if (convError || !newConv) {
        return NextResponse.json({
          error: 'conversations insert failed',
          message: convError?.message,
          code: convError?.code,
          details: convError?.details,
        }, { status: 500 })
      }

      conversationId = newConv.id

      const { error: selfError } = await db
        .from('conversation_participants')
        .insert({ conversation_id: conversationId, user_id: user.id })

      console.log('[api/dm/start] self participant insert error:', selfError?.message ?? 'none')

      if (selfError) {
        return NextResponse.json({
          error: 'self participant insert failed',
          message: selfError?.message,
          code: selfError?.code,
        }, { status: 500 })
      }

      const { error: targetError } = await db
        .from('conversation_participants')
        .insert({ conversation_id: conversationId, user_id: targetUserId })

      console.log('[api/dm/start] target participant insert error:', targetError?.message ?? 'none')
    }

    console.log('[api/dm/start] returning conversationId:', conversationId)
    return NextResponse.json({ conversationId })

  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[api/dm/start] unexpected exception:', message)
    return NextResponse.json({ error: 'unexpected exception', message }, { status: 500 })
  }
}
