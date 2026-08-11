'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react'

/**
 * Brand Admin 商品一覧の Client 版レンダラ。
 *
 * 役割:
 *   1. useOptimistic で「アーカイブ / 削除 (=archive)」時に対象行を即時 hide
 *   2. 各行の「…」メニュー + 確認ダイアログ (product 名表示 / 二重押し防止)
 *   3. Server Action を useTransition 経由で呼出、redirect 完了で revalidatePath 反映
 *   4. 失敗時は親再描画で該当 id が visible list に残り、useOptimistic overlay 消滅 → 自動 rollback
 *
 * 変更しないもの:
 *   - Server Action の RPC (shop_brand_update_product) / 権限判定 / status 遷移仕様
 *   - list の見た目 (image / status pill / name / price / metadata)
 *   - primary image / storage / sort_order
 *
 * 「削除」は shop_brand_archive_variant と同じソフト削除パターン (status='archived') を
 * 商品側にも適用。FK RESTRICT / authenticated DELETE grant なしの制約下での既存 pattern。
 * ダイアログ本文で「アーカイブ (非表示化) されます」を明示する。
 */

export interface ProductListItem {
  id: string
  name: string
  status: string
  base_price: number
  category_display_name: string | null
  primary_storage_path: string | null
  variant_count: number
  active_avail: number
  is_out_of_stock: boolean
  updated_at: string
}

interface Props {
  items: ProductListItem[]
  publicBase: string
  canEdit: boolean
  revertToDraftAction: (formData: FormData) => Promise<void>
  archiveAction: (formData: FormData) => Promise<void>
}

export default function ProductListActions({
  items, publicBase, canEdit, revertToDraftAction, archiveAction,
}: Props) {
  const ids = items.map((i) => i.id)
  const [visibleIds, hideOptimistically] = useOptimistic<string[], string>(
    ids,
    (cur, hideId) => cur.filter((id) => id !== hideId),
  )
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  const visibleItems = items.filter((i) => visibleIds.includes(i.id))

  const markPending = (id: string) => setPendingIds((prev) => new Set(prev).add(id))
  const clearPending = (id: string) => setPendingIds((prev) => { const n = new Set(prev); n.delete(id); return n })

  const doArchive = (id: string) => {
    if (pendingIds.has(id)) return
    markPending(id)
    startTransition(async () => {
      hideOptimistically(id)
      const fd = new FormData()
      fd.set('product_id', id)
      fd.set('back', 'list')
      try { await archiveAction(fd) } catch { /* NEXT_REDIRECT normal path */ }
      clearPending(id)
    })
  }

  const doRevertToDraft = (id: string) => {
    if (pendingIds.has(id)) return
    markPending(id)
    startTransition(async () => {
      // 「下書きに戻す」は list からは hide しない (draft も一覧に残るため、
      // revalidate で新 status で再表示させる)
      const fd = new FormData()
      fd.set('product_id', id)
      try { await revertToDraftAction(fd) } catch { /* NEXT_REDIRECT normal path */ }
      clearPending(id)
    })
  }

  if (visibleItems.length === 0) {
    return (
      <div className="text-sm text-neutral-500 border border-neutral-200 rounded-xl bg-white px-5 py-8 text-center">
        該当する商品はありません。
      </div>
    )
  }

  return (
    <div className="border border-neutral-200 rounded-xl bg-white overflow-hidden">
      {visibleItems.map((p, i) => {
        const isPending = pendingIds.has(p.id)
        return (
          <div
            key={p.id}
            className={
              'flex items-center gap-2 pr-3 ' +
              (i > 0 ? 'border-t border-neutral-200 ' : '') +
              (isPending ? 'opacity-60 ' : '')
            }
          >
            <Link
              href={`/brand-admin/products/${p.id}`}
              className="flex-1 flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 min-w-0"
            >
              <div className="w-14 h-14 rounded-lg bg-neutral-100 overflow-hidden flex items-center justify-center shrink-0 relative">
                {p.primary_storage_path && publicBase ? (
                  <Image
                    src={`${publicBase}${p.primary_storage_path}`}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-[9px] text-neutral-400">NO IMG</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${statusColor(p.status)}`}>
                    {statusLabel(p.status)}
                  </span>
                  {p.is_out_of_stock && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      在庫切れ
                    </span>
                  )}
                  <span className="text-[10px] text-neutral-500">
                    {p.category_display_name ?? '—'}
                  </span>
                </div>
                <div className="mt-1 text-sm font-semibold text-neutral-900 truncate">{p.name}</div>
                <div className="mt-0.5 text-[11px] text-neutral-500">
                  {formatDate(p.updated_at)} · variants {p.variant_count} · 販売可能 {p.active_avail}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold font-mono">¥{new Intl.NumberFormat('ja-JP').format(p.base_price)}</div>
                <div className="text-[10px] text-neutral-500 mt-1">›</div>
              </div>
            </Link>
            {canEdit && (
              <RowMenu
                productId={p.id}
                productName={p.name}
                status={p.status}
                disabled={isPending}
                onArchive={() => doArchive(p.id)}
                onRevertToDraft={() => doRevertToDraft(p.id)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Row-level menu + confirmation dialog
// -----------------------------------------------------------------------------
function RowMenu({
  productName, status, disabled,
  onArchive, onRevertToDraft,
}: {
  productId: string   // 保持: 呼出側からの identifier、将来 log/telemetry 用
  productName: string
  status: string
  disabled: boolean
  onArchive: () => void
  onRevertToDraft: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirm, setConfirm] = useState<null | {
    title: string; body: string; ctaLabel: string; ctaClass: string; run: () => void
  }>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  const shortName = productName.length > 40 ? productName.slice(0, 40) + '…' : productName
  const openConfirm = (kind: 'delete' | 'archive' | 'revert') => {
    setMenuOpen(false)
    if (kind === 'delete') {
      setConfirm({
        title: 'この商品を削除しますか？',
        body: `「${shortName}」を削除 (アーカイブ) します。\n一覧「アーカイブ」タブから復元できますが、公開・購入経路からは即時に消えます。よろしいですか？`,
        ctaLabel: '削除する',
        ctaClass: 'bg-red-600 text-white hover:bg-red-700',
        run: () => { setConfirm(null); onArchive() },
      })
    } else if (kind === 'archive') {
      setConfirm({
        title: 'この商品をアーカイブしますか？',
        body: `「${shortName}」をアーカイブします。\nHYPE の商品一覧から非表示になります (既存注文には影響しません)。`,
        ctaLabel: 'アーカイブする',
        ctaClass: 'bg-neutral-900 text-white hover:bg-neutral-800',
        run: () => { setConfirm(null); onArchive() },
      })
    } else {
      setConfirm({
        title: 'この商品を下書きに戻しますか？',
        body: `「${shortName}」を下書きに戻します。\nHYPE の商品一覧から非表示になり、STEP4 で「公開」を押すまで再公開されません。`,
        ctaLabel: '下書きに戻す',
        ctaClass: 'bg-neutral-900 text-white hover:bg-neutral-800',
        run: () => { setConfirm(null); onRevertToDraft() },
      })
    }
  }

  const items: Array<{ label: string; onClick: () => void; danger?: boolean }> = []
  if (status === 'published') {
    items.push({ label: '下書きに戻す', onClick: () => openConfirm('revert') })
    items.push({ label: 'アーカイブ', onClick: () => openConfirm('archive') })
  } else if (status === 'draft') {
    items.push({ label: '削除', onClick: () => openConfirm('delete'), danger: true })
  } else if (status === 'archived') {
    items.push({ label: '下書きに戻す', onClick: () => openConfirm('revert') })
  }
  if (items.length === 0) return null

  return (
    <>
      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          disabled={disabled}
          aria-label="商品操作メニュー"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((v) => !v) }}
          className="px-2 py-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <circle cx="4" cy="10" r="1.6" />
            <circle cx="10" cy="10" r="1.6" />
            <circle cx="16" cy="10" r="1.6" />
          </svg>
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 z-20 min-w-[10rem] rounded-md border border-neutral-200 bg-white shadow-md py-1"
            onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
          >
            {items.map((it) => (
              <button
                key={it.label}
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); it.onClick() }}
                className={
                  'w-full text-left px-3 py-1.5 text-[12px] hover:bg-neutral-50 ' +
                  (it.danger ? 'text-red-700' : 'text-neutral-800')
                }
              >
                {it.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {confirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirm(null) }}
        >
          <div className="max-w-sm w-full rounded-xl bg-white p-5 shadow-lg">
            <h3 className="text-sm font-semibold text-neutral-900">{confirm.title}</h3>
            <p className="mt-2 text-[12px] text-neutral-700 whitespace-pre-wrap break-words">{confirm.body}</p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="px-3 py-1.5 rounded-md text-[12px] font-semibold border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={confirm.run}
                className={
                  'px-3 py-1.5 rounded-md text-[12px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed ' +
                  confirm.ctaClass
                }
              >
                {disabled ? '実行中…' : confirm.ctaLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// -----------------------------------------------------------------------------
// helpers (kept local to avoid changing existing server-side helpers)
// -----------------------------------------------------------------------------
function statusLabel(s: string): string {
  switch (s) {
    case 'draft':     return '下書き'
    case 'published': return '公開中'
    case 'sold_out':  return '在庫切れ (旧仕様)'
    case 'archived':  return 'アーカイブ（非表示）'
    default:          return s
  }
}
function statusColor(s: string): string {
  switch (s) {
    case 'published': return 'bg-emerald-100 text-emerald-800'
    case 'draft':     return 'bg-neutral-100 text-neutral-700'
    case 'sold_out':  return 'bg-amber-100 text-amber-800'
    case 'archived':  return 'bg-neutral-100 text-neutral-500'
    default:          return 'bg-neutral-100 text-neutral-700'
  }
}
function formatDate(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}/${m}/${day} ${hh}:${mm}`
}
