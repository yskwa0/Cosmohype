'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { pressableClass, pressableIconClass, Spinner } from '@/lib/brandAdminUi'

// -----------------------------------------------------------------------------
// カラー preset
// -----------------------------------------------------------------------------
export interface ColorPreset { key: string; name: string; hex: string }
const COLOR_PRESETS: ColorPreset[] = [
  { key: 'black',  name: 'ブラック', hex: '#000000' },
  { key: 'white',  name: 'ホワイト', hex: '#F5F5F5' },
  { key: 'gray',   name: 'グレー',   hex: '#808080' },
  { key: 'navy',   name: 'ネイビー', hex: '#182648' },
  { key: 'blue',   name: 'ブルー',   hex: '#3B82F6' },
  { key: 'red',    name: 'レッド',   hex: '#DC2626' },
  { key: 'pink',   name: 'ピンク',   hex: '#F9C5CC' },
  { key: 'green',  name: 'グリーン', hex: '#16A34A' },
  { key: 'khaki',  name: 'カーキ',   hex: '#6B704C' },
  { key: 'beige',  name: 'ベージュ', hex: '#D8C7A6' },
  { key: 'brown',  name: 'ブラウン', hex: '#6B4423' },
  { key: 'yellow', name: 'イエロー', hex: '#F59E0B' },
  { key: 'purple', name: 'パープル', hex: '#7C3AED' },
  { key: 'orange', name: 'オレンジ', hex: '#F97316' },
  { key: 'silver', name: 'シルバー', hex: '#C0C0C0' },
  { key: 'gold',   name: 'ゴールド', hex: '#D4AF37' },
]

const SIZE_OPTIONS_BY_SLUG: Record<string, string[]> = {
  tops:      ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'FREE'],
  bottoms:   ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'FREE'],
  outer:     ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'FREE'],
  shoes:     ['22.0','22.5','23.0','23.5','24.0','24.5','25.0','25.5','26.0','26.5','27.0','27.5','28.0','28.5','29.0','29.5','30.0'],
  bag:       ['FREE'],
  accessory: ['FREE'],
}
function getSizeOptions(slug: string): string[] {
  return SIZE_OPTIONS_BY_SLUG[slug] ?? ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'FREE']
}

function matchColorPreset(name: string | null, hex: string | null): ColorPreset | null {
  if (!name && !hex) return null
  const nameLower = (name ?? '').trim()
  const hexLower = (hex ?? '').trim().toLowerCase()
  return COLOR_PRESETS.find((p) =>
    (nameLower && p.name === nameLower) ||
    (hexLower && p.hex.toLowerCase() === hexLower)
  ) ?? null
}

// -----------------------------------------------------------------------------
export interface ExistingVariant {
  id: string
  sku: string
  size: string | null
  colorName: string | null
  colorHex: string | null
  price: number | null
  status: string           // 'active' | 'inactive' | 'archived'
  available: number
  reserved: number
}

interface Props {
  productId: string
  categorySlug: string
  disabled?: boolean
  upsertAction: (fd: FormData) => Promise<void>
  /** existing variant の物理 DELETE server action (未使用 variant のみ削除される) */
  deleteAction?: (fd: FormData) => Promise<void>
  existing?: ExistingVariant
  /** 新規 variant editor の × 押下時に親側でフォームを閉じるための callback */
  onCancel?: () => void
}

const TEXT_DEBOUNCE_MS = 600
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/**
 * バリエーション編集 UI。
 *   既存: フィールド変更で autosave (600ms debounce)、明示 save button なし
 *   新規: 入力後 「バリエーションを追加」button を押した時点で保存
 * SKU は client から送らず、server 側で auto-generate / 既存維持。
 * 「アーカイブ」操作は UI から完全撤去 (販売停止 = inactive で十分)。
 * 既存 archived variant は ArchivedVariantCard として read-only 表示。
 */
export default function VariantEditor({ productId, categorySlug, existing, disabled, upsertAction, deleteAction, onCancel }: Props) {
  const isNew = !existing
  const isArchived = existing?.status === 'archived'
  const sizeOptions = getSizeOptions(categorySlug)

  // 新規: 何も pre-select しない (完全に空、ユーザーが必ず選ぶ)
  // 既存: DB 現在値を preset か custom で復元
  const initialSize = existing?.size ?? ''
  const initialSizeInPreset = sizeOptions.includes(initialSize)
  const [sizeMode, setSizeMode] = useState<'preset' | 'custom'>(
    isNew || initialSize.length === 0 || initialSizeInPreset ? 'preset' : 'custom'
  )
  const [selectedSize, setSelectedSize] = useState<string>(
    isNew ? '' : (initialSizeInPreset ? initialSize : (sizeOptions[0] ?? ''))
  )
  const [customSize, setCustomSize] = useState<string>(isNew ? '' : (initialSizeInPreset ? '' : initialSize))

  const initialColorPreset = matchColorPreset(existing?.colorName ?? null, existing?.colorHex ?? null)
  const [colorMode, setColorMode] = useState<'preset' | 'custom'>(
    isNew || initialColorPreset ? 'preset' : 'custom'
  )
  const [selectedColorKey, setSelectedColorKey] = useState<string>(
    isNew ? '' : (initialColorPreset?.key ?? COLOR_PRESETS[0].key)
  )
  const [customColorName, setCustomColorName] = useState<string>(
    isNew ? '' : (initialColorPreset ? '' : (existing?.colorName ?? ''))
  )
  const [customColorHex, setCustomColorHex] = useState<string>(
    isNew ? '' : (initialColorPreset ? '' : (existing?.colorHex ?? '#000000'))
  )

  const [statusVal, setStatusVal] = useState<'active' | 'inactive'>(
    existing?.status === 'inactive' ? 'inactive' : 'active'
  )
  const [qty, setQty] = useState<string>(isNew ? '' : String(existing?.available ?? 0))

  const finalPreset = COLOR_PRESETS.find((p) => p.key === selectedColorKey) ?? null
  const finalSize = (sizeMode === 'preset' ? selectedSize : customSize).trim()
  const finalColorName = (colorMode === 'preset' ? (finalPreset?.name ?? '') : customColorName).trim()
  const finalColorHex = (colorMode === 'preset' ? (finalPreset?.hex ?? '') : customColorHex).trim()

  const qtyNum = Number(qty)
  const qtyValid = Number.isInteger(qtyNum) && qtyNum >= 0
  const valid =
    !disabled &&
    finalSize.length > 0 &&
    finalColorName.length > 0 &&
    qtyValid

  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const savedFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submittingRef = useRef(false)
  const pendingSubmitRef = useRef(false)

  const doSubmit = (opts?: { onDone?: () => void }) => {
    if (submittingRef.current) {
      pendingSubmitRef.current = true
      return
    }
    submittingRef.current = true
    setSaveState('saving')
    const fd = new FormData()
    fd.set('product_id', productId)
    if (existing) fd.set('variant_id', existing.id)
    fd.set('size', finalSize)
    fd.set('color_name', finalColorName)
    fd.set('color_hex', finalColorHex)
    fd.set('status', statusVal)
    // variant.price は Brand Admin から編集不可。server 側で:
    //   既存 → DB 現在値を preserve、新規 → NULL (= product.base_price を fallback として使用)
    fd.set('quantity_available', qty)
    startTransition(async () => {
      let ok = false
      try {
        await upsertAction(fd)
        setSaveState('saved')
        if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current)
        savedFlashTimer.current = setTimeout(() => setSaveState('idle'), 1500)
        router.refresh()
        ok = true
      } catch (e) {
        const digest = String((e as { digest?: string })?.digest ?? '')
        if (digest.startsWith('NEXT_REDIRECT')) {
          setSaveState('saved')
          if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current)
          savedFlashTimer.current = setTimeout(() => setSaveState('idle'), 1500)
          ok = true
        } else {
          console.error('[VariantEditor] save failed', e)
          setSaveState('error')
        }
      } finally {
        submittingRef.current = false
        if (pendingSubmitRef.current) {
          pendingSubmitRef.current = false
          doSubmit()
        }
        opts?.onDone?.()
        // 新規 variant の追加が成功したら section を閉じる (次回開いた時は空フォーム)。
        //   即時 onCancel すると、RSC 再取得が完了する前に「入力フォームが消える」→
        //   「＋ボタンだけ表示」→「新 variant カードが遅れて現れる」の 3 段ちらつきが出る。
        //   ~450ms 遅延させることで RSC round-trip の完了 (=新 variant カード出現) と
        //   フォーム畳みをほぼ同時に見せ、体感上のちらつきを解消する。
        //   その間フォームは saveState='saved' 表示のまま残る。
        if (ok && isNew && onCancel) {
          setTimeout(() => onCancel(), 450)
        }
      }
    })
  }

  // Autosave: 既存 variant のみ (新規は Add button で明示発火)
  const didInitRef = useRef(false)
  useEffect(() => {
    if (!didInitRef.current) { didInitRef.current = true; return }
    if (isNew || isArchived) return
    if (!valid) return
    const t = setTimeout(() => doSubmit(), TEXT_DEBOUNCE_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalSize, finalColorName, finalColorHex, statusVal, qty, valid, isNew, isArchived])

  // archived variant は編集フォームを描画せず read-only card を返す (hooks は上で全て call 済み)
  if (isArchived && existing) {
    return <ArchivedVariantCard existing={existing} />
  }

  return (
    <div className="border border-neutral-200 rounded-lg p-4 bg-white space-y-4">
      {existing && (
        <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-neutral-500">
          <span>SKU: {existing.sku}</span>
          <div className="flex items-center gap-2">
            <span>決済中の確保: {existing.reserved}</span>
            <SaveIndicator state={saveState} isPending={isPending} isNew={false} />
            {!disabled && deleteAction && (
              <form
                action={deleteAction}
                onSubmit={(e) => {
                  if (!window.confirm('このバリエーションを削除しますか？\n\nこの操作は元に戻せません。')) e.preventDefault()
                }}
              >
                <input type="hidden" name="product_id" value={productId} />
                <input type="hidden" name="variant_id" value={existing.id} />
                <DeleteVariantSubmit />
              </form>
            )}
          </div>
        </div>
      )}
      {isNew && onCancel && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-neutral-700">新しいバリエーション</span>
          <button
            type="button"
            onClick={onCancel}
            title="入力を破棄して閉じる"
            aria-label="入力を破棄して閉じる"
            className={
              'w-6 h-6 flex items-center justify-center rounded-md text-neutral-500 ' +
              'hover:text-neutral-900 hover:bg-neutral-100 border border-transparent hover:border-neutral-300 ' +
              pressableIconClass
            }
          >
            ×
          </button>
        </div>
      )}

      <div className="space-y-4">
        {/* Size */}
        <div>
          <label className="block text-[11px] font-semibold text-neutral-600 mb-1.5">
            サイズ <span className="text-red-600">*</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {sizeOptions.map((s) => {
              const selected = sizeMode === 'preset' && selectedSize === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSizeMode('preset'); setSelectedSize(s) }}
                  disabled={disabled}
                  className={
                    'px-3 py-1.5 rounded-md text-[11px] font-semibold border ' +
                    (selected
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50') + ' ' +
                    pressableClass
                  }
                >{s}</button>
              )
            })}
            <button
              type="button"
              onClick={() => setSizeMode('custom')}
              disabled={disabled}
              className={
                'px-3 py-1.5 rounded-md text-[11px] font-semibold border ' +
                (sizeMode === 'custom'
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50') + ' ' +
                pressableClass
              }
            >その他</button>
          </div>
          {sizeMode === 'custom' && (
            <input
              type="text"
              value={customSize}
              onChange={(e) => setCustomSize(e.target.value)}
              maxLength={60}
              placeholder="例: XXS / 40 / 27.5cm"
              disabled={disabled}
              className="mt-2 h-9 border border-neutral-300 rounded px-3 text-[12px] w-full max-w-[220px]"
            />
          )}
        </div>

        {/* Color */}
        <div>
          <label className="block text-[11px] font-semibold text-neutral-600 mb-1.5">
            カラー <span className="text-red-600">*</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_PRESETS.map((c) => {
              const selected = colorMode === 'preset' && selectedColorKey === c.key
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => { setColorMode('preset'); setSelectedColorKey(c.key) }}
                  disabled={disabled}
                  className={
                    'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold border ' +
                    (selected
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50') + ' ' +
                    pressableClass
                  }
                >
                  <span
                    className="w-3 h-3 rounded-full border border-neutral-300"
                    style={{ backgroundColor: c.hex }}
                    aria-hidden="true"
                  />
                  {c.name}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setColorMode('custom')}
              disabled={disabled}
              className={
                'px-2.5 py-1.5 rounded-md text-[11px] font-semibold border ' +
                (colorMode === 'custom'
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50') + ' ' +
                pressableClass
              }
            >その他</button>
          </div>
          {colorMode === 'custom' && (
            <div className="mt-2 flex flex-wrap gap-2 items-center">
              <input
                type="text"
                value={customColorName}
                onChange={(e) => setCustomColorName(e.target.value)}
                maxLength={60}
                placeholder="カラー名 (例: ミント)"
                disabled={disabled}
                className="h-9 border border-neutral-300 rounded px-3 text-[12px] w-[200px]"
              />
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(customColorHex) ? customColorHex : '#000000'}
                onChange={(e) => setCustomColorHex(e.target.value)}
                disabled={disabled}
                className="h-9 w-14 border border-neutral-300 rounded cursor-pointer"
                aria-label="カラー hex 選択"
              />
              <input
                type="text"
                value={customColorHex}
                onChange={(e) => setCustomColorHex(e.target.value)}
                maxLength={20}
                placeholder="#000000"
                disabled={disabled}
                className="h-9 border border-neutral-300 rounded px-3 text-[12px] font-mono w-[120px]"
              />
            </div>
          )}
        </div>

        {/* Status: 販売中 / 販売停止 の 2 択のみ (アーカイブは UI から撤廃) */}
        <div>
          <label className="block text-[11px] font-semibold text-neutral-600 mb-1.5">
            販売状態 <span className="text-red-600">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {(['active', 'inactive'] as const).map((s) => {
              const selected = statusVal === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusVal(s)}
                  disabled={disabled}
                  className={
                    'px-3 py-1.5 rounded-md text-[11px] font-semibold border ' +
                    (selected
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50') + ' ' +
                    pressableClass
                  }
                >{s === 'active' ? '販売中' : '販売停止'}</button>
              )
            })}
          </div>
          <div className="mt-1 text-[10px] text-neutral-500">
            販売停止にすると HYPE 側で購入できなくなります。在庫は保持され、再び「販売中」に戻すと再利用できます。
          </div>
        </div>

        {/* Inventory only (variant price は商品単位で管理、Brand Admin UI からは非表示) */}
        <div>
          <label className="block text-[11px] font-semibold text-neutral-600 mb-1.5">
            販売可能在庫 <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            min={0}
            step={1}
            required
            disabled={disabled}
            className="h-9 border border-neutral-300 rounded px-3 text-[12px] font-mono w-full max-w-[240px] disabled:bg-neutral-100"
          />
          <div className="text-[10px] text-neutral-500 mt-1">
            決済中の確保数は自動管理されます。価格は商品全体の「通常価格 / セール価格」から決まります。
          </div>
        </div>

        {isNew && (() => {
          const missing: string[] = []
          if (finalSize.length === 0) missing.push('サイズを選択してください')
          if (finalColorName.length === 0) missing.push('カラーを選択してください')
          if (!qtyValid) missing.push('販売可能在庫を 0 以上の整数で入力してください')
          return (
            <div className="pt-1">
              <ConfirmVariantButton
                enabled={valid}
                isPending={isPending}
                onClick={() => doSubmit()}
              />
              {missing.length > 0 && (
                <div className="mt-1 text-[11px] text-neutral-500">
                  {missing.join(' / ')}
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

/**
 * 削除 × 用の submit button。 useFormStatus で pending 中は disabled + inline spinner に
 * 置換 (二重削除禁止 + 「今削除中」を可視化)。
 */
function DeleteVariantSubmit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      title="このバリエーションを削除"
      aria-label="このバリエーションを削除"
      className={
        'w-6 h-6 flex items-center justify-center rounded-md text-neutral-500 ' +
        'hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 ' +
        pressableIconClass
      }
    >
      {pending ? <Spinner size={10} /> : '×'}
    </button>
  )
}

function ConfirmVariantButton({ enabled, isPending, onClick }: { enabled: boolean; isPending: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={!enabled || isPending}
      onClick={onClick}
      className={
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-[12px] font-semibold bg-neutral-900 text-white ' +
        'hover:bg-neutral-800 disabled:bg-neutral-400 disabled:text-neutral-100 disabled:cursor-not-allowed ' +
        pressableClass
      }
    >
      {isPending && <Spinner />}
      {isPending ? '保存中…' : 'バリエーションを確定'}
    </button>
  )
}

function SaveIndicator({ state, isPending, isNew }: { state: SaveState; isPending: boolean; isNew: boolean }) {
  if (isNew) return null
  if (isPending || state === 'saving') return <IndicatorPill text="保存中…" tone="progress" />
  if (state === 'saved') return <IndicatorPill text="保存済み" tone="success" />
  if (state === 'error') return <IndicatorPill text="保存に失敗" tone="error" />
  return null
}

function IndicatorPill({ text, tone }: { text: string; tone: 'progress' | 'success' | 'error' }) {
  const cls =
    tone === 'progress' ? 'text-neutral-600 bg-neutral-100 border-neutral-300' :
    tone === 'success'  ? 'text-emerald-800 bg-emerald-50 border-emerald-200' :
                          'text-red-700 bg-red-50 border-red-300'
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {text}
    </span>
  )
}

/**
 * archived variant の読み取り専用カード。通常編集 UI からは切り離す。
 */
function ArchivedVariantCard({ existing }: { existing: ExistingVariant }) {
  const size = existing.size ?? '—'
  const color = existing.colorName ?? '—'
  return (
    <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50 space-y-2 opacity-90">
      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
        <span>SKU: {existing.sku}</span>
        <span>決済中の確保: {existing.reserved}</span>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {existing.colorHex && (
          <span
            className="w-4 h-4 rounded-full border border-neutral-300"
            style={{ backgroundColor: existing.colorHex }}
            aria-hidden="true"
          />
        )}
        <span className="text-sm font-semibold text-neutral-900">{color} / {size}</span>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-neutral-200 text-neutral-700">
          販売停止 (アーカイブ済み)
        </span>
      </div>
      <div className="text-[11px] text-neutral-500">
        販売可能在庫: <span className="font-mono">{existing.available}</span> — 通常編集からは復帰できません。
      </div>
    </div>
  )
}
