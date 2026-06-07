import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications/createNotification'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    userId?: string
    type?: 'follow' | 'like' | 'comment'
    postId?: string
    commentId?: string
  }

  const { userId, type, postId, commentId } = body
  if (!userId || !type) {
    return NextResponse.json({ error: 'userId and type are required' }, { status: 400 })
  }

  await createNotification({ userId, actorId: user.id, type, postId, commentId })
  return NextResponse.json({ ok: true })
}
