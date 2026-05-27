'use client'
import { useEffect, useRef } from 'react'
import { logEvent } from '@/lib/analytics'

interface Props {
  event: string
  params?: Record<string, string | number | boolean>
}

/** Server Component のページに置くだけでページビューイベントを送信する。 */
export function PageTracker({ event, params }: Props) {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    logEvent(event, params)
  }, [event, params])
  return null
}
