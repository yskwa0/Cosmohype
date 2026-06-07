import { createAdminClient } from '@/lib/supabase/server'

// NOTE: フォローリクエスト承認通知について
// 現状: approve_follow_request RPC が follows INSERT → trg_follow_notification 発火
//   → notifications(user_id=target(承認者), actor_id=requester, type='follow') が作られる
//   → 承認者が「フォローされた」通知を受け取る（正しい）
//   → リクエスト送信者(requester)には通知が届かない（UXギャップ）
//
// 将来実装する場合:
//   1. migration: ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
//      ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
//        CHECK (type IN ('like', 'comment', 'follow', 'follow_approved'));
//   2. FollowRequestItem.tsx の approve() 成功後に以下を呼ぶ:
//      await fetch('/api/notifications', { method: 'POST', body: JSON.stringify({
//        userId: requester.id,   // リクエスト送信者
//        type: 'follow_approved',
//        // actorId は API 側で auth.uid() から取得
//      })})
//   3. follow-activity/page.tsx のフィルタと表示を 'follow_approved' に対応させる

type NotificationType = 'follow' | 'like' | 'comment'

interface CreateNotificationParams {
  userId: string
  actorId: string
  type: NotificationType
  postId?: string
  commentId?: string
}

export async function createNotification({ userId, actorId, type, postId, commentId }: CreateNotificationParams) {
  if (userId === actorId) return

  const supabase = createAdminClient()

  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    actor_id: actorId,
    type,
    post_id: postId ?? null,
    comment_id: commentId ?? null,
  })

  if (error) {
    if (error.code === '23505') {
      // Unique violation — reset to unread (mirrors trigger ON CONFLICT logic)
      const q = supabase
        .from('notifications')
        .update({ is_read: false, created_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('actor_id', actorId)
        .eq('type', type)
      if (postId) await q.eq('post_id', postId)
      else await q
    } else {
      console.error('[createNotification] insert failed:', error)
    }
  }
}
