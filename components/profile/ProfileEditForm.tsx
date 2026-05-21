'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StyleAlien } from '@/components/style-id/StyleAlien'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import type { Profile } from '@/types/database'
import type { StyleId } from '@/lib/style-id/types'

const ALL_STYLES = Object.values(STYLE_TYPES)

const STYLE_TAGS = ['ストリート', 'カジュアル', 'フェミニン', 'モード', 'ヴィンテージ', 'スポーツ', 'ナチュラル', 'ゴシック', 'ミリタリー', 'ワーク']

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

export function ProfileEditForm({ profile }: { profile: Profile }) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [selectedTags, setSelectedTags] = useState<string[]>(profile.style_tags ?? [])
  const [selectedTheme, setSelectedTheme] = useState(profile.theme ?? 'cosmic-black')
  const [selectedStyleId, setSelectedStyleId] = useState<StyleId | null>(
    (profile.style_id as StyleId) ?? null
  )
  const [isPrivate, setIsPrivate] = useState(profile.is_private ?? false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
    if (!ALLOWED.includes(file.type)) {
      setErrors(prev => ({ ...prev, avatar: 'JPEG / PNG / WebP のみ対応しています' }))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, avatar: '5MB以下のファイルを選択してください' }))
      return
    }
    setErrors(prev => ({ ...prev, avatar: '' }))
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      let avatarUrl = profile.avatar_url

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `${profile.id}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = data.publicUrl
      }

      const { error } = await supabase.from('profiles').update({
        display_name: displayName.trim() || profile.username,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        style_tags: selectedTags,
        style_id: selectedStyleId,
        theme: selectedTheme,
        is_private: isPrivate,
      }).eq('id', profile.id)

      if (error) throw error

      window.location.href = `/profile/${profile.username}`
    } catch (err) {
      console.error(err)
      setErrors({ submit: '保存に失敗しました。もう一度お試しください。' })
    } finally {
      setLoading(false)
    }
  }

  const currentAvatar = avatarPreview ?? profile.avatar_url

  return (
    <div className="pb-10">
      <div className="max-w-md mx-auto px-5 pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
            >
              {currentAvatar ? (
                <Image src={currentAvatar} alt="avatar" fill className="object-cover" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-white/80" fill="currentColor">
                  <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              )}
              <div className="absolute inset-0 bg-black/20 flex items-end justify-center pb-1">
                <span className="text-white text-[10px] font-medium">変更</span>
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
            {errors.avatar && <p className="text-xs text-red-500">{errors.avatar}</p>}
          </div>

          {/* Username (readonly) */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--label-text)' }}>ユーザーネーム</label>
            <p className="px-4 py-3 rounded-xl border text-sm opacity-50 cursor-not-allowed"
              style={{ background: 'var(--input-bg)', color: 'var(--input-text)', borderColor: 'var(--input-border)' }}>
              @{profile.username}
            </p>
          </div>

          <Input
            label="表示名"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="あなたの名前"
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--label-text)' }}>自己紹介</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="あなたのスタイルや好きなブランドを教えてください"
              maxLength={160}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border resize-none focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 transition-colors text-sm"
              style={{ background: 'var(--input-bg)', color: 'var(--input-text)', borderColor: 'var(--input-border)' }}
            />
            <p className="text-xs text-right" style={{ color: 'var(--hint-text)' }}>{bio.length}/160</p>
          </div>

          {/* Style Tags */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium" style={{ color: 'var(--label-text)' }}>スタイルタグ（任意）</p>
            <div className="flex flex-wrap gap-2">
              {STYLE_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                  style={selectedTags.includes(tag)
                    ? { background: 'var(--purple)', color: '#fff' }
                    : { background: 'var(--bg-subtle)', color: 'var(--text-sub)', border: '1px solid var(--border)' }
                  }
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* STYLE ID Picker */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium" style={{ color: 'var(--label-text)' }}>STYLE ID（任意）</p>
              {selectedStyleId && (
                <button
                  type="button"
                  onClick={() => setSelectedStyleId(null)}
                  className="text-xs active:opacity-60"
                  style={{ color: 'var(--text-muted)' }}
                >
                  選択解除
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {ALL_STYLES.map(s => {
                const isSelected = selectedStyleId === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStyleId(isSelected ? null : s.id as StyleId)}
                    className="flex flex-col items-center gap-1 py-2 rounded-2xl transition-all duration-100 active:scale-[0.93]"
                    style={{
                      background: isSelected ? 'var(--purple-dim)' : 'var(--bg-elevated)',
                      border: `1.5px solid ${isSelected ? 'var(--purple)' : 'var(--border)'}`,
                    }}
                  >
                    <StyleAlien styleId={s.id as StyleId} size={44} />
                    <span
                      className="text-[10px] font-semibold leading-tight text-center px-1"
                      style={{ color: isSelected ? 'var(--purple)' : 'var(--text-muted)' }}
                    >
                      {s.name.split(' ')[0]}
                    </span>
                  </button>
                )
              })}
            </div>
            {selectedStyleId && (
              <div
                className="flex items-center gap-3 rounded-2xl px-3 py-2"
                style={{ background: 'var(--purple-dim)', border: '1px solid var(--border)' }}
              >
                <StyleAlien styleId={selectedStyleId} size={36} />
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{STYLE_TYPES[selectedStyleId].name}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{STYLE_TYPES[selectedStyleId].subtitle}</p>
                </div>
              </div>
            )}
          </div>

          {/* Theme Picker */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium" style={{ color: 'var(--label-text)' }}>背景テーマ</p>
            <div className="grid grid-cols-2 gap-3">
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedTheme(theme.id)}
                  className="relative rounded-2xl overflow-hidden transition-all"
                  style={{
                    outline: selectedTheme === theme.id ? `2px solid var(--purple)` : '2px solid transparent',
                    outlineOffset: '2px',
                  }}
                >
                  <div className="h-24 relative overflow-hidden" style={{ background: theme.bg }}>
                    {theme.hasStars && (
                      <div className="absolute inset-0">
                        {[
                          { x: '20%', y: '25%', size: 2, purple: false },
                          { x: '55%', y: '15%', size: 1.5, purple: true },
                          { x: '75%', y: '40%', size: 2.5, purple: false },
                          { x: '35%', y: '60%', size: 1, purple: true },
                          { x: '85%', y: '70%', size: 1.5, purple: false },
                          { x: '10%', y: '75%', size: 2, purple: true },
                          { x: '60%', y: '80%', size: 1, purple: false },
                        ].map((star, i) => (
                          <div key={i} className="absolute rounded-full"
                            style={{
                              left: star.x, top: star.y,
                              width: star.size, height: star.size,
                              background: star.purple ? '#C084FC' : '#fff',
                              opacity: 0.8,
                            }} />
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
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: theme.accent }}>
                      <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="currentColor">
                        <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs" style={{ color: 'var(--hint-text)' }}>
              保存後、次のページ読み込みで反映されます
            </p>
          </div>

          {/* Private Account Toggle */}
          <div
            className="flex items-center justify-between rounded-2xl px-4 py-4"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <div className="flex flex-col gap-0.5 pr-4">
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>非公開アカウント</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                オンにすると、あなたのプロフィールはCOSMOなどの公開一覧に表示されません。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPrivate(prev => !prev)}
              className="relative flex-shrink-0 w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none"
              style={{ background: isPrivate ? 'var(--purple)' : 'var(--border)' }}
              aria-checked={isPrivate}
              role="switch"
            >
              <span
                className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200"
                style={{ transform: isPrivate ? 'translateX(20px)' : 'translateX(0px)' }}
              />
            </button>
          </div>

          {errors.submit && (
            <p className="text-sm text-red-500 rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)' }}>{errors.submit}</p>
          )}

          <Button type="submit" loading={loading} fullWidth className="h-12">
            保存する
          </Button>
        </form>
      </div>
    </div>
  )
}
