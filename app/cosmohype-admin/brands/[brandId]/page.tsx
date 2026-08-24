import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCosmohypeAdminContext } from '@/lib/cosmohypeAdmin'

export const dynamic = 'force-dynamic'

/**
 * Cosmohype 運営者向け ブランド詳細 (Phase F、read-only)。
 * 主目的は「特定商取引法に基づく表記 (Migration 163) の登録内容を運営が確認する」こと。
 * ブランド停止 / 再開など既存操作は一覧側 (/cosmohype-admin/brands) から引き続き行う。
 *
 * 【編集権限の分界】
 *   運営者はここで販売事業者情報を **確認するのみ** — 編集不可 (form / action は存在しない)。
 *   ブランドの owner/admin だけが Brand Admin (/brand-admin/settings) から編集可能。
 *   本ページは SELECT のみで、shop_brand_update_legal_info RPC は呼ばない。
 */

interface BrandDetailRow {
  id: string
  name: string
  slug: string
  status: string
  // Migration 163: 特商法表記 販売事業者情報
  legal_name:                 string | null
  legal_representative_name:  string | null
  legal_postal_code:          string | null
  legal_prefecture:           string | null
  legal_city:                 string | null
  legal_address_line1:        string | null
  legal_address_line2:        string | null
  legal_phone:                string | null
  legal_email:                string | null
}

function formatPostal(p: string | null): string {
  if (!p) return '-'
  if (/^\d{7}$/.test(p)) return `${p.slice(0, 3)}-${p.slice(3)}`
  return p
}

function fullAddress(row: BrandDetailRow): string {
  const parts = [row.legal_prefecture, row.legal_city, row.legal_address_line1, row.legal_address_line2]
    .filter((s): s is string => !!s && s.length > 0)
  return parts.length === 0 ? '-' : parts.join(' ')
}

export default async function CosmohypeAdminBrandDetailPage({
  params,
}: {
  params: Promise<{ brandId: string }>
}) {
  await getCosmohypeAdminContext()

  const { brandId } = await params
  const isValidUuid = /^[0-9a-fA-F-]{36}$/.test(brandId)
  if (!isValidUuid) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          ブランド ID の形式が正しくありません。
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const loose = supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: BrandDetailRow | null; error: { message: string } | null }>
        }
      }
    }
  }

  const { data, error } = await loose
    .from('shop_brands')
    .select('id, name, slug, status, legal_name, legal_representative_name, legal_postal_code, legal_prefecture, legal_city, legal_address_line1, legal_address_line2, legal_phone, legal_email')
    .eq('id', brandId)
    .maybeSingle()

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          ブランド情報の取得に失敗しました: {error.message}
        </div>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="text-[12px] text-neutral-500 bg-neutral-50 border border-neutral-200 rounded px-3 py-2">
          対象ブランドが見つかりませんでした。
        </div>
      </div>
    )
  }

  const b = data
  const hasAnyLegalField = [
    b.legal_name, b.legal_representative_name, b.legal_postal_code, b.legal_prefecture,
    b.legal_city, b.legal_address_line1, b.legal_address_line2, b.legal_phone, b.legal_email,
  ].some((v) => v !== null && v.length > 0)

  return (
    <div className="space-y-6">
      <BackLink />

      <div>
        <div className="text-[10px] font-bold tracking-widest text-neutral-500">BRAND</div>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900">{b.name}</h1>
        <div className="mt-1 text-[12px] text-neutral-500 font-mono break-all">{b.id}</div>
        <div className="mt-1 text-[12px] text-neutral-600">
          slug: <span className="font-mono">{b.slug}</span> / status: <span className="font-semibold">{b.status}</span>
        </div>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">販売事業者情報 (特定商取引法に基づく表記)</h2>
          <div className="mt-1 text-[11px] text-neutral-500">
            編集はブランドの owner/admin が Brand Admin (/brand-admin/settings) から実施。
            本ページは Cosmohype 運営が登録状況を <b>閲覧のみ</b> 行うためのものです。
          </div>
        </div>

        {!hasAnyLegalField ? (
          <div className="text-[12px] text-orange-800 bg-orange-50 border border-orange-200 rounded px-3 py-2">
            販売事業者情報は未登録です。 このブランドの商品を公開販売する前に、ブランド owner/admin に入力を依頼してください。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
            <Kv label="法人名 / 個人事業者氏名" value={b.legal_name ?? '-'} />
            <Kv label="代表責任者名" value={b.legal_representative_name ?? '-'} />
            <Kv label="郵便番号" value={formatPostal(b.legal_postal_code)} mono />
            <Kv label="所在地" value={fullAddress(b)} />
            <Kv label="電話番号" value={b.legal_phone ?? '-'} mono />
            <Kv label="メール" value={b.legal_email ?? '-'} mono />
          </div>
        )}
      </section>
    </div>
  )
}

function BackLink() {
  return (
    <div>
      <Link href="/cosmohype-admin/brands" className="text-[12px] text-neutral-600 hover:text-neutral-900">
        ← ブランド一覧へ戻る
      </Link>
    </div>
  )
}

function Kv({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-neutral-500">{label}</div>
      <div className={`mt-0.5 text-[13px] text-neutral-800 ${mono ? 'font-mono break-all' : 'break-words'}`}>
        {value}
      </div>
    </div>
  )
}
