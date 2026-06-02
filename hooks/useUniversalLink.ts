'use client'
import { useEffect } from 'react'

const ALLOWED_ORIGIN = 'https://cosmohype.jp'
const WATCH_PATHS = ['/api/auth/callback', '/api/auth/confirm']

export function useUniversalLink() {
  useEffect(() => {
    let removeListener: (() => void) | undefined

    async function setup() {
      const { Capacitor } = await import('@capacitor/core')
      if (!Capacitor.isNativePlatform()) return

      const { App } = await import('@capacitor/app')
      const handle = await App.addListener('appUrlOpen', (event) => {
        try {
          const url = new URL(event.url)
          if (url.origin !== ALLOWED_ORIGIN) return
          if (!WATCH_PATHS.some(p => url.pathname.startsWith(p))) return
          // Preserve pathname + query string, bypass App Router RSC cache
          window.location.href = url.pathname + url.search
        } catch {
          // ignore malformed URLs
        }
      })
      removeListener = () => handle.remove()
    }

    setup()
    return () => removeListener?.()
  }, [])
}
