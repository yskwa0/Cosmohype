import { getBrandAdminContext, isBrandAdminDevBypassEnabled } from '@/lib/brandAdmin'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import ReturnAddressForm, {
  type ReturnAddressInitial,
} from '@/components/brand-admin/ReturnAddressForm'
import ShippingRulesForm, {
  type ShippingRulesInitial,
} from '@/components/brand-admin/ShippingRulesForm'
import { updateReturnAddressAction, updateShippingRulesAction } from './actions'

export const dynamic = 'force-dynamic'

interface Row {
  return_recipient_name: string | null
  return_postal_code: string | null
  return_prefecture: string | null
  return_city: string | null
  return_address_line1: string | null
  return_address_line2: string | null
  return_phone: string | null
}

function ErrorBanner({ title, detail }: { title: string; detail: string }) {
  return (
    <div>
      <h1 className="text-lg font-semibold mb-2">{title}</h1>
      <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 whitespace-pre-wrap break-words">
        {detail}
      </div>
    </div>
  )
}

function errorLabel(code: string): string {
  switch (code) {
    case 'required_field_missing': return '必須項目が未入力です。'
    case 'invalid_postal_code':    return '郵便番号の形式が正しくありません (数字 7 桁)。'
    case 'forbidden':              return '編集権限がありません (owner / admin のみ)。'
    case 'not_authenticated':      return '認証情報が失われました。再ログインしてください。'
    case 'service_role_missing':   return 'Dev Bypass に service_role key が設定されていません。'
    case 'update_failed':          return '保存に失敗しました。時間をおいて再度お試しください。'
    case 'shipping_flat_required': return '全国一律送料 (数字、0 以上) を入力してください。'
    case 'shipping_threshold_positive': return '送料無料閾値は 1 円以上を入力してください (空欄可)。'
    case 'shipping_update_failed': return '送料ルールの保存に失敗しました。'
    default:                       return `保存に失敗しました (${code})`
  }
}

export default async function BrandAdminSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string; err?: string }>
}) {
  const sp = (await searchParams) ?? {}
  const savedOk = sp.saved === '1'
  const savedShipping = sp.saved === 'shipping'
  const errCode = sp.err ?? null

  const ctx = await getBrandAdminContext()
  const bypass = isBrandAdminDevBypassEnabled()

  if (bypass && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <ErrorBanner
        title="Dev Bypass 設定不足"
        detail="Dev Bypass 経路では .env.local に SUPABASE_SERVICE_ROLE_KEY を Test project の service_role key で設定する必要があります。"
      />
    )
  }

  const supabase = bypass ? createAdminClient() : await createClient()
  const loose = supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: Row | null; error: { message: string } | null }>
        }
      }
    }
  }

  const res = await loose
    .from('shop_brands')
    .select(
      'return_recipient_name, return_postal_code, return_prefecture, return_city, return_address_line1, return_address_line2, return_phone'
    )
    .eq('id', ctx.currentBrand.brandId)
    .maybeSingle()

  if (res.error) {
    return (
      <ErrorBanner
        title="ブランド情報の取得に失敗しました"
        detail={res.error.message}
      />
    )
  }

  // Migration 136 適用チェック: 新地域列 `rate_hokkaido` を狙って SELECT。
  //   ・地域列が無い環境 → "column ... does not exist" エラー → migration136NotApplied=true
  //   ・地域列がある環境 → 正常 (0 行 or 1 行)
  const shipProbe = await (loose as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (col: string, val: string) => {
          eq: (col: string, val: string) => {
            eq: (col: string, val: boolean) => {
              maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>
            }
          }
        }
      }
    }
  })
    .from('shop_brand_shipping_rules')
    .select('flat_rate, free_shipping_threshold, rate_hokkaido, rate_tohoku, rate_kanto, rate_chubu, rate_kinki, rate_chugoku, rate_shikoku, rate_kyushu, rate_okinawa')
    .eq('brand_id', ctx.currentBrand.brandId)
    .eq('country_code', 'JP')
    .eq('is_active', true)
    .maybeSingle()

  const migration136NotApplied =
    shipProbe.error !== null &&
    /rate_[a-z]+.*does not exist|column .* does not exist/i.test(shipProbe.error.message)

  const shipInitial: ShippingRulesInitial = {
    flatRate:              typeof shipProbe.data?.flat_rate === 'number' ? (shipProbe.data.flat_rate as number) : null,
    freeShippingThreshold: typeof shipProbe.data?.free_shipping_threshold === 'number' ? (shipProbe.data.free_shipping_threshold as number) : null,
    rateHokkaido: typeof shipProbe.data?.rate_hokkaido === 'number' ? (shipProbe.data.rate_hokkaido as number) : null,
    rateTohoku:   typeof shipProbe.data?.rate_tohoku   === 'number' ? (shipProbe.data.rate_tohoku   as number) : null,
    rateKanto:    typeof shipProbe.data?.rate_kanto    === 'number' ? (shipProbe.data.rate_kanto    as number) : null,
    rateChubu:    typeof shipProbe.data?.rate_chubu    === 'number' ? (shipProbe.data.rate_chubu    as number) : null,
    rateKinki:    typeof shipProbe.data?.rate_kinki    === 'number' ? (shipProbe.data.rate_kinki    as number) : null,
    rateChugoku:  typeof shipProbe.data?.rate_chugoku  === 'number' ? (shipProbe.data.rate_chugoku  as number) : null,
    rateShikoku:  typeof shipProbe.data?.rate_shikoku  === 'number' ? (shipProbe.data.rate_shikoku  as number) : null,
    rateKyushu:   typeof shipProbe.data?.rate_kyushu   === 'number' ? (shipProbe.data.rate_kyushu   as number) : null,
    rateOkinawa:  typeof shipProbe.data?.rate_okinawa  === 'number' ? (shipProbe.data.rate_okinawa  as number) : null,
  }
  const shipReadError =
    (!migration136NotApplied && shipProbe.error) ? shipProbe.error.message : null

  const initial: ReturnAddressInitial = {
    recipientName: res.data?.return_recipient_name ?? '',
    postalCode:    res.data?.return_postal_code    ?? '',
    prefecture:    res.data?.return_prefecture     ?? '',
    city:          res.data?.return_city           ?? '',
    addressLine1:  res.data?.return_address_line1  ?? '',
    addressLine2:  res.data?.return_address_line2  ?? '',
    phone:         res.data?.return_phone          ?? '',
  }

  // staff は編集不可 (owner / admin のみ)。Dev Bypass は admin なので編集可。
  const canEdit = ctx.currentBrand.role === 'owner' || ctx.currentBrand.role === 'admin'
  const disabledReason = canEdit
    ? undefined
    : '返品先住所の編集は owner / admin のみです。'

  return (
    <div className="space-y-8">
      <div>
        <div className="text-[10px] tracking-[0.3em] text-neutral-500">
          {ctx.currentBrand.brandName}
        </div>
        <h1 className="mt-1 text-2xl font-semibold">ブランド設定</h1>
        <div className="mt-2 text-[11px] text-neutral-500">
          返品先住所を編集します。iOS 側の返品情報登録画面で表示されます。
        </div>
      </div>

      {savedOk && (
        <div className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          返品先住所を保存しました。
        </div>
      )}
      {savedShipping && (
        <div className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          送料ルールを保存しました。
        </div>
      )}
      {errCode && !savedOk && !savedShipping && (
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {errorLabel(errCode)}
        </div>
      )}

      <section className="border border-neutral-200 rounded-xl bg-white p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold">返品先住所</h2>
          <div className="mt-1 text-[11px] text-neutral-500">
            承認された商品トラブル (issue) に対し、iOS 購入者へ表示される返送先です。
            通常のブランド住所とは別管理です。
          </div>
        </div>
        <ReturnAddressForm
          initial={initial}
          action={updateReturnAddressAction}
          disabled={!canEdit}
          disabledReason={disabledReason}
        />
      </section>

      <section className="border border-neutral-200 rounded-xl bg-white p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold">配送・送料設定</h2>
          <div className="mt-1 text-[11px] text-neutral-500">
            自ブランド商品の送料を全国一律 / 地域別 / 送料無料閾値で設定します。
            iOS 購入者は住所入力時に本ルールに基づいた送料を確認できます。
          </div>
          {migration136NotApplied && (
            <div className="mt-2 text-[12px] text-orange-800 bg-orange-50 border border-orange-200 rounded px-3 py-2">
              送料設定機能の準備が完了していません (DB 側の準備待ち)。設定完了までしばらくお待ちください。
            </div>
          )}
          {shipReadError && !migration136NotApplied && (
            <div className="mt-2 text-[11px] text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1">
              送料ルールの読込に失敗しました。新規入力として扱います。詳細: {shipReadError}
            </div>
          )}
        </div>
        {!migration136NotApplied && (
          <ShippingRulesForm
            initial={shipInitial}
            action={updateShippingRulesAction}
            disabled={!canEdit}
            disabledReason={disabledReason}
          />
        )}
      </section>
    </div>
  )
}
