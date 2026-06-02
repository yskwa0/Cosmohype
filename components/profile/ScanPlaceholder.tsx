'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { BarcodeScanner } from 'capacitor-barcode-scanner'

const ALLOWED_ORIGINS = [
  'https://cosmohype.app',
  'https://cosmohype.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
]

// NEXT_PUBLIC_APP_URL が別オリジンなら追加
const appUrl = process.env.NEXT_PUBLIC_APP_URL
if (appUrl) {
  try {
    const origin = new URL(appUrl).origin
    if (!ALLOWED_ORIGINS.includes(origin)) ALLOWED_ORIGINS.push(origin)
  } catch {
    // 不正なURLは無視
  }
}

// /profile/{username} の形かつ特殊パスでないか確認
function extractProfileUsername(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (!ALLOWED_ORIGINS.includes(url.origin)) return null

  // pathname は /profile/{username} の厳密な形のみ許可
  const match = url.pathname.match(/^\/profile\/([^/]+)$/)
  if (!match) return null

  const username = match[1]
  // 内部予約パスを除外
  const reserved = new Set(['me', 'cosmo-code', 'edit', 'follow-activity', 'notifications', 'privacy', 'setup'])
  if (reserved.has(username)) return null
  if (!username) return null

  return username
}

export function ScanPlaceholder() {
  const router = useRouter()
  const [isNative, setIsNative] = useState<boolean | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform())
  }, [])

  const handleScan = async () => {
    setError(null)
    setIsScanning(true)
    try {
      const res = await BarcodeScanner.scan()
      if (!res.result || !res.code) return

      const username = extractProfileUsername(res.code)
      if (username) {
        router.push(`/profile/${username}`)
      } else {
        setError('CosmohypeのQRではありません')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message.toLowerCase() : String(e).toLowerCase()
      if (msg.includes('permission') || msg.includes('denied') || msg.includes('camera')) {
        setError('カメラの使用が許可されていません。設定アプリ → Cosmohype → カメラをオンにしてください。')
      } else {
        setError('スキャンに失敗しました。もう一度お試しください。')
      }
    } finally {
      setIsScanning(false)
    }
  }

  if (isNative === null) return null

  if (!isNative) {
    return (
      <div
        className="w-full max-w-xs rounded-2xl px-5 py-4 text-center text-sm leading-relaxed"
        style={{
          background: 'rgba(124,58,237,0.08)',
          border: '1px solid rgba(124,58,237,0.2)',
          color: 'rgba(167,139,250,0.8)',
        }}
      >
        スキャン機能はアプリからご利用ください
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xs">
      <button
        onClick={handleScan}
        disabled={isScanning}
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-semibold text-sm transition-opacity active:opacity-70 disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
          color: '#fff',
          boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
        }}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
        </svg>
        {isScanning ? 'スキャン中...' : 'カメラを起動'}
      </button>

      {error && (
        <div
          className="w-full rounded-2xl px-4 py-3 text-xs text-center leading-relaxed"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: 'rgba(252,165,165,0.9)',
          }}
        >
          {error}
        </div>
      )}
    </div>
  )
}
