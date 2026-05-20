'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ImageUpload } from './ImageUpload'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function PostForm({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = createClient()

  const [images, setImages] = useState<File[]>([])
  const [caption, setCaption] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [brandInput, setBrandInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [brandTags, setBrandTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function addTag(input: string, setter: (v: string[]) => void, current: string[], clearInput: () => void) {
    const tag = input.trim().replace(/^#/, '').toLowerCase()
    if (tag && !current.includes(tag) && current.length < 10) {
      setter([...current, tag])
      clearInput()
    }
  }

  function removeTag(tag: string, current: string[], setter: (v: string[]) => void) {
    setter(current.filter(t => t !== tag))
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (images.length === 0) newErrors.images = '画像を1枚以上追加してください'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          caption: caption.trim() || null,
          tags,
          brand_tags: brandTags,
        })
        .select()
        .single()

      if (postError) throw postError

      const uploadPromises = images.map(async (file, i) => {
        if (!ALLOWED_TYPES.includes(file.type)) return
        const ext = file.name.split('.').pop()
        const path = `${userId}/${post.id}/${i}.${ext}`
        const { error } = await supabase.storage
          .from('posts')
          .upload(path, file, { contentType: file.type })
        if (error) throw error

        const { data } = supabase.storage.from('posts').getPublicUrl(path)
        await supabase.from('post_images').insert({
          post_id: post.id,
          url: data.publicUrl,
          display_order: i,
        })
      })

      await Promise.all(uploadPromises)
      router.push('/feed')
      router.refresh()
    } catch (err) {
      console.error(err)
      setErrors({ submit: '投稿に失敗しました。もう一度お試しください。' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 pb-10">
      <div>
        <p className="text-sm font-medium mb-2" style={{ color: 'var(--label-text)' }}>コーデ写真 *</p>
        <ImageUpload files={images} onChange={setImages} error={errors.images} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: 'var(--label-text)' }}>キャプション</label>
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="コーデについて教えてください..."
          maxLength={500}
          rows={3}
          className="w-full px-4 py-3 rounded-xl border resize-none focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 transition-colors text-sm"
          style={{ background: 'var(--input-bg)', color: 'var(--input-text)', borderColor: 'var(--input-border)' }}
        />
        <p className="text-xs text-right" style={{ color: 'var(--hint-text)' }}>{caption.length}/500</p>
      </div>

      <div className="flex flex-col gap-2">
        <Input
          label="ブランドタグ"
          value={brandInput}
          onChange={e => setBrandInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag(brandInput, setBrandTags, brandTags, () => setBrandInput(''))
            }
          }}
          placeholder="ZARA, UNIQLO... (Enterで追加)"
          hint="着用ブランドを追加（最大10個）"
        />
        {brandTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {brandTags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full"
                style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)', border: '1px solid var(--tag-border)' }}>
                #{tag}
                <button type="button" onClick={() => removeTag(tag, brandTags, setBrandTags)} aria-label={`${tag}を削除`}>
                  <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Input
          label="タグ"
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag(tagInput, setTags, tags, () => setTagInput(''))
            }
          }}
          placeholder="カジュアル, ストリート... (Enterで追加)"
        />
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                #{tag}
                <button type="button" onClick={() => removeTag(tag, tags, setTags)} aria-label={`${tag}を削除`}>
                  <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {errors.submit && (
        <p className="text-sm text-red-500 rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)' }}>{errors.submit}</p>
      )}

      <Button type="submit" loading={loading} fullWidth className="h-12">
        投稿する
      </Button>
    </form>
  )
}
