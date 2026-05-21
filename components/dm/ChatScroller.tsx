'use client'
import { useEffect, useRef } from 'react'

export function ChatScroller() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'instant' })
  }, [])
  return <div ref={ref} />
}
