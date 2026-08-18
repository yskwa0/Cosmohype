import { getBrandAdminContext, isBrandAdminDevBypassEnabled } from '@/lib/brandAdmin'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { type ReturnAddressInitial } from '@/components/brand-admin/ReturnAddressForm'
import ReturnAddressSection from '@/components/brand-admin/ReturnAddressSection'
import { type ShippingRulesInitial } from '@/components/brand-admin/ShippingRulesForm'
import ShippingRulesSection from '@/components/brand-admin/ShippingRulesSection'
import BrandProfileForm, { type BrandProfileInitial } from '@/components/brand-admin/BrandProfileForm'
import { updateReturnAddressAction, updateShippingRulesAction, updateBrandProfileAction } from './actions'

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
    // Migration 147: Website / Instagram 入力は撤去 (関連 error code はもう発生しない)
    case 'file_too_large':         return 'ファイルサイズが上限 (8MB) を超えています。'
    case 'not_image':              return '画像ファイルを選択してください。'
    case 'upload_failed':          return '画像のアップロードに失敗しました。時間をおいて再度お試しください。'
    case 'name_required':          return 'ブランド名を入力してください。'
    case 'name_too_long':          return 'ブランド名は 100 文字以内で入力してください。'
    default:                       return `保存に失敗しました (${code})`
  }
}

interface ProfileRow {
  name: string | null
  description: string | null
  logo_path: string | null
  cover_path: string | null
  // Migration 147: crop metadata (nullable、NULL = 中央 aspectFill = zoom 1 / offset 0)
  logo_crop_zoom: number | null
  logo_crop_offset_x: number | null
  logo_crop_offset_y: number | null
  cover_crop_zoom: number | null
  cover_crop_offset_x: number | null
  cover_crop_offset_y: number | null
}

export default async function BrandAdminSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string; err?: string }>
}) {
  const sp = (await searchParams) ?? {}
  const savedOk = sp.saved === '1'
  const savedShipping = sp.saved === 'shipping'
  const savedProfile = sp.saved === 'profile'
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

  // ブランドプロフィール取得 (Migration 145)。 shop_brands 内 name / description / logo_path /
  // cover_path / website_url / instagram_url を 1 shot で読出、public URL は base URL + bucket
  // (`shop-brand-assets`) + path で組立。
  const supaUrlBase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const brandAssetPublicBase = supaUrlBase
    ? `${supaUrlBase}/storage/v1/object/public/shop-brand-assets/`
    : ''

  // 高速化: 返品先住所 + 送料ルール + brand profile を Promise.all で並列化
  const [res, shipProbe, profileProbe] = await Promise.all([
    loose
      .from('shop_brands')
      .select(
        'return_recipient_name, return_postal_code, return_prefecture, return_city, return_address_line1, return_address_line2, return_phone'
      )
      .eq('id', ctx.currentBrand.brandId)
      .maybeSingle(),
    (loose as unknown as {
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
      .maybeSingle(),
    (loose as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (col: string, val: string) => {
            maybeSingle: () => Promise<{ data: ProfileRow | null; error: { message: string } | null }>
          }
        }
      }
    })
      .from('shop_brands')
      .select('name, description, logo_path, cover_path, logo_crop_zoom, logo_crop_offset_x, logo_crop_offset_y, cover_crop_zoom, cover_crop_offset_x, cover_crop_offset_y')
      .eq('id', ctx.currentBrand.brandId)
      .maybeSingle(),
  ])

  if (res.error) {
    return (
      <ErrorBanner
        title="ブランド情報の取得に失敗しました"
        detail={res.error.message}
      />
    )
  }

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

  // ブランドプロフィール initial (Migration 147)。 name は fallback で ctx.currentBrand.brandName。
  // logo/cover は path が存在すれば shop-brand-assets bucket の public URL に組立。
  // crop metadata (Migration 147) は NULL の場合 zoom=1 / offset=0 = 中央 aspectFill にフォールバック。
  const profileRow = profileProbe.data ?? null
  const profileInitial: BrandProfileInitial = {
    brandName:   profileRow?.name ?? ctx.currentBrand.brandName,
    description: profileRow?.description ?? '',
    logoPath:    profileRow?.logo_path ?? null,
    coverPath:   profileRow?.cover_path ?? null,
    logoURL:  (profileRow?.logo_path && brandAssetPublicBase)
                ? `${brandAssetPublicBase}${profileRow.logo_path}`
                : null,
    coverURL: (profileRow?.cover_path && brandAssetPublicBase)
                ? `${brandAssetPublicBase}${profileRow.cover_path}`
                : null,
    logoCrop: {
      zoom:    profileRow?.logo_crop_zoom     ?? 1.0,
      offsetX: profileRow?.logo_crop_offset_x ?? 0.0,
      offsetY: profileRow?.logo_crop_offset_y ?? 0.0,
    },
    coverCrop: {
      zoom:    profileRow?.cover_crop_zoom     ?? 1.0,
      offsetX: profileRow?.cover_crop_offset_x ?? 0.0,
      offsetY: profileRow?.cover_crop_offset_y ?? 0.0,
    },
  }
  const profileReadError = profileProbe.error?.message ?? null

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
      {savedProfile && (
        <div className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          ブランドプロフィールを保存しました。
        </div>
      )}
      {errCode && !savedOk && !savedShipping && !savedProfile && (
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {errorLabel(errCode)}
        </div>
      )}

      <section className="border border-neutral-200 rounded-xl bg-white p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold">ブランドプロフィール</h2>
          <div className="mt-1 text-[11px] text-neutral-500">
            iOS HYPE の「ブランドショップページ」に表示されるプロフィール情報です。
            ロゴ・カバー画像・紹介文・SNS リンクを編集できます。
          </div>
          {profileReadError && (
            <div className="mt-2 text-[11px] text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1">
              プロフィール取得に失敗しました。新規入力として扱います。詳細: {profileReadError}
            </div>
          )}
        </div>
        <BrandProfileForm
          initial={profileInitial}
          action={updateBrandProfileAction}
          disabled={!canEdit}
          disabledReason={disabledReason}
        />
      </section>

      <section className="border border-neutral-200 rounded-xl bg-white p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold">返品先住所</h2>
          <div className="mt-1 text-[11px] text-neutral-500">
            承認された商品トラブル (issue) に対し、iOS 購入者へ表示される返送先です。
            通常のブランド住所とは別管理です。
          </div>
        </div>
        <ReturnAddressSection
          initial={initial}
          action={updateReturnAddressAction}
          canEdit={canEdit}
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
          <ShippingRulesSection
            initial={shipInitial}
            action={updateShippingRulesAction}
            canEdit={canEdit}
            disabledReason={disabledReason}
          />
        )}
      </section>
    </div>
  )
}
