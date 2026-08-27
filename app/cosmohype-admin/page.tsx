import Link from 'next/link'

export const dynamic = 'force-dynamic'

/**
 * Cosmohype 運営者ダッシュボード (Phase C 最小構成)。
 * 現時点では 2 機能のみ — 商品強制停止 / ブランド停止・再開。
 * Phase D 以降で注文横断検索 / 商品通報 review 等を追加予定。
 */
export default function CosmohypeAdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">運営者ダッシュボード</h1>
        <p className="mt-2 text-sm text-neutral-600">
          HYPE 上で問題のある商品・ブランドを停止できます。
          誤操作を防ぐため、停止 / 再開の操作には確認ダイアログが表示されます。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/cosmohype-admin/products"
          className="block rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-400 hover:shadow-sm transition"
        >
          <div className="text-[10px] font-bold tracking-widest text-neutral-500">PRODUCTS</div>
          <div className="mt-1 text-base font-semibold text-neutral-900">商品管理</div>
          <div className="mt-2 text-[12px] text-neutral-600">
            商品名・ブランド名・product id で検索し、問題商品を販売停止できます。
          </div>
        </Link>

        <Link
          href="/cosmohype-admin/brands"
          className="block rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-400 hover:shadow-sm transition"
        >
          <div className="text-[10px] font-bold tracking-widest text-neutral-500">BRANDS</div>
          <div className="mt-1 text-base font-semibold text-neutral-900">ブランド管理</div>
          <div className="mt-2 text-[12px] text-neutral-600">
            ブランド名・slug・brand id で検索し、ブランドを停止 / 再開できます。
            停止しても既存注文の対応は継続できます。
          </div>
        </Link>

        <Link
          href="/cosmohype-admin/orders"
          className="block rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-400 hover:shadow-sm transition"
        >
          <div className="text-[10px] font-bold tracking-widest text-neutral-500">ORDERS</div>
          <div className="mt-1 text-base font-semibold text-neutral-900">注文管理</div>
          <div className="mt-2 text-[12px] text-neutral-600">
            全ブランドを横断して注文を検索・詳細確認できます (閲覧のみ)。
            order id / buyer / brand / product / payment status で絞込。
          </div>
        </Link>

        <Link
          href="/cosmohype-admin/reports"
          className="block rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-400 hover:shadow-sm transition"
        >
          <div className="text-[10px] font-bold tracking-widest text-neutral-500">REPORTS</div>
          <div className="mt-1 text-base font-semibold text-neutral-900">商品通報</div>
          <div className="mt-2 text-[12px] text-neutral-600">
            HYPE 商品に対するユーザー通報を一覧・詳細確認し、status を open → reviewing → resolved / dismissed に更新できます。
            対応が必要な商品は「商品管理へ」から Phase C の販売停止に遷移できます。
          </div>
        </Link>

        <Link
          href="/cosmohype-admin/transfers"
          className="block rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-400 hover:shadow-sm transition"
        >
          <div className="text-[10px] font-bold tracking-widest text-neutral-500">送金・送金取消</div>
          <div className="mt-1 text-base font-semibold text-neutral-900">ブランドへの送金・送金取消の監視</div>
          <div className="mt-2 text-[12px] text-neutral-600">
            Stripe Connect を通じたブランドへの送金と、返金にともなう送金取消の状況を監視します。
            5 回連続で失敗した案件は初期表示で「要確認の案件」に集約されます。
            失敗した送金取消は運営から再試行または対応終了を選べます。
          </div>
        </Link>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="text-[10px] font-bold tracking-widest text-neutral-500">POLICY</div>
        <div className="mt-1 text-sm font-semibold text-neutral-900">運営者操作の原則</div>
        <ul className="mt-3 space-y-1.5 text-[12px] text-neutral-700">
          <li>・停止操作はすべて監査ログ (`shop_admin_actions`) に保存されます。</li>
          <li>・「新規販売停止」と「既存注文対応停止」は別物です。停止後も過去注文の発送 / 返金対応は継続できます。</li>
          <li>・ブランド停止 (suspended) と復元 (active) はここから戻せます。 archived 状態のブランドは本画面からは戻せません。</li>
        </ul>
      </div>
    </div>
  )
}
