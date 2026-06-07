'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function MarkActivityRead({ userId }: { userId: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .then(({ error }) => {
        if (error) {
          console.error('[MarkActivityRead] failed to mark notifications as read:', error)
        } else {
          // ルーターキャッシュを無効化してバッジが消えるよう再取得させる
          router.refresh()
        }
      })
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
