'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ImageUpload } from './ImageUpload'
import { track } from '@/lib/analytics'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type ItemDraft = {
  item_name: string
  brand_name: string
  purchase_url: string
}

const EMPTY_DRAFT: ItemDraft = { item_name: '', brand_name: '', purchase_url: '' }

export function PostForm({ userId, hypeTheme }: { userId: string; hypeTheme?: string }) {
  const router = useRouter()
  const supabase = createClient()

  const [images, setImages] = useState<File[]>([])
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '16:9'>('4:5')
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [previewIndex, setPreviewIndex] = useState(0)
  const [imagePositions, setImagePositions] = useState<{ x: number; y: number }[]>([])
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (images.length === 0) {
      setPreviewUrls([])
      setPreviewIndex(0)
      return
    }
    const urls = images.map(f => URL.createObjectURL(f))
    setPreviewUrls(urls)
    setPreviewIndex(prev => Math.min(prev, images.length - 1))
    return () => urls.forEach(u => URL.revokeObjectURL(u))
  }, [images])

  useEffect(() => {
    setImagePositions(prev => images.map((_, i) => prev[i] ?? { x: 0.5, y: 0.5 }))
  }, [images])
  const [caption, setCaption] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [brandInput, setBrandInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [brandTags, setBrandTags] = useState<string[]>([])

  const [items, setItems] = useState<ItemDraft[]>([])
  const [draftOpen, setDraftOpen] = useState(false)
  const [draft, setDraft] = useState<ItemDraft>(EMPTY_DRAFT)
  const [draftError, setDraftError] = useState('')

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

  function openDraft() {
    setDraft(EMPTY_DRAFT)
    setDraftError('')
    setDraftOpen(true)
  }

  function confirmDraft() {
    if (!draft.item_name.trim()) {
      setDraftError('アイテム名を入力してください')
      return
    }
    setItems(prev => [...prev, { ...draft, item_name: draft.item_name.trim() }])
    setDraftOpen(false)
    setDraft(EMPTY_DRAFT)
    setDraftError('')
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
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
          hype_theme: hypeTheme ?? null,
          image_aspect_ratio: aspectRatio,
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
          position_x: imagePositions[i]?.x ?? 0.5,
          position_y: imagePositions[i]?.y ?? 0.5,
        })
      })

      await Promise.all(uploadPromises)

      if (items.length > 0) {
        const { error: itemsError } = await supabase.from('post_items').insert(
          items.map((item, i) => ({
            post_id: post.id,
            item_name: item.item_name,
            brand_name: item.brand_name.trim() || null,
            purchase_url: item.purchase_url.trim() || null,
            display_order: i,
          }))
        )
        if (itemsError) throw itemsError
      }

      if (hypeTheme) {
        const { error: participationError } = await supabase
          .from('hype_participations')
          .insert({ user_id: userId, hype_theme: hypeTheme })
        if (participationError && participationError.code !== '23505') {
          console.error('hype_participations insert failed:', participationError)
        }
      }

      track.postCreateComplete(post.id)
      router.push('/feed')
      router.refresh()
    } catch (err) {
      console.error(err)
      setErrors({ submit: 'スタイルの保存に失敗しました。もう一度お試しください。' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 pb-10">
      {hypeTheme && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{ background: 'var(--purple-dim)', border: '1px solid var(--border)' }}
        >
          <span className="text-lg leading-none mt-0.5">🔥</span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--purple)' }}>
              今日のHYPE
            </p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{hypeTheme}</p>
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-medium mb-2" style={{ color: 'var(--label-text)' }}>コーデ写真 *</p>
        <ImageUpload files={images} onChange={setImages} error={errors.images} />
      </div>

      {images.length > 0 && (
        <div className="flex flex-col gap-3">
          {/* 比率プレビュー */}
          {previewUrls.length > 0 && (
            <div
              ref={previewContainerRef}
              className="overflow-hidden rounded-xl mx-auto"
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: ({ '1:1': 360, '4:5': 288, '16:9': 640 } as Record<string, number>)[aspectRatio] ?? 288,
                aspectRatio: aspectRatio.replace(':', '/'),
              }}
            >
              <img
                src={previewUrls[previewIndex]}
                alt={`プレビュー ${previewIndex + 1}`}
                draggable={false}
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover',
                  objectPosition: `${(imagePositions[previewIndex]?.x ?? 0.5) * 100}% ${(imagePositions[previewIndex]?.y ?? 0.5) * 100}%`,
                  display: 'block',
                  cursor: 'grab',
                  touchAction: 'none',
                }}
                onPointerDown={e => {
                  e.currentTarget.setPointerCapture(e.pointerId)
                  const pos = imagePositions[previewIndex] ?? { x: 0.5, y: 0.5 }
                  dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y }
                }}
                onPointerMove={e => {
                  if (!dragRef.current || !previewContainerRef.current) return
                  const { clientWidth: w, clientHeight: h } = previewContainerRef.current
                  const dx = (e.clientX - dragRef.current.startX) / w
                  const dy = (e.clientY - dragRef.current.startY) / h
                  const newX = Math.max(0, Math.min(1, dragRef.current.startPosX - dx))
                  const newY = Math.max(0, Math.min(1, dragRef.current.startPosY - dy))
                  setImagePositions(prev => prev.map((p, i) => i === previewIndex ? { x: newX, y: newY } : p))
                }}
                onPointerUp={() => { dragRef.current = null }}
                onPointerCancel={() => { dragRef.current = null }}
              />
              {images.length > 1 && (
                <>
                  {previewIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => setPreviewIndex(i => i - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.55)' }}
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                  )}
                  {previewIndex < images.length - 1 && (
                    <button
                      type="button"
                      onClick={() => setPreviewIndex(i => i + 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.55)' }}
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  )}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
                    {images.map((_, i) => (
                      <span
                        key={i}
                        style={{
                          display: 'block',
                          height: 5,
                          width: i === previewIndex ? 18 : 5,
                          borderRadius: 9999,
                          background: i === previewIndex ? 'white' : 'rgba(255,255,255,0.5)',
                          transition: 'width 180ms ease, background 180ms ease',
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {/* 比率選択ボタン */}
          <div className="flex gap-2">
            {(['1:1', '4:5', '16:9'] as const).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setAspectRatio(r)}
                className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: aspectRatio === r ? 'var(--purple)' : 'var(--bg-subtle)',
                  color: aspectRatio === r ? '#fff' : 'var(--text-muted)',
                  border: `1px solid ${aspectRatio === r ? 'var(--purple)' : 'var(--border)'}`,
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

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
          placeholder="ZARA, UNIQLO... (改行で追加)"
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
          placeholder="カジュアル, ストリート... (改行で追加)"
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

      {/* 着用アイテム */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium" style={{ color: 'var(--label-text)' }}>着用アイテム</p>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>任意</span>
        </div>

        {/* 確定済みカード */}
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-2 rounded-xl px-3 py-3"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                {item.item_name}
              </p>
              {item.brand_name && (
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                  {item.brand_name}
                </p>
              )}
              {item.purchase_url && (
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--purple)' }}>
                  {item.purchase_url}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="flex-shrink-0 mt-0.5"
              aria-label={`${item.item_name}を削除`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* 追加ボタン */}
        {!draftOpen && (
          <button
            type="button"
            onClick={openDraft}
            className="self-start text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--purple)', background: 'var(--purple-dim)', border: '1px solid var(--border)' }}
          >
            ＋ アイテムを追加
          </button>
        )}

        {/* 追加フォーム */}
        {draftOpen && (
          <div
            className="flex flex-col gap-3 rounded-2xl px-4 py-4"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
          >
            <Input
              label="アイテム名 *"
              value={draft.item_name}
              onChange={e => setDraft(d => ({ ...d, item_name: e.target.value }))}
              placeholder="例: オーバーサイズTシャツ"
            />
            <Input
              label="ブランド"
              value={draft.brand_name}
              onChange={e => setDraft(d => ({ ...d, brand_name: e.target.value }))}
              placeholder="例: UNIQLO"
              hint="任意"
            />
            <Input
              label="商品URL"
              type="url"
              value={draft.purchase_url}
              onChange={e => setDraft(d => ({ ...d, purchase_url: e.target.value }))}
              placeholder="https://..."
              hint="任意"
            />

            {draftError && (
              <p className="text-xs text-red-500">{draftError}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setDraftOpen(false); setDraftError('') }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors"
                style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'transparent' }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={confirmDraft}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: 'var(--purple)', color: 'white' }}
              >
                追加
              </button>
            </div>
          </div>
        )}
      </div>

      {errors.submit && (
        <p className="text-sm text-red-500 rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)' }}>{errors.submit}</p>
      )}

      <p className="text-xs text-center leading-relaxed px-2" style={{ color: 'var(--text-muted)' }}>
        コーデ・服・靴・バッグ・アクセサリーなど、<br />ファッションが主役のスタイルを残しましょう。
      </p>

      <Button type="submit" loading={loading} fullWidth className="h-12">
        スタイルを残す
      </Button>
    </form>
  )
}
