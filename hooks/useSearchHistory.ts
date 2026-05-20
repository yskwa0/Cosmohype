'use client'
import { useState, useCallback, useEffect } from 'react'

const KEY = 'cosmohype_search_history'
const MAX = 15

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY)
      if (stored) setHistory(JSON.parse(stored))
    } catch {}
  }, [])

  const add = useCallback((keyword: string) => {
    const kw = keyword.trim()
    if (!kw) return
    setHistory(prev => {
      const updated = [kw, ...prev.filter(h => h !== kw)].slice(0, MAX)
      try { localStorage.setItem(KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
  }, [])

  const remove = useCallback((keyword: string) => {
    setHistory(prev => {
      const updated = prev.filter(h => h !== keyword)
      try { localStorage.setItem(KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
  }, [])

  const clear = useCallback(() => {
    setHistory([])
    try { localStorage.removeItem(KEY) } catch {}
  }, [])

  return { history, add, remove, clear }
}
