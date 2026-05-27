'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AvatarCropper } from '@/components/ui/AvatarCropper'
import { StyleAlien } from '@/components/style-id/StyleAlien'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import type { Profile } from '@/types/database'
import type { StyleId } from '@/lib/style-id/types'

const ALL_STYLES = Object.values(STYLE_TYPES)

const STYLE_TAGS = ['ストリート', 'カジュアル', 'フェミニン', 'モード', 'ヴィンテージ', 'スポーツ', 'ナチュラル', 'ゴシック', 'ミリタリー', 'ワーク']

export function ProfileEditForm({ profile }: { profile: Profile }) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [username, setUsername] = useState(profile.username)
  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [selectedTags, setSelectedTags] = useState<string[]>(profile.style_tags ?? [])
  const [selectedStyleId, setSelectedStyleId] = useState<StyleId | null>(
    (profile.style_id as StyleId) ?? null
  )
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [cropperSrc, setCropperSrc] = useState<string | null>(null)
  const [cropperExiting, setCropperExiting] = useState(false)
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
    e.target.value = ''

    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
    if (!ALLOWED.includes(file.type)) {
      setErrors(prev => ({ ...prev, avatar: 'JPEG / PNG / WebP のみ対応しています' }))
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, avatar: '10MB以下のファイルを選択してください' }))
      return
    }

    setErrors(prev => ({ ...prev, avatar: '' }))
    setCropperExiting(false)
    setCropperSrc(URL.createObjectURL(file))
  }

  function handleCropConfirm(blob: Blob) {
    if (cropperSrc) URL.revokeObjectURL(cropperSrc)
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setCropperSrc(null)
  }

  function handleCropCancel() {
    if (cropperSrc) URL.revokeObjectURL(cropperSrc)
    setCropperSrc(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    const newUsername = username.trim().toLowerCase()
    const usernameChanged = newUsername !== profile.username

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(newUsername)) {
      setErrors({ username: '3〜30文字の英数字・アンダースコアのみ使用できます' })
      return
    }

    setLoading(true)
    try {
      if (usernameChanged) {
        // Monthly limit: max 2 changes per calendar month
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const { count } = await supabase
          .from('username_changes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .gte('changed_at', startOfMonth.toISOString())

        if ((count ?? 0) >= 2) {
          setErrors({ username: 'ユーザーネームの変更は月2回までです。来月以降に変更してください。' })
          return
        }

        // Uniqueness check
        const { data: taken } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', newUsername)
          .neq('id', profile.id)
          .maybeSingle()

        if (taken) {
          setErrors({ username: 'このユーザーネームは既に使われています' })
          return
        }
      }

      let avatarUrl = profile.avatar_url

      if (avatarFile) {
        const path = `${profile.id}/avatar.jpg`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true, contentType: 'image/jpeg' })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = `${data.publicUrl}?t=${Date.now()}`
      }

      const { error } = await supabase.from('profiles').update({
        username: newUsername,
        display_name: displayName.trim() || newUsername,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        style_tags: selectedTags,
        style_id: selectedStyleId,
      }).eq('id', profile.id)

      if (error) {
        if (error.code === '23505') {
          setErrors({ username: 'このユーザーネームは既に使われています' })
          return
        }
        throw error
      }

      if (usernameChanged) {
        await supabase.from('username_changes').insert({ user_id: profile.id })
      }

      window.location.href = `/profile/${newUsername}`
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

          {cropperSrc && (
            <>
              <div
                className="fixed inset-0 bg-black pointer-events-none"
                style={{
                  zIndex: 9997,
                  opacity: cropperExiting ? 0 : 1,
                  transition: cropperExiting ? 'opacity 260ms ease-in' : 'none',
                }}
              />
              <AvatarCropper
                src={cropperSrc}
                onConfirm={handleCropConfirm}
                onCancel={handleCropCancel}
                onExitStart={() => setCropperExiting(true)}
              />
            </>
          )}

          <Input
            label="ユーザーネーム"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder={profile.username}
            error={errors.username}
            hint="3〜30文字・英数字・アンダースコアのみ｜月2回まで変更可"
          />

          <Input
            label="名前"
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
