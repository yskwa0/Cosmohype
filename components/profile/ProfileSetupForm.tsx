'use client'
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AvatarCropper } from '@/components/ui/AvatarCropper'
import { StyleAlien } from '@/components/style-id/StyleAlien'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import type { StyleId } from '@/lib/style-id/types'

const STYLE_ID_KEYS = Object.keys(STYLE_TYPES) as StyleId[]
const PENDING_STYLE_KEY = 'cosmohype_pending_style_id'

const STYLE_TAGS = ['ストリート', 'カジュアル', 'フェミニン', 'モード', 'ヴィンテージ', 'スポーツ', 'ナチュラル', 'ゴシック', 'ミリタリー', 'ワーク']

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_MB = 10

export function ProfileSetupForm({ userId }: { userId: string }) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedStyleId, setSelectedStyleId] = useState<StyleId | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [cropperSrc, setCropperSrc] = useState<string | null>(null)
  const [cropperExiting, setCropperExiting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const stored = localStorage.getItem(PENDING_STYLE_KEY)
    if (stored && STYLE_ID_KEYS.includes(stored as StyleId)) {
      setSelectedStyleId(stored as StyleId)
    }
  }, [])

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrors(prev => ({ ...prev, avatar: 'JPEG / PNG / WebP のみ対応しています' }))
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrors(prev => ({ ...prev, avatar: `${MAX_SIZE_MB}MB以下のファイルを選択してください` }))
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

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (!username.trim()) {
      newErrors.username = 'ユーザーネームは必須です'
    } else if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      newErrors.username = '3〜30文字の英数字・アンダースコアのみ使用できます'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      let avatarUrl: string | null = null

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `${userId}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = `${data.publicUrl}?t=${Date.now()}`
      }

      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        username: username.trim().toLowerCase(),
        display_name: displayName.trim() || username.trim(),
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        style_tags: selectedTags,
        style_id: selectedStyleId ?? null,
      })

      if (error) {
        if (error.code === '23505') {
          setErrors({ username: 'このユーザーネームは既に使われています' })
          setLoading(false)
          return
        }
        throw error
      }

      localStorage.removeItem(PENDING_STYLE_KEY)
      window.location.replace('/feed')
    } catch (err) {
      console.error(err)
      setErrors({ submit: 'エラーが発生しました。もう一度お試しください。' })
      setLoading(false)
    }
  }

  return (
    <div className="pb-10">
      <div className="max-w-md mx-auto px-6 pt-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>プロフィールを設定</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>あなたのスタイルを教えてください</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
            >
              {avatarPreview ? (
                <Image src={avatarPreview} alt="avatar preview" fill className="object-cover" />
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
            label="ユーザーネーム *"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="cosmohype_user"
            error={errors.username}
            hint="3〜30文字・英数字・アンダースコアのみ"
          />

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
              className="w-full px-4 py-3 rounded-xl border resize-none focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 transition-colors"
              style={{ background: 'var(--input-bg)', color: 'var(--input-text)', borderColor: 'var(--input-border)' }}
            />
            <p className="text-xs text-right" style={{ color: 'var(--hint-text)' }}>{bio.length}/160</p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium" style={{ color: 'var(--label-text)' }}>スタイルタグ（任意・複数選択可）</p>
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

          {/* STYLE ID選択 */}
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--label-text)' }}>
                STYLE ID <span className="text-xs font-normal" style={{ color: 'var(--hint-text)' }}>（任意）</span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--hint-text)' }}>あなたのファッション系統を選んでください</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {STYLE_ID_KEYS.map(id => {
                const type = STYLE_TYPES[id]
                const isSelected = selectedStyleId === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedStyleId(prev => prev === id ? null : id)}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl transition-all active:scale-[0.97]"
                    style={{
                      border: isSelected ? '2px solid var(--purple)' : '2px solid var(--border)',
                      background: isSelected ? 'var(--purple-dim)' : 'var(--bg-elevated)',
                    }}
                  >
                    <StyleAlien styleId={id} size={52} />
                    <span className="text-[11px] font-semibold text-center leading-tight" style={{ color: isSelected ? 'var(--purple)' : 'var(--text-sub)' }}>
                      {type.name}
                    </span>
                    <span className="text-[10px] text-center leading-tight" style={{ color: 'var(--text-muted)' }}>
                      {type.subtitle}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {errors.submit && (
            <p className="text-sm text-red-500 rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)' }}>{errors.submit}</p>
          )}

          <Button type="submit" loading={loading} fullWidth className="h-12 mt-2">
            はじめる
          </Button>
        </form>
      </div>
    </div>
  )
}
