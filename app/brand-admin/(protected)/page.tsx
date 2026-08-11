import { getBrandAdminContext } from '@/lib/brandAdmin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * /brand-admin — Dashboard (Phase 1)
 *
 * 現在ブランド名 / role / 3 カード (商品件数 / 注文件数 / 未対応トラブル件数) を表示。
 * 集計は最小限の COUNT のみ。RPC はまだ追加しない。
 */
export default async function BrandAdminDashboardPage() {
  const ctx = await getBrandAdminContext()
  const supabase = await createClient()

  // types/database.ts に shop_* が無いため as unknown 経由でクエリ
  type LooseSupabase = {
    from: (t: string) => {
      select: (s: string, opts?: { count?: 'exact'; head?: boolean }) => {
        eq: (col: string, val: string) => {
          in?: (col: string, vals: string[]) => Promise<{ count: number | null; error: unknown }>
        } & Promise<{ count: number | null; error: unknown }>
      }
    }
  }
  const loose = supabase as unknown as LooseSupabase
  const brandId = ctx.currentBrand.brandId

  // 商品件数 (自ブランドの published + draft を含む)
  const productsRes = await loose
    .from('shop_products')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', brandId)

  // 未対応の shop_order_issues (submitted or under_review)
  const openIssuesRes = await (supabase as unknown as {
    from: (t: string) => {
      select: (s: string, opts?: { count?: 'exact'; head?: boolean }) => {
        eq: (c: string, v: string) => {
          in: (c: string, v: string[]) => Promise<{ count: number | null; error: unknown }>
        }
      }
    }
  })
    .from('shop_order_issues')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', brandId)
    .in('status', ['submitted', 'under_review'])

  // 注文件数 (自ブランドを含む order の件数)。shop_order_groups で brand_id 一致するもの
  const orderGroupsRes = await loose
    .from('shop_order_groups')
    .select('order_id', { count: 'exact', head: true })
    .eq('brand_id', brandId)

  const productsCount = productsRes.error ? null : productsRes.count ?? 0
  const openIssuesCount = openIssuesRes.error ? null : openIssuesRes.count ?? 0
  const orderGroupsCount = orderGroupsRes.error ? null : orderGroupsRes.count ?? 0

  return (
    <div>
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.3em] text-neutral-500">
          {ctx.currentBrand.brandName}
        </div>
        <h1 className="mt-1 text-2xl font-semibold">ブランド管理ダッシュボード</h1>
        <div className="mt-2 text-xs text-neutral-500">
          role: {ctx.currentBrand.role}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="商品"
          value={productsCount}
          hint="登録商品数"
        />
        <StatCard
          label="注文"
          value={orderGroupsCount}
          hint="ブランドが含まれる注文"
        />
        <StatCard
          label="未対応トラブル"
          value={openIssuesCount}
          hint="submitted / under_review"
          highlight={openIssuesCount != null && openIssuesCount > 0}
        />
      </div>

      <div className="mt-10 text-[11px] text-neutral-500 leading-relaxed">
        Phase 1: このダッシュボードは現状の件数表示のみです。
        商品管理 / 注文管理 / 商品トラブル対応の各画面は今後実装されます。
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string
  value: number | null
  hint: string
  highlight?: boolean
}) {
  return (
    <div
      className={
        'rounded-xl border p-5 bg-white ' +
        (highlight ? 'border-orange-300' : 'border-neutral-200')
      }
    >
      <div className="text-[10px] tracking-widest text-neutral-500">
        {label.toUpperCase()}
      </div>
      <div className={'mt-2 text-3xl font-semibold ' + (highlight ? 'text-orange-600' : 'text-neutral-900')}>
        {value == null ? '—' : value.toLocaleString('ja-JP')}
      </div>
      <div className="mt-1 text-[10px] text-neutral-500">{hint}</div>
    </div>
  )
}
