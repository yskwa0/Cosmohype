'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const THEMES = [
  {
    id: 'cosmic-black',
    label: 'Cosmic Black',
    description: '宇宙の闇と紫の輝き',
    bg: '#090714',
    accent: '#A855F7',
    hasStars: true,
    textColor: '#F5F3FF',
    subColor: '#8B7AAF',
  },
  {
    id: 'cream-white',
    label: 'Cream White',
    description: 'シンプルでクリーンな白',
    bg: '#FAFAFA',
    accent: '#7C3AED',
    hasStars: false,
    textColor: '#111111',
    subColor: '#9B97B2',
  },
]

const STARS = [
  { x: '20%', y: '25%', size: 2,   purple: false },
  { x: '55%', y: '15%', size: 1.5, purple: true  },
  { x: '75%', y: '40%', size: 2.5, purple: false },
  { x: '35%', y: '60%', size: 1,   purple: true  },
  { x: '85%', y: '70%', size: 1.5, purple: false },
  { x: '10%', y: '75%', size: 2,   purple: true  },
  { x: '60%', y: '80%', size: 1,   purple: false },
]

export function ThemeForm({ userId, initialTheme }: { userId: string; initialTheme: string }) {
  const [selectedTheme, setSelectedTheme] = useState(initialTheme)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function handleSave() {
    if (saving) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ theme: selectedTheme }).eq('id', userId)
    setSaving(false)
    // Full refresh so SSR re-applies themeClass to <html>
    router.refresh()
    window.location.reload()
  }

  const changed = selectedTheme !== initialTheme

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {THEMES.map(theme => (
          <button
            key={theme.id}
            type="button"
            onClick={() => setSelectedTheme(theme.id)}
            className="relative rounded-2xl overflow-hidden transition-all active:scale-[0.97]"
            style={{
              outline: selectedTheme === theme.id ? '2px solid var(--purple)' : '2px solid transparent',
              outlineOffset: '2px',
            }}
          >
            <div className="h-24 relative overflow-hidden" style={{ background: theme.bg }}>
              {theme.hasStars && (
                <div className="absolute inset-0">
                  {STARS.map((star, i) => (
                    <div
                      key={i}
                      className="absolute rounded-full"
                      style={{
                        left: star.x, top: star.y,
                        width: star.size, height: star.size,
                        background: star.purple ? '#C084FC' : '#fff',
                        opacity: 0.8,
                      }}
                    />
                  ))}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-full" style={{ width: 32, height: 32, background: theme.accent, opacity: 0.2, filter: 'blur(10px)' }} />
                <div className="absolute rounded-full" style={{ width: 12, height: 12, background: theme.accent }} />
              </div>
            </div>
            <div className="px-3 py-2 text-left" style={{ background: theme.bg }}>
              <p className="text-xs font-semibold" style={{ color: theme.textColor }}>{theme.label}</p>
              <p className="text-[10px] mt-0.5" style={{ color: theme.subColor }}>{theme.description}</p>
            </div>
            {selectedTheme === theme.id && (
              <div
                className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: theme.accent }}
              >
                <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="currentColor">
                  <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      <p className="text-xs" style={{ color: 'var(--hint-text)' }}>
        保存後、アプリ全体に反映されます
      </p>

      {changed && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-11 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
          style={{
            background: saving ? 'var(--purple-dim)' : 'var(--purple)',
            color: saving ? 'var(--purple)' : '#fff',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? '保存中…' : 'テーマを保存する'}
        </button>
      )}
    </div>
  )
}
