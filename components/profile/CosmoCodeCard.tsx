'use client'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { Avatar } from '@/components/ui/Avatar'

type Props = {
  username: string
  displayName: string | null
  avatarUrl: string | null
  profileUrl: string
}

export function CosmoCodeCard({ username, displayName, avatarUrl, profileUrl }: Props) {
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

      {/* スキャンボタン */}
      <Link
        href="/profile/cosmo-code/scan"
        className="flex items-center justify-center gap-2 w-full max-w-xs py-3.5 rounded-2xl font-semibold text-sm transition-opacity active:opacity-70"
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
        友達のコードをスキャン
      </Link>
    </div>
  )
}
