'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Settings = {
  likes: boolean
  comments: boolean
  follows: boolean
  dms: boolean
  hype_results: boolean
  announcements: boolean
}

const DEFAULT: Settings = {
  likes: true,
  comments: true,
  follows: true,
  dms: true,
  hype_results: true,
  announcements: true,
}

const ITEMS: { key: keyof Settings; label: string }[] = [
  { key: 'likes',         label: 'いいねされた時' },
  { key: 'comments',      label: 'コメントされた時' },
  { key: 'follows',       label: 'フォローされた時' },
  { key: 'dms',           label: 'DMが届いた時' },
  { key: 'hype_results',  label: 'HYPEの結果通知' },
  { key: 'announcements', label: 'お知らせ通知' },
]

export function NotificationSettingsForm({
  userId,
  initial,
}: {
  userId: string
  initial: (Settings & { user_id?: string; updated_at?: string }) | null
}) {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT, ...initial })
  const [saving, setSaving] = useState<keyof Settings | null>(null)
  const supabase = createClient()

  async function toggle(key: keyof Settings) {
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)
    setSaving(key)
    await supabase
      .from('notification_settings')
      .upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() })
    setSaving(null)
  }

  return (
    <div className="px-4 py-2 flex flex-col gap-2">
      {ITEMS.map(({ key, label }, i) => (
        <div
          key={key}
          className="flex items-center justify-between px-4 py-4"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: i === 0 ? '16px 16px 4px 4px'
              : i === ITEMS.length - 1 ? '4px 4px 16px 16px'
              : '4px',
          }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            {label}
          </span>
          <button
            onClick={() => toggle(key)}
            disabled={saving === key}
            aria-label={settings[key] ? `${label}をオフにする` : `${label}をオンにする`}
            style={{
              flexShrink: 0,
              width: 51,
              height: 31,
              borderRadius: 999,
              background: settings[key] ? 'var(--purple)' : 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              position: 'relative',
              transition: 'background 200ms ease',
              opacity: saving === key ? 0.6 : 1,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 3,
                left: settings[key] ? 23 : 3,
                width: 23,
                height: 23,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                transition: 'left 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            />
          </button>
        </div>
      ))}
    </div>
  )
}
