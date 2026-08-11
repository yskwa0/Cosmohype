'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

/**
 * 商品基本情報 form (autosave 版)。
 *
 * mode='edit': 明示 save button なし。値変更 → useEffect の debounce (600ms) で
 *              server action を requestSubmit 相当で呼び出す (useTransition + FormData)。
 *              画面右上に「保存中… / 保存済み / 保存に失敗しました」を表示。
 * mode='new':  最下部に「次へ (下書きを作成)」button + 入力後の auto-fire 兼用。
 *              name.trim().length > 0 && categoryId が 1500ms 継続で満たされた時のみ
 *              draft を自動生成 (乱造防止)。button でも即発火可能。
 *
 * form → DB mapping (Shopify モデル):
 *   セール価格 empty: base_price=normalPrice, compare_at_price=null
 *   セール価格 present (0 < sale < normal):
 *     base_price=salePrice (実 charge), compare_at_price=normalPrice (strikethrough)
 */

export interface ProductBasicsInitial {
  productId: string | null
  name: string
  description: string
  categoryId: string
  normalPrice: string
  salePrice: string
  status: 'draft' | 'published' | 'sold_out' | 'archived'
  isNew: boolean
}

interface Props {
  initial: ProductBasicsInitial
  action: (formData: FormData) => Promise<void>
  categories: Array<{ id: string; label: string }>
  disabled?: boolean
  mode?: 'new' | 'edit'
}

const TEXT_DEBOUNCE_MS = 600
const NEW_DRAFT_DEBOUNCE_MS = 1500

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function ProductBasicsForm({
  initial,
  action,
  categories,
  disabled,
  mode = 'edit',
}: Props) {
  const [f, setF] = useState<ProductBasicsInitial>(initial)
  const router = useRouter()

  const hasNormal = f.normalPrice.trim().length > 0
  const normalNum = hasNormal ? Number(f.normalPrice) : null
  const normalValid = !hasNormal || (Number.isInteger(normalNum!) && (normalNum as number) > 0)
  const hasSale = f.salePrice.trim().length > 0
  const saleNum = hasSale ? Number(f.salePrice) : null
  const saleValid = !hasSale || (
    Number.isInteger(saleNum!) &&
    saleNum! > 0 &&
    hasNormal &&
    normalValid &&
    saleNum! < (normalNum as number)
  )
  const nameValid = f.name.trim().length > 0
  const categoryValid = f.categoryId.length > 0

  // autosave 発火条件: 商品名 + カテゴリ が有効なら OK。価格は空欄でも DB は
  // draft placeholder (base_price=0) / 現在値 preserve として扱う。
  // 入力途中の壊れた価格 (例: normal 未入力で sale だけ) は保存を保留。
  const valid = nameValid && categoryValid && normalValid && saleValid

  const [isPending, startTransition] = useTransition()
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const savedFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submittingRef = useRef(false)
  const pendingSubmitRef = useRef(false)

  // 現在の form 値から FormData を組み立てて server action を呼ぶ
  const submit = () => {
    if (disabled) return
    if (submittingRef.current) {
      // 既に in-flight → 完了後にもう 1 度発火
      pendingSubmitRef.current = true
      return
    }
    submittingRef.current = true
    setSaveState('saving')
    const fd = new FormData()
    if (f.productId) fd.set('product_id', f.productId)
    fd.set('name', f.name)
    fd.set('category_id', f.categoryId)
    fd.set('description', f.description)
    fd.set('normal_price', f.normalPrice)
    fd.set('sale_price', f.salePrice)
    // status は server 側で DB 現在値を維持するため送らない
    if (f.isNew) fd.set('is_new', 'true')
    startTransition(async () => {
      try {
        await action(fd)
        setSaveState('saved')
        if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current)
        savedFlashTimer.current = setTimeout(() => setSaveState('idle'), 1500)
        router.refresh()
      } catch (e) {
        // Next.js redirect() throws NEXT_REDIRECT — success経路でも throw されるので
        // redirect 系は success 扱い、それ以外を error 扱い
        const msg = String((e as { digest?: string; message?: string })?.digest ?? (e as { message?: string })?.message ?? '')
        if (msg.startsWith('NEXT_REDIRECT')) {
          setSaveState('saved')
          if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current)
          savedFlashTimer.current = setTimeout(() => setSaveState('idle'), 1500)
        } else {
          console.error('[ProductBasicsForm] autosave failed', e)
          setSaveState('error')
        }
      } finally {
        submittingRef.current = false
        if (pendingSubmitRef.current) {
          pendingSubmitRef.current = false
          submit()
        }
      }
    })
  }

  // Auto-save (edit) / auto-draft (new) — 値の変化を debounce して発火
  const didInitRef = useRef(false)
  useEffect(() => {
    if (!didInitRef.current) { didInitRef.current = true; return }
    if (disabled) return
    if (!valid) return
    const delay = mode === 'edit' ? TEXT_DEBOUNCE_MS : NEW_DRAFT_DEBOUNCE_MS
    const t = setTimeout(() => submit(), delay)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.name, f.description, f.categoryId, f.normalPrice, f.salePrice, f.isNew, valid, disabled, mode])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between max-w-2xl gap-4">
        <h3 className="sr-only">商品基本情報</h3>
        <SaveIndicator state={saveState} isPending={isPending} mode={mode} />
      </div>

      <form className="space-y-5 max-w-2xl">
        {/*
          status は Brand Admin UI から選択させない (server 側で常に DB 現在値を維持):
            - draft:    自動作成 (create action)
            - published: 「商品を公開する」button
            - archived:  「商品をアーカイブする」button
            - sold_out:  legacy 互換のみ (自動判定に置き換え)
          → ProductBasicsForm では公開設定 pill を撤去。status field も送らない。
        */}
        <Row label="商品名" required>
          <input
            type="text"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            disabled={disabled}
            maxLength={200}
            className={fieldClass}
            placeholder="例: Oversized Cotton Tee"
          />
        </Row>

        <Row label="カテゴリ" required>
          <select
            value={f.categoryId}
            onChange={(e) => setF({ ...f, categoryId: e.target.value })}
            disabled={disabled}
            className={fieldClass + ' max-w-[280px]'}
          >
            {categories.length === 0 && <option value="">(カテゴリなし)</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </Row>

        <Row label="説明" required={false}>
          {/*
            fieldClass は h-10 (=40px 固定) を含んでおり、そのまま textarea に付けると
            rows=n が無視されて 1〜2 行しか見えない見た目になっていた。
            textarea 専用に h-10 を外し、min-h-[180px] を明示指定して 6〜8 行分の
            入力エリアを最初から確保する (2000 文字上限の入力欄として自然なサイズ)。
          */}
          <textarea
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            disabled={disabled}
            maxLength={2000}
            rows={8}
            className={textareaClass}
            placeholder="商品の特徴・素材・サイズ感など"
          />
          <div className="mt-0.5 text-[10px] text-neutral-500 text-right">
            {f.description.length} / 2000
          </div>
        </Row>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Row label="通常価格 (円)" required>
            <input
              type="number"
              value={f.normalPrice}
              onChange={(e) => setF({ ...f, normalPrice: e.target.value })}
              disabled={disabled}
              min={1}
              step={1}
              className={fieldClass + ' font-mono'}
              placeholder="例: 9800"
            />
            {hasNormal && !normalValid && (
              <div className="mt-1 text-[11px] text-red-600">通常価格は 1 円以上の整数で入力してください。</div>
            )}
            {!hasNormal && (
              <div className="mt-1 text-[10px] text-neutral-500">
                未入力の間は下書き扱い。公開時に必須です。
              </div>
            )}
          </Row>
          <Row label="セール価格 (円、任意)" required={false}>
            <input
              type="number"
              value={f.salePrice}
              onChange={(e) => setF({ ...f, salePrice: e.target.value })}
              disabled={disabled}
              min={1}
              step={1}
              className={fieldClass + ' font-mono'}
              placeholder="セール時のみ入力"
            />
            {hasSale && !saleValid && (
              <div className="mt-1 text-[11px] text-red-600">
                {!hasNormal
                  ? 'セール価格を入力する場合は、まず通常価格を入力してください。'
                  : 'セール価格は通常価格より低く設定してください。'}
              </div>
            )}
            <div className="mt-0.5 text-[10px] text-neutral-500">
              セール価格を入力すると、iOS 側で通常価格に打ち消し線 + セール価格を強調表示します。
            </div>
          </Row>
        </div>

        <Row label="NEW バッジ" required={false}>
          <label className="inline-flex items-center gap-2 text-[12px] text-neutral-700">
            <input
              type="checkbox"
              checked={f.isNew}
              disabled={disabled}
              onChange={(e) => setF({ ...f, isNew: e.target.checked })}
            />
            新作として表示
          </label>
        </Row>

        {mode === 'new' && (
          <div className="pt-2 text-[11px] text-neutral-500">
            商品名を入力すると自動で下書き商品を作成します。基本情報が揃ったら「次へ」で画像・バリエーション設定へ進みます。
          </div>
        )}
      </form>

      {/*
        「次へ」button — 保存 button ではない。
          mode='new':  productId 確定前は draft 作成を強制発火 (debounce を skip)、
                       強制発火に成功すると server 側 redirect で edit page へ遷移
          mode='edit': 同 page 内 #images section へ smooth scroll
        enable 条件: 商品名 + カテゴリ + 通常価格 (valid) がすべて揃っていること
      */}
      {/* mode='new' のみ「次へ (画像・在庫設定)」を form 下に表示。
          edit page は step 型 UI で親が step nav (戻る/次へ) を描画するため、
          ここでは button を出さない。 */}
      {mode === 'new' && (() => {
        const canProceed = nameValid && categoryValid && hasNormal && normalValid && saleValid && !disabled
        return (
          <div className="max-w-2xl pt-2 flex justify-end">
            <button
              type="button"
              disabled={!canProceed || isPending}
              onClick={() => submit()}
              className={
                'px-5 py-2.5 rounded-md text-sm font-semibold ' +
                'bg-neutral-900 text-white hover:bg-neutral-800 ' +
                'disabled:bg-neutral-400 disabled:text-neutral-100 disabled:cursor-not-allowed'
              }
            >
              {isPending ? '下書き作成中…' : '次へ (画像・在庫設定)'}
            </button>
          </div>
        )
      })()}
    </div>
  )
}

function SaveIndicator({ state, isPending, mode }: { state: SaveState; isPending: boolean; mode: 'new' | 'edit' }) {
  if (mode === 'new') {
    if (isPending || state === 'saving') return <IndicatorPill text="下書きを作成中…" tone="progress" />
    if (state === 'error') return <IndicatorPill text="下書きの作成に失敗しました" tone="error" />
    return <IndicatorPill text="入力後に下書きを自動作成します" tone="idle" />
  }
  if (isPending || state === 'saving') return <IndicatorPill text="保存中…" tone="progress" />
  if (state === 'saved') return <IndicatorPill text="保存済み" tone="success" />
  if (state === 'error') return <IndicatorPill text="保存に失敗しました" tone="error" />
  return <IndicatorPill text="自動保存されます" tone="idle" />
}

function IndicatorPill({ text, tone }: { text: string; tone: 'idle' | 'progress' | 'success' | 'error' }) {
  const cls =
    tone === 'progress' ? 'text-neutral-600 bg-neutral-100 border-neutral-300' :
    tone === 'success'  ? 'text-emerald-800 bg-emerald-50 border-emerald-200' :
    tone === 'error'    ? 'text-red-700 bg-red-50 border-red-300' :
                          'text-neutral-500 bg-white border-neutral-200'
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
      {text}
    </span>
  )
}

const fieldClass =
  'w-full h-10 border border-neutral-300 rounded px-3 text-sm bg-white ' +
  'disabled:bg-neutral-100 disabled:text-neutral-500'

// textarea 用: h-10 (40px 固定) を外し、6〜8 行分の初期高さを確保する。
// resize-y で必要ならユーザーが縦に広げられる。leading-relaxed で日本語長文が読みやすい。
const textareaClass =
  'w-full min-h-[180px] border border-neutral-300 rounded px-3 py-2 text-sm bg-white leading-relaxed resize-y ' +
  'disabled:bg-neutral-100 disabled:text-neutral-500'

function Row({ label, required, children }: { label: string; required: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
        {label}
        {required ? (
          <span className="ml-1 text-red-600">*</span>
        ) : (
          <span className="ml-1 text-neutral-400 font-normal">(任意)</span>
        )}
      </label>
      {children}
    </div>
  )
}
