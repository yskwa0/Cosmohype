'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { BarcodeScanner } from 'capacitor-barcode-scanner'
import { QRCodeSVG } from 'qrcode.react'
import { Avatar } from '@/components/ui/Avatar'

type Props = {
  username: string
  displayName: string | null
  avatarUrl: string | null
  profileUrl: string
}

const ALLOWED_ORIGINS = [
  'https://cosmohype.app',
  'https://cosmohype.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
]
const appUrl = process.env.NEXT_PUBLIC_APP_URL
if (appUrl) {
  try {
    const origin = new URL(appUrl).origin
    if (!ALLOWED_ORIGINS.includes(origin)) ALLOWED_ORIGINS.push(origin)
  } catch { /* 不正なURLは無視 */ }
}

function extractProfileUsername(raw: string): string | null {
  let url: URL
  try { url = new URL(raw) } catch { return null }
  if (!ALLOWED_ORIGINS.includes(url.origin)) return null
  const match = url.pathname.match(/^\/profile\/([^/]+)$/)
  if (!match) return null
  const name = match[1]
  const reserved = new Set(['me', 'cosmo-code', 'edit', 'follow-activity', 'notifications', 'privacy', 'setup'])
  if (!name || reserved.has(name)) return null
  return name
}

export function CosmoCodeCard({ username, displayName, avatarUrl, profileUrl }: Props) {
  const router = useRouter()
  const [isNative, setIsNative] = useState<boolean | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [devDetail, setDevDetail] = useState<string | null>(null)

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform())
  }, [])

  const handleScan = async () => {
    setScanError(null)
    setDevDetail(null)
    setIsScanning(true)
    try {
      const res = await BarcodeScanner.scan()
      console.log('[CosmoCode] scan result:', JSON.stringify(res))
      if (!res.result || !res.code) return
      const scannedUsername = extractProfileUsername(res.code)
      if (scannedUsername) {
        router.push(`/profile/${scannedUsername}`)
      } else {
        setScanError('CosmohypeのQRではありません')
      }
    } catch (e) {
      if (e instanceof Error) {
        console.error('[CosmoCode] scan error name:', e.name)
        console.error('[CosmoCode] scan error message:', e.message)
        console.error('[CosmoCode] scan error stack:', e.stack)
        setDevDetail(`name: ${e.name}\nmessage: ${e.message}`)
      } else {
        const raw = (() => { try { return JSON.stringify(e) } catch { return String(e) } })()
        console.error('[CosmoCode] scan error (non-Error):', raw)
        setDevDetail(`raw: ${raw}`)
      }
      const msg = e instanceof Error ? e.message.toLowerCase() : String(e).toLowerCase()
      if (msg.includes('permission') || msg.includes('denied') || msg.includes('camera')) {
        setScanError('カメラの使用が許可されていません。設定アプリ → Cosmohype → カメラをオンにしてください。')
      } else {
        setScanError('スキャンに失敗しました。もう一度お試しください。')
      }
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="flex flex-col items-center px-6 py-10 gap-8">
      {/* カード */}
      <div
        className="relative w-full max-w-xs rounded-3xl overflow-hidden flex flex-col items-center gap-5 px-7 pt-8 pb-7"
        style={{
          background: 'linear-gradient(160deg, #1a0050 0%, #0D0529 60%, #150040 100%)',
          border: '1px solid rgba(124,58,237,0.35)',
          boxShadow: '0 0 60px rgba(124,58,237,0.15)',
        }}
      >
        {/* 星 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
          {[
            [12, 18, 0.9], [55, 10, 0.7], [88, 22, 0.5],
            [22, 72, 0.6], [78, 60, 0.8], [93, 85, 0.5],
            [45, 90, 0.6], [8, 45, 0.4], [70, 38, 0.7],
          ].map(([cx, cy, op], i) => (
            <circle key={i} cx={`${cx}%`} cy={`${cy}%`} r="1" fill="white" opacity={op * 0.5} />
          ))}
        </svg>

        {/* ラベル */}
        <p className="relative text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: 'rgba(167,139,250,0.8)' }}>
          COSMO CODE
        </p>

        {/* アバター */}
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full blur-xl opacity-50"
            style={{ background: 'radial-gradient(circle, #7C3AED, transparent)' }}
          />
          <Avatar src={avatarUrl} username={username} size="xl" className="relative" />
        </div>

        {/* 名前 */}
        <div className="relative text-center">
          {displayName && (
            <p className="text-base font-black" style={{ color: 'var(--text)' }}>
              {displayName}
            </p>
          )}
          <p className="text-sm" style={{ color: 'rgba(167,139,250,0.7)' }}>
            @{username}
          </p>
        </div>

        {/* QRコード */}
        <div
          className="relative rounded-2xl p-4"
          style={{ background: '#ffffff' }}
        >
          <QRCodeSVG
            value={profileUrl}
            size={168}
            bgColor="#ffffff"
            fgColor="#1a0050"
            level="M"
          />
        </div>

        {/* キャプション */}
        <p className="relative text-xs text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
          このコードを友達に見せて<br />プロフィールをシェア
        </p>
      </div>

      {/* スキャンボタンエリア */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        {isNative === null ? null : isNative ? (
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
            {isScanning ? 'スキャン中...' : '友達のコードをスキャン'}
          </button>
        ) : (
          <div
            className="w-full rounded-2xl px-5 py-4 text-center text-sm leading-relaxed"
            style={{
              background: 'rgba(124,58,237,0.08)',
              border: '1px solid rgba(124,58,237,0.2)',
              color: 'rgba(167,139,250,0.8)',
            }}
          >
            スキャン機能はアプリからご利用ください
          </div>
        )}

        {scanError && (
          <div
            className="w-full rounded-2xl px-4 py-3 text-xs text-center leading-relaxed"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: 'rgba(252,165,165,0.9)',
            }}
          >
            {scanError}
          </div>
        )}

        {process.env.NODE_ENV !== 'production' && devDetail && (
          <div
            className="w-full rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap break-all"
            style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,200,100,0.9)',
              fontFamily: 'monospace',
            }}
          >
            <p className="font-bold mb-1" style={{ color: 'rgba(255,200,100,1)' }}>[dev] error detail</p>
            {devDetail}
          </div>
        )}
      </div>
    </div>
  )
}
