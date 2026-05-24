'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function MarkFollowActivityRead({ userId }: { userId: string }) {
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('profiles')
      .update({ follow_activity_last_read_at: new Date().toISOString() })
      .eq('id', userId)
      .then(() => {})
  }, [userId])

  return null
}
