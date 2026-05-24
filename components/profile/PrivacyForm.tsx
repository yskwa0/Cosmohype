'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function PrivacyForm({ userId, initialIsPrivate }: { userId: string; initialIsPrivate: boolean }) {
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function toggle() {
    const next = !isPrivate
    setIsPrivate(next)
    setSaving(true)
    await supabase.from('profiles').update({ is_private: next }).eq('id', userId)
    setSaving(false)
  }

  return (
    <div className="px-4 py-2">
      <div
        className="flex items-center justify-between px-4 py-4 rounded-2xl"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
      >
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            非公開アカウント
          </p>
          <ul className="text-xs mt-1 leading-relaxed space-y-0.5" style={{ color: 'var(--text-muted)' }}>
            <li>オンにすると、承認したユーザーだけがあなたの投稿を見られます</li>
            <li>COSMOに表示されなくなります</li>
            <li>HYPEに参加できなくなります</li>
          </ul>
        </div>

        <button
          onClick={toggle}
          disabled={saving}
          aria-label={isPrivate ? '非公開をオフにする' : '非公開をオンにする'}
          style={{
            flexShrink: 0,
            width: 51,
            height: 31,
            borderRadius: 999,
            background: isPrivate ? 'var(--purple)' : 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            position: 'relative',
            transition: 'background 200ms ease',
            opacity: saving ? 0.6 : 1,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 3,
              left: isPrivate ? 23 : 3,
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
    </div>
  )
}
