'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'

/**
 * Brand Admin 商品一覧の Client 版レンダラ。
 *
 * 役割:
 *   1. useOptimistic で「アーカイブ / 完全削除」時に対象行を即時 hide
 *   2. 各行の「…」メニュー + 確認ダイアログ (product 名表示 / 二重押し防止)
 *   3. Server Action を useTransition 経由で呼出、redirect 完了で revalidatePath 反映
 *   4. 失敗時は親再描画で該当 id が visible list に残り、useOptimistic overlay 消滅 → 自動 rollback
 *
 * 変更しないもの:
 *   - list の見た目 (image / status pill / name / price / metadata)
 *   - primary image / storage / sort_order
 *
 * status ごとのメニュー構成:
 *   published : 下書きに戻す / アーカイブ           (完全削除は先に非公開化を要求)
 *   draft     : アーカイブ / 完全削除 (赤)
 *   archived  : 下書きに戻す / 完全削除 (赤)
 *
 * 「アーカイブ」は status='archived' の soft delete (既存 archiveProductAction)。
 * 「完全削除」は DB + Storage を物理削除 (deleteProductAction)。注文履歴があると server 側 guard で拒否。
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
  deleteAction: (formData: FormData) => Promise<void>
}

export default function ProductListActions({
  items, publicBase, canEdit, revertToDraftAction, archiveAction, deleteAction,
}: Props) {
  const ids = items.map((i) => i.id)
  const [visibleIds, hideOptimistically] = useOptimistic<string[], string>(
    ids,
    (cur, hideId) => cur.filter((id) => id !== hideId),
  )
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()
  // 単一メニューだけを開くための状態を親側で持つ
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

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

  const doDelete = (id: string) => {
    if (pendingIds.has(id)) return
    markPending(id)
    startTransition(async () => {
      // 完全削除: Optimistic に list から除外。失敗時は親再描画で id が残り自動 rollback。
      hideOptimistically(id)
      const fd = new FormData()
      fd.set('product_id', id)
      try { await deleteAction(fd) } catch { /* NEXT_REDIRECT normal path */ }
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
                isOpen={openMenuId === p.id}
                onOpenChange={(open) => setOpenMenuId(open ? p.id : null)}
                onArchive={() => doArchive(p.id)}
                onRevertToDraft={() => doRevertToDraft(p.id)}
                onDelete={() => doDelete(p.id)}
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
//
// dropdown は親コンテナ (list card / rounded overflow-hidden) に切られないよう
// React Portal で document.body 直下に描画し、button の
// getBoundingClientRect() を基準に fixed 座標で配置する。
// viewport 下端付近では上方向にも開く。
// scroll / resize / Esc / 外側クリックで close。
// 「開いているメニュー」は親側 state (openMenuId) で単一化する。
// -----------------------------------------------------------------------------
function RowMenu({
  productName, status, disabled, isOpen, onOpenChange,
  onArchive, onRevertToDraft, onDelete,
}: {
  productId: string   // 保持: 呼出側からの identifier、将来 log/telemetry 用
  productName: string
  status: string
  disabled: boolean
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onArchive: () => void
  onRevertToDraft: () => void
  onDelete: () => void
}) {
  const [confirm, setConfirm] = useState<null | {
    title: string; body: string; ctaLabel: string; ctaClass: string; run: () => void
  }>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const menuElRef = useRef<HTMLDivElement | null>(null)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({ position: 'fixed', opacity: 0 })

  const shortName = productName.length > 40 ? productName.slice(0, 40) + '…' : productName
  const openConfirm = (kind: 'delete' | 'archive' | 'revert') => {
    onOpenChange(false)
    if (kind === 'delete') {
      // 完全削除: DB + Storage を物理削除、注文履歴があると server 側 guard で拒否される
      setConfirm({
        title: 'この商品を完全に削除しますか？',
        body: `「${shortName}」\n\nこの操作は取り消せません。`,
        ctaLabel: '完全に削除',
        ctaClass: 'bg-red-600 text-white hover:bg-red-700',
        run: () => { setConfirm(null); onDelete() },
      })
    } else if (kind === 'archive') {
      // アーカイブ: 非表示化のみ、後で復元可
      setConfirm({
        title: 'この商品をアーカイブしますか？',
        body: `「${shortName}」をアーカイブします。\nHYPE の商品一覧から非表示になります (アーカイブ一覧から後で復元できます)。`,
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

  // status ごとのメニュー構成
  //   published: 「下書きに戻す」/「アーカイブ」  (完全削除は先に非公開化を要求)
  //   draft    : 「アーカイブ」/「完全削除」
  //   archived : 「下書きに戻す」/「完全削除」
  const items: Array<{ label: string; onClick: () => void; danger?: boolean }> = []
  if (status === 'published') {
    items.push({ label: '下書きに戻す', onClick: () => openConfirm('revert') })
    items.push({ label: 'アーカイブ', onClick: () => openConfirm('archive') })
  } else if (status === 'draft') {
    items.push({ label: 'アーカイブ', onClick: () => openConfirm('archive') })
    items.push({ label: '完全削除', onClick: () => openConfirm('delete'), danger: true })
  } else if (status === 'archived') {
    items.push({ label: '下書きに戻す', onClick: () => openConfirm('revert') })
    items.push({ label: '完全削除', onClick: () => openConfirm('delete'), danger: true })
  }

  const itemCount = items.length
  const computePosition = useCallback(() => {
    const btn = buttonRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const vh = window.innerHeight
    const vw = window.innerWidth
    const gap = 4
    // menu の推定高さ (項目数 + padding) — 初期表示の flip 判定用
    const estHeight = itemCount * 32 + 8
    const spaceBelow = vh - rect.bottom
    const spaceAbove = rect.top
    const openUp = spaceBelow < estHeight + 8 && spaceAbove > spaceBelow
    const rightOffset = Math.max(4, vw - rect.right)
    setMenuStyle({
      position: 'fixed',
      right: rightOffset,
      zIndex: 60,
      ...(openUp
        ? { bottom: vh - rect.top + gap }
        : { top: rect.bottom + gap }),
    })
  }, [itemCount])

  // メニュー open 時: 位置計算 + scroll / resize / Esc / 外側クリック listeners
  useEffect(() => {
    if (!isOpen) return
    computePosition()
    const closeIt = () => onOpenChange(false)
    const onScrollOrResize = () => closeIt()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeIt() }
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (buttonRef.current?.contains(t)) return
      if (menuElRef.current?.contains(t)) return
      closeIt()
    }
    // capture=true で祖先の scroll (list container など) も拾う
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen, computePosition, onOpenChange])

  if (items.length === 0) return null

  return (
    <>
      <div className="shrink-0">
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          aria-label="商品操作メニュー"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenChange(!isOpen) }}
          className="px-2 py-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <circle cx="4" cy="10" r="1.6" />
            <circle cx="10" cy="10" r="1.6" />
            <circle cx="16" cy="10" r="1.6" />
          </svg>
        </button>
      </div>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          role="menu"
          ref={menuElRef}
          style={menuStyle}
          className="min-w-[10rem] max-w-[calc(100vw-16px)] rounded-md border border-neutral-200 bg-white shadow-md py-1"
          onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
        >
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); it.onClick() }}
              className={
                'w-full text-left px-3 py-1.5 text-[12px] hover:bg-neutral-50 ' +
                (it.danger ? 'text-red-700' : 'text-neutral-800')
              }
            >
              {it.label}
            </button>
          ))}
        </div>,
        document.body,
      )}

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
