'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { PostItem } from '@/types/database'

const CATEGORIES = ['トップス', 'ボトムス', 'アウター', 'シューズ', 'バッグ', 'アクセサリー', 'ハット/キャップ', 'その他']
const SILHOUETTES = ['オーバーサイズ', 'ジャストサイズ', 'タイト', 'ワイド', 'ストレート', 'フレア', '短丈', 'ロング丈', 'レイヤード']
const GENRES = ['ストリート', 'カジュアル', 'モード', 'きれいめ', '韓国', '古着', 'Y2K', 'ガーリー', 'ミニマル', 'スポーティー', 'フェミニン', 'ボーイッシュ', 'アメカジ', 'グランジ', 'サブカル', 'ノームコア', 'ラグジュアリー', 'テック系']

type ItemDraft = {
  item_name: string
  category: string
  color: string
  silhouette: string
  genre: string
  purchase_url: string
}

const EMPTY_DRAFT: ItemDraft = {
  item_name: '',
  category: '',
  color: '',
  silhouette: '',
  genre: '',
  purchase_url: '',
}

function itemToDraft(item: PostItem): ItemDraft {
  return {
    item_name: item.item_name,
    category: item.category,
    color: item.color ?? '',
    silhouette: item.silhouette ?? '',
    genre: item.genre ?? '',
    purchase_url: item.purchase_url ?? '',
  }
}

export function PostEditForm({
  postId,
  initialCaption,
  initialTags,
  initialBrandTags,
  initialHypeTheme,
  initialItems,
}: {
  postId: string
  initialCaption: string
  initialTags: string[]
  initialBrandTags: string[]
  initialHypeTheme?: string
  initialItems: PostItem[]
}) {
  const router = useRouter()
  const supabase = createClient()

  const [caption, setCaption] = useState(initialCaption)
  const [tagInput, setTagInput] = useState('')
  const [brandInput, setBrandInput] = useState('')
  const [tags, setTags] = useState<string[]>(initialTags)
  const [brandTags, setBrandTags] = useState<string[]>(initialBrandTags)

  const [firstItem, setFirstItem] = useState<ItemDraft>(
    initialItems.length > 0 ? itemToDraft(initialItems[0]) : EMPTY_DRAFT
  )
  const [extraItems, setExtraItems] = useState<ItemDraft[]>(
    initialItems.slice(1).map(itemToDraft)
  )
  const [extraDraftOpen, setExtraDraftOpen] = useState(false)
  const [extraDraft, setExtraDraft] = useState<ItemDraft>(EMPTY_DRAFT)
  const [extraDraftError, setExtraDraftError] = useState('')

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

  function openExtraDraft() {
    setExtraDraft(EMPTY_DRAFT)
    setExtraDraftError('')
    setExtraDraftOpen(true)
  }

  function confirmExtraDraft() {
    if (!extraDraft.item_name.trim()) {
      setExtraDraftError('アイテム名を入力してください')
      return
    }
    if (!extraDraft.category) {
      setExtraDraftError('カテゴリを選択してください')
      return
    }
    setExtraItems(prev => [...prev, { ...extraDraft, item_name: extraDraft.item_name.trim() }])
    setExtraDraftOpen(false)
    setExtraDraft(EMPTY_DRAFT)
    setExtraDraftError('')
  }

  function removeExtraItem(index: number) {
    setExtraItems(prev => prev.filter((_, i) => i !== index))
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (!firstItem.item_name.trim() || !firstItem.category) {
      newErrors.items = '着用アイテム名とカテゴリを入力してください'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const { error: postError } = await supabase
        .from('posts')
        .update({
          caption: caption.trim() || null,
          tags,
          brand_tags: brandTags,
        })
        .eq('id', postId)

      if (postError) throw postError

      // 既存 post_items を削除して再挿入
      const { error: deleteError } = await supabase
        .from('post_items')
        .delete()
        .eq('post_id', postId)

      if (deleteError) throw deleteError

      const allItems = [firstItem, ...extraItems]
      const { error: insertError } = await supabase.from('post_items').insert(
        allItems.map((item, i) => ({
          post_id: postId,
          item_name: item.item_name.trim(),
          category: item.category,
          color: item.color.trim() || null,
          silhouette: item.silhouette.trim() || null,
          genre: item.genre.trim() || null,
          purchase_url: item.purchase_url.trim() || null,
          display_order: i,
        }))
      )

      if (insertError) throw insertError

      router.push(`/post/${postId}`)
      router.refresh()
    } catch (err) {
      console.error(err)
      setErrors({ submit: '保存に失敗しました。もう一度お試しください。' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 pb-10">
      {initialHypeTheme && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{ background: 'var(--purple-dim)', border: '1px solid var(--border)' }}
        >
          <span className="text-lg leading-none mt-0.5">🔥</span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--purple)' }}>
              今日のHYPE
            </p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{initialHypeTheme}</p>
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

      {/* 着用アイテム */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium" style={{ color: 'var(--label-text)' }}>着用アイテム *</p>

        {/* 1件目: 常時表示 */}
        <div
          className="flex flex-col gap-3 rounded-2xl px-4 py-4"
          style={{ background: 'var(--bg-subtle)', border: `1px solid ${errors.items ? 'rgb(248,113,113)' : 'var(--border)'}` }}
        >
          <Input
            label="アイテム名 *"
            value={firstItem.item_name}
            onChange={e => setFirstItem(d => ({ ...d, item_name: e.target.value }))}
            placeholder="例: オーバーサイズTシャツ"
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--label-text)' }}>カテゴリ *</label>
            <select
              value={firstItem.category}
              onChange={e => setFirstItem(d => ({ ...d, category: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 text-sm appearance-none"
              style={{
                background: 'var(--input-bg)',
                color: firstItem.category ? 'var(--input-text)' : 'var(--hint-text)',
                borderColor: 'var(--input-border)',
              }}
            >
              <option value="" disabled>カテゴリを選択</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c} style={{ color: 'var(--input-text)' }}>{c}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="色"
              value={firstItem.color}
              onChange={e => setFirstItem(d => ({ ...d, color: e.target.value }))}
              placeholder="例: ホワイト"
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--label-text)' }}>シルエット</label>
              <select
                value={firstItem.silhouette}
                onChange={e => setFirstItem(d => ({ ...d, silhouette: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 text-sm appearance-none"
                style={{
                  background: 'var(--input-bg)',
                  color: firstItem.silhouette ? 'var(--input-text)' : 'var(--hint-text)',
                  borderColor: 'var(--input-border)',
                }}
              >
                <option value="">選択</option>
                {SILHOUETTES.map(s => (
                  <option key={s} value={s} style={{ color: 'var(--input-text)' }}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--label-text)' }}>系統</label>
            <select
              value={firstItem.genre}
              onChange={e => setFirstItem(d => ({ ...d, genre: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 text-sm appearance-none"
              style={{
                background: 'var(--input-bg)',
                color: firstItem.genre ? 'var(--input-text)' : 'var(--hint-text)',
                borderColor: 'var(--input-border)',
              }}
            >
              <option value="">選択</option>
              {GENRES.map(g => (
                <option key={g} value={g} style={{ color: 'var(--input-text)' }}>{g}</option>
              ))}
            </select>
          </div>

          <Input
            label="購入先URL"
            type="url"
            value={firstItem.purchase_url}
            onChange={e => setFirstItem(d => ({ ...d, purchase_url: e.target.value }))}
            placeholder="https://..."
            hint="任意"
          />
        </div>

        {errors.items && (
          <p className="text-xs text-red-500">{errors.items}</p>
        )}

        {/* 2件目以降: 確定済みカード */}
        {extraItems.map((item, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-2 rounded-xl px-3 py-2.5"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                {item.item_name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {[item.category, item.color, item.silhouette, item.genre].filter(Boolean).join(' · ')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeExtraItem(i)}
              className="flex-shrink-0 mt-0.5"
              aria-label={`${item.item_name}を削除`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {!extraDraftOpen && (
          <button
            type="button"
            onClick={openExtraDraft}
            className="self-start text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--purple)', background: 'var(--purple-dim)', border: '1px solid var(--border)' }}
          >
            ＋ アイテムを追加
          </button>
        )}

        {extraDraftOpen && (
          <div
            className="flex flex-col gap-3 rounded-2xl px-4 py-4"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
          >
            <Input
              label="アイテム名 *"
              value={extraDraft.item_name}
              onChange={e => setExtraDraft(d => ({ ...d, item_name: e.target.value }))}
              placeholder="例: ワイドデニムパンツ"
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--label-text)' }}>カテゴリ *</label>
              <select
                value={extraDraft.category}
                onChange={e => setExtraDraft(d => ({ ...d, category: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 text-sm appearance-none"
                style={{
                  background: 'var(--input-bg)',
                  color: extraDraft.category ? 'var(--input-text)' : 'var(--hint-text)',
                  borderColor: 'var(--input-border)',
                }}
              >
                <option value="" disabled>カテゴリを選択</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c} style={{ color: 'var(--input-text)' }}>{c}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="色"
                value={extraDraft.color}
                onChange={e => setExtraDraft(d => ({ ...d, color: e.target.value }))}
                placeholder="例: ブラック"
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--label-text)' }}>シルエット</label>
                <select
                  value={extraDraft.silhouette}
                  onChange={e => setExtraDraft(d => ({ ...d, silhouette: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 text-sm appearance-none"
                  style={{
                    background: 'var(--input-bg)',
                    color: extraDraft.silhouette ? 'var(--input-text)' : 'var(--hint-text)',
                    borderColor: 'var(--input-border)',
                  }}
                >
                  <option value="">選択</option>
                  {SILHOUETTES.map(s => (
                    <option key={s} value={s} style={{ color: 'var(--input-text)' }}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--label-text)' }}>系統</label>
              <select
                value={extraDraft.genre}
                onChange={e => setExtraDraft(d => ({ ...d, genre: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 text-sm appearance-none"
                style={{
                  background: 'var(--input-bg)',
                  color: extraDraft.genre ? 'var(--input-text)' : 'var(--hint-text)',
                  borderColor: 'var(--input-border)',
                }}
              >
                <option value="">選択</option>
                {GENRES.map(g => (
                  <option key={g} value={g} style={{ color: 'var(--input-text)' }}>{g}</option>
                ))}
              </select>
            </div>

            <Input
              label="購入先URL"
              type="url"
              value={extraDraft.purchase_url}
              onChange={e => setExtraDraft(d => ({ ...d, purchase_url: e.target.value }))}
              placeholder="https://..."
              hint="任意"
            />

            {extraDraftError && (
              <p className="text-xs text-red-500">{extraDraftError}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setExtraDraftOpen(false); setExtraDraftError('') }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors"
                style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'transparent' }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={confirmExtraDraft}
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

      <Button type="submit" loading={loading} fullWidth className="h-12">
        保存する
      </Button>
    </form>
  )
}
