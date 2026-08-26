import { getBrandAdminContext } from '@/lib/brandAdmin'
import { createClient } from '@/lib/supabase/server'
import { type ReturnAddressInitial } from '@/components/brand-admin/ReturnAddressForm'
import ReturnAddressSection from '@/components/brand-admin/ReturnAddressSection'
import { type ShippingRulesInitial } from '@/components/brand-admin/ShippingRulesForm'
import ShippingRulesSection from '@/components/brand-admin/ShippingRulesSection'
import BrandProfileForm, { type BrandProfileInitial } from '@/components/brand-admin/BrandProfileForm'
import BrandSocialLinksForm, { type BrandSocialLinksInitial } from '@/components/brand-admin/BrandSocialLinksForm'
import BrandLegalInfoForm, { type BrandLegalInfoInitial } from '@/components/brand-admin/BrandLegalInfoForm'
import { type DeliveryReturnPolicyInitial } from '@/components/brand-admin/DeliveryReturnPolicyForm'
import DeliveryReturnPolicySection from '@/components/brand-admin/DeliveryReturnPolicySection'
import StripeConnectSection, { type StripeConnectStatus } from '@/components/brand-admin/StripeConnectSection'
import {
  updateReturnAddressAction,
  updateShippingRulesAction,
  updateBrandProfileAction,
  updateBrandSocialLinksAction,
  updateBrandLegalInfoAction,
  updateDeliveryReturnPolicyAction,
} from './actions'
import {
  startStripeConnectOnboardingAction,
  syncStripeConnectStatusAction,
} from './stripeConnectActions'

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
    // Migration 162: SNS リンク
    case 'website_url_too_long':   return '公式サイト URL は 500 文字以内で入力してください。'
    case 'instagram_url_too_long': return 'Instagram URL は 500 文字以内で入力してください。'
    case 'website_url_invalid':    return '公式サイト URL は http:// または https:// で始まる URL を入力してください。'
    case 'instagram_url_invalid':  return 'Instagram URL は https://www.instagram.com/<ユーザー名>/ 形式で入力してください。'
    // Phase B (Migration 155): 配送・返品ポリシー
    case 'invalid_dispatch_lead_days':      return '発送目安は 1〜90 日の整数で入力してください。'
    case 'invalid_return_days':             return '返品受付期間は 1〜365 日の整数で入力してください。'
    case 'return_days_required_when_accepted': return '返品を「受付する」に設定した場合は、受付期間 (日数) を入力してください。'
    // Migration 155 整合性 CHECK 由来: 「受付しない」/「未設定」なのに日数が入っている状態を拒否
    case 'return_days_only_when_accepted':  return '返品を「受付する」以外に設定した場合は、受付期間 (日数) を入力しないでください。'
    // Phase 4-A (Migration 167): 返品送料負担者
    case 'invalid_return_shipping_cost_bearer':          return '返品送料の負担 (購入者都合返品) は「購入者負担」または「販売事業者負担」を選択してください。'
    case 'return_shipping_cost_bearer_required':         return '返品を「受付する」に設定した場合は、返品送料の負担 (購入者都合返品) を選択してください。'
    case 'return_shipping_cost_bearer_only_when_accepted': return '返品を「受付する」以外に設定した場合は、返品送料の負担 (購入者都合返品) を選択しないでください。'
    // Phase 4-B (Migration 168): ブランド出店規約 同意
    case 'merchant_agreement_owner_only':          return 'ブランド出店規約への同意は、このブランドの owner のみが行えます。 owner にログインしていただき、Brand Admin 上の同意画面から同意してください。'
    case 'merchant_agreement_version_mismatch':    return 'ブランド出店規約の現行バージョンが更新されました。 画面を再読み込みして最新の規約に同意してください。'
    case 'merchant_agreement_hash_mismatch':       return 'ブランド出店規約の内容整合性を検証できませんでした。 時間をおいて再度お試しください (継続する場合は運営までお知らせください)。'
    case 'merchant_agreement_unknown_version':     return 'ブランド出店規約のバージョン情報を DB から取得できませんでした。 時間をおいて再度お試しください。'
    case 'merchant_agreement_accept_failed':       return 'ブランド出店規約への同意記録に失敗しました。 時間をおいて再度お試しください。'
    // Phase 4-C.3 (Migration 170-171): Stripe Connect 接続
    case 'stripe_connect_owner_only':              return 'Stripe Connect の接続・再登録操作は、このブランドの owner のみが行えます。'
    case 'stripe_connect_forbidden':               return 'Stripe Connect 情報へのアクセス権がありません (ブランドメンバーとしてログインしてください)。'
    case 'stripe_connect_onboarding_failed':       return 'Stripe Connect への接続処理に失敗しました。 時間をおいて再度お試しください。'
    case 'stripe_connect_link_url_missing':        return 'Stripe から登録画面 URL を取得できませんでした。 時間をおいて再度お試しください。'
    case 'stripe_connect_urls_not_configured':     return 'Stripe Connect の戻り URL 設定が完了していません (運営に連絡してください)。'
    case 'stripe_connect_sync_failed':             return 'Stripe から最新情報を取得できませんでした。 時間をおいて再度お試しください。'
    case 'stripe_connect_sync_stripe_error':       return 'Stripe API エラーにより最新情報を取得できませんでした。 時間をおいて再度お試しください。'
    case 'stripe_connect_not_started':             return 'Stripe Connect への接続がまだ開始されていません。'
    case 'stripe_account_create_failed':           return 'Stripe Connect アカウントの作成に失敗しました。 時間をおいて再度お試しください。'
    case 'stripe_account_link_create_failed':      return 'Stripe 登録画面リンクの作成に失敗しました。 時間をおいて再度お試しください。'
    case 'stripe_key_env_mismatch':                return 'Stripe API の環境設定に問題があります (運営に連絡してください)。'
    case 'return_policy_note_too_long':     return '返品・交換の補足条件は 1000 文字以内で入力してください。'
    case 'brand_not_found':                 return 'ブランド情報が見つかりませんでした。ページを再読み込みしてお試しください。'
    // Migration 163: 特商法表記 販売事業者情報
    case 'invalid_legal_postal_code':               return '郵便番号は 7 桁 (例: 273-0002 / 2730002) で入力してください。'
    case 'invalid_legal_phone':                     return '電話番号は数字 / - / 空白 / () で入力してください。'
    case 'invalid_legal_email':                     return '正しいメールアドレス形式で入力してください。'
    // Migration 166: 販売者区分
    case 'invalid_legal_entity_type':               return '販売者区分は「法人」または「個人」を選択してください。'
    case 'legal_name_too_long':                     return '販売事業者名は 100 文字以内で入力してください。'
    case 'legal_representative_name_too_long':      return '代表責任者名は 100 文字以内で入力してください。'
    case 'legal_prefecture_too_long':               return '都道府県は 20 文字以内で入力してください。'
    case 'legal_city_too_long':                     return '市区町村は 100 文字以内で入力してください。'
    case 'legal_address_line1_too_long':            return '番地は 200 文字以内で入力してください。'
    case 'legal_address_line2_too_long':            return '建物名・部屋番号は 200 文字以内で入力してください。'
    case 'legal_phone_too_long':                    return '電話番号は 30 文字以内で入力してください。'
    case 'legal_email_too_long':                    return 'メールアドレスは 200 文字以内で入力してください。'
    // Phase 4: 販売事業者情報 保存時必須検証 (途中保存廃止、二重防御 - 保存時 + 公開 gate)
    case 'legal_entity_type_required':              return '販売者区分 (法人 / 個人) を選択してください。'
    case 'legal_name_required':                     return '販売事業者名 (法人名 / 販売者氏名) を入力してください。'
    case 'legal_representative_name_required':      return '代表者 / 通信販売責任者を入力してください (法人の場合は必須)。'
    case 'legal_postal_code_required':              return '郵便番号を入力してください。'
    case 'legal_prefecture_required':               return '都道府県を入力してください。'
    case 'legal_city_required':                     return '市区町村を入力してください。'
    case 'legal_address_line1_required':            return '番地を入力してください。'
    case 'legal_phone_required':                    return '電話番号を入力してください。'
    case 'legal_email_required':                    return 'メールアドレスを入力してください。'
    default:                       return `保存に失敗しました (${code})`
  }
}

/// Phase B (Migration 155) + Phase 4-A (Migration 167): 配送・返品ポリシー取得用の nullable row。
/// Migration 未 apply 環境では該当列 undefined → decode 後 null にフォールバック。
interface PolicyRow {
  dispatch_lead_days:  number  | null
  return_accepted:     boolean | null
  return_days:         number  | null
  exchange_accepted:   boolean | null
  return_policy_note:  string  | null
  /** Migration 167 未 apply 環境では undefined。 UI 側で null 扱い。 */
  return_shipping_cost_bearer: string | null
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

// Migration 162: SNS リンク (2 列)。 未 apply 環境でも column は 145 で追加済みなので必ず存在。
interface SocialLinksRow {
  website_url:   string | null
  instagram_url: string | null
}

// Migration 163 / 166: 特商法表記 販売事業者法定情報 (9 列) + 販売者区分 (1 列)。
// Migration 未 apply 環境では列不在エラーで返るが、UI 側で空値扱いにフォールバック。
interface LegalInfoRow {
  legal_name:                 string | null
  legal_representative_name:  string | null
  legal_postal_code:          string | null
  legal_prefecture:           string | null
  legal_city:                 string | null
  legal_address_line1:        string | null
  legal_address_line2:        string | null
  legal_phone:                string | null
  legal_email:                string | null
  legal_entity_type:          string | null   // Migration 166: 'corporation' | 'individual' | null
}

// Phase 4-C.3 (Migration 170-171): Stripe Connect account state cache probe。
// 未 apply 環境では列不在エラー → UI は 'none' 状態にフォールバック。
interface StripeConnectRow {
  stripe_connect_account_id:    string  | null
  stripe_connect_state:         string  | null
  stripe_connect_onboarded_at:  string  | null
  stripe_connect_livemode:      boolean | null
  stripe_connect_last_synced_at: string | null
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
  // Phase B: 配送・返品ポリシー保存後の success banner。 既存 saved 判定と分離。
  const savedPolicy = sp.saved === 'policy'
  // Migration 162: SNS リンク保存後の success banner。
  const savedSocial = sp.saved === 'social'
  // Migration 163: 特商法表記 販売事業者情報保存後の success banner。
  const savedLegal = sp.saved === 'legal'
  // Phase 4-B / Migration 168: Merchant Agreement 同意記録後の success banner。
  const savedMerchantAgreement = sp.saved === 'merchant_agreement'
  // Phase 4-C.3 / Migration 170-171: Stripe Connect 同期成功 banner。
  const savedStripeConnectSync = sp.saved === 'stripe_connect_sync'
  const errCode = sp.err ?? null

  const ctx = await getBrandAdminContext()
  const supabase = await createClient()
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

  // 高速化: 返品先住所 + 送料ルール + brand profile + 配送・返品ポリシー + SNS リンク + 法定事業者情報 + Stripe Connect 状態 を Promise.all で並列化
  const [res, shipProbe, profileProbe, policyProbe, socialProbe, legalProbe, stripeConnectProbe] = await Promise.all([
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
    // Phase B (Migration 155): 配送・返品ポリシー probe。
    //   Migration 155 未 apply 環境ではエラーで返るが、UI 側で「未設定」扱いにフォールバックする。
    (loose as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (col: string, val: string) => {
            maybeSingle: () => Promise<{ data: PolicyRow | null; error: { message: string } | null }>
          }
        }
      }
    })
      .from('shop_brands')
      .select('dispatch_lead_days, return_accepted, return_days, exchange_accepted, return_policy_note, return_shipping_cost_bearer')
      .eq('id', ctx.currentBrand.brandId)
      .maybeSingle(),
    // Migration 162: SNS リンク probe。 145 で追加済 column なので列不在エラーは想定しない。
    (loose as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (col: string, val: string) => {
            maybeSingle: () => Promise<{ data: SocialLinksRow | null; error: { message: string } | null }>
          }
        }
      }
    })
      .from('shop_brands')
      .select('website_url, instagram_url')
      .eq('id', ctx.currentBrand.brandId)
      .maybeSingle(),
    // Migration 163: 特商法表記 販売事業者情報 probe。
    //   Migration 163 未 apply 環境では列不在エラーで返るが、UI 側で「未設定」扱いにフォールバックする。
    (loose as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (col: string, val: string) => {
            maybeSingle: () => Promise<{ data: LegalInfoRow | null; error: { message: string } | null }>
          }
        }
      }
    })
      .from('shop_brands')
      .select('legal_name, legal_representative_name, legal_postal_code, legal_prefecture, legal_city, legal_address_line1, legal_address_line2, legal_phone, legal_email, legal_entity_type')
      .eq('id', ctx.currentBrand.brandId)
      .maybeSingle(),
    // Phase 4-C.3 (Migration 170-171): Stripe Connect probe。
    //   未 apply 環境では列不在エラーで返るが、UI 側で 'none' 状態にフォールバック。
    (loose as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (col: string, val: string) => {
            maybeSingle: () => Promise<{ data: StripeConnectRow | null; error: { message: string } | null }>
          }
        }
      }
    })
      .from('shop_brands')
      .select('stripe_connect_account_id, stripe_connect_state, stripe_connect_onboarded_at, stripe_connect_livemode, stripe_connect_last_synced_at')
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

  // Phase B (Migration 155) + Phase 4-A (Migration 167): 配送・返品ポリシー initial。
  //   Migration 155 / 167 未 apply 環境では列不在エラーで policyProbe.error あり → 全 null で「未設定」扱い。
  const migration155NotApplied =
    policyProbe.error !== null &&
    /column .*(dispatch_lead_days|return_accepted|return_days|exchange_accepted|return_policy_note|return_shipping_cost_bearer).* does not exist/i.test(policyProbe.error.message)
  const rawBearer = policyProbe.data?.return_shipping_cost_bearer ?? null
  const returnShippingCostBearer: 'buyer' | 'seller' | null =
    rawBearer === 'buyer' || rawBearer === 'seller' ? rawBearer : null
  const policyInitial: DeliveryReturnPolicyInitial = {
    dispatchLeadDays: policyProbe.data?.dispatch_lead_days ?? null,
    returnAccepted:   policyProbe.data?.return_accepted    ?? null,
    returnDays:       policyProbe.data?.return_days        ?? null,
    exchangeAccepted: policyProbe.data?.exchange_accepted  ?? null,
    returnPolicyNote: policyProbe.data?.return_policy_note ?? null,
    returnShippingCostBearer,
  }
  const policyReadError =
    (!migration155NotApplied && policyProbe.error) ? policyProbe.error.message : null

  // Migration 162: SNS リンク initial。 column は 145 で存在するので基本 error は起きない想定だが、
  // 万一 read 失敗した場合は空値 + warning banner にフォールバックする (profile と同じパターン)。
  const socialInitial: BrandSocialLinksInitial = {
    websiteUrl:   socialProbe.data?.website_url   ?? null,
    instagramUrl: socialProbe.data?.instagram_url ?? null,
  }
  const socialReadError = socialProbe.error?.message ?? null

  // Migration 163: 特商法表記 販売事業者法定情報 initial。
  //   Migration 163 未 apply 環境 (production DB へ未反映) では列不在エラーで返るので、
  //   全 field null (未入力) にフォールバック + 説明バナー表示。
  const migration163NotApplied =
    legalProbe.error !== null &&
    /column .*(legal_name|legal_representative_name|legal_postal_code|legal_prefecture|legal_city|legal_address_line1|legal_address_line2|legal_phone|legal_email).* does not exist/i.test(legalProbe.error.message)
  // Migration 166: legal_entity_type 未 apply 環境の判定 (163 が済んでも 166 未済み時のケース)
  const migration166NotApplied =
    !migration163NotApplied
    && legalProbe.error !== null
    && /column .*legal_entity_type.* does not exist/i.test(legalProbe.error.message)
  const rawEntityType = legalProbe.data?.legal_entity_type ?? null
  const legalEntityType: 'corporation' | 'individual' | null =
    rawEntityType === 'corporation' || rawEntityType === 'individual' ? rawEntityType : null
  const legalInitial: BrandLegalInfoInitial = {
    legalEntityType,
    legalName:               legalProbe.data?.legal_name                ?? null,
    legalRepresentativeName: legalProbe.data?.legal_representative_name ?? null,
    legalPostalCode:         legalProbe.data?.legal_postal_code         ?? null,
    legalPrefecture:         legalProbe.data?.legal_prefecture          ?? null,
    legalCity:               legalProbe.data?.legal_city                ?? null,
    legalAddressLine1:       legalProbe.data?.legal_address_line1       ?? null,
    legalAddressLine2:       legalProbe.data?.legal_address_line2       ?? null,
    legalPhone:              legalProbe.data?.legal_phone               ?? null,
    legalEmail:              legalProbe.data?.legal_email               ?? null,
  }
  const legalReadError =
    (!migration163NotApplied && legalProbe.error) ? legalProbe.error.message : null

  // Phase 4-C.3 (Migration 170-171): Stripe Connect 状態 hydrate。
  //   Migration 170 未 apply 環境では stripe_connect_* 列不在で error → 'none' 扱い。
  //   state 値が whitelist 外の場合も 'none' に落とす (defensive)。
  const rawConnectState = stripeConnectProbe.data?.stripe_connect_state ?? null
  const narrowedConnectState: 'none' | 'pending' | 'active' | 'restricted' | 'disabled' =
    rawConnectState === 'pending'    ? 'pending'
    : rawConnectState === 'active'   ? 'active'
    : rawConnectState === 'restricted' ? 'restricted'
    : rawConnectState === 'disabled' ? 'disabled'
    : 'none'
  const stripeConnectStatus: StripeConnectStatus = {
    state:         narrowedConnectState,
    accountId:     stripeConnectProbe.data?.stripe_connect_account_id ?? null,
    livemode:      stripeConnectProbe.data?.stripe_connect_livemode ?? null,
    onboardedAt:   stripeConnectProbe.data?.stripe_connect_onboarded_at ?? null,
    lastSyncedAt:  stripeConnectProbe.data?.stripe_connect_last_synced_at ?? null,
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
      {savedProfile && (
        <div className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          ブランドプロフィールを保存しました。
        </div>
      )}
      {savedPolicy && (
        <div className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          配送・返品ポリシーを保存しました。
        </div>
      )}
      {savedSocial && (
        <div className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          公式サイト / Instagram の URL を保存しました。
        </div>
      )}
      {savedLegal && (
        <div className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          特商法表記 販売事業者情報を保存しました。
        </div>
      )}
      {savedMerchantAgreement && (
        <div className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          ブランド出店規約への同意を記録しました。
        </div>
      )}
      {savedStripeConnectSync && (
        <div className="text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
          Stripe Connect の最新情報を取得しました。
        </div>
      )}
      {errCode && !savedOk && !savedShipping && !savedProfile && !savedPolicy && !savedSocial && !savedLegal && !savedMerchantAgreement && !savedStripeConnectSync && (
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

      {/* Migration 162: 公式サイト URL / Instagram URL。 BrandProfileForm とは
          意図的に別セクション。 shop_brand_update_profile RPC には触らず独立 RPC
          shop_brand_update_social_links を叩く = blast radius を最小化。 */}
      <section className="border border-neutral-200 rounded-xl bg-white p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold">公式サイト / Instagram リンク</h2>
          <div className="mt-1 text-[11px] text-neutral-500">
            iOS HYPE のブランドページに「公式サイト」「Instagram」ボタンとして表示されます。
            空欄で保存すると「未設定」に戻せます。
          </div>
          {socialReadError && (
            <div className="mt-2 text-[11px] text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1">
              SNS リンクの読込に失敗しました。 新規入力として扱います。 詳細: {socialReadError}
            </div>
          )}
        </div>
        <BrandSocialLinksForm
          initial={socialInitial}
          action={updateBrandSocialLinksAction}
          disabled={!canEdit}
          disabledReason={disabledReason}
        />
      </section>

      {/* Migration 163: 販売事業者情報 (特定商取引法に基づく表記)。
          shop_brand_update_profile / _social_links / _return_address 系とは責務が完全に別で、
          独立 RPC shop_brand_update_legal_info を叩く = blast radius 最小。
          Phase 1: DB + 入力 UI のみ。 published gate 強化 / iOS 表示は次 phase。 */}
      <section className="border border-neutral-200 rounded-xl bg-white p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold">販売事業者情報 (特定商取引法に基づく表記)</h2>
          <div className="mt-1 text-[11px] text-neutral-500">
            HYPE で商品を販売するにあたり、法定表示に必要な販売事業者情報を登録します。
            返品先住所 (下段) とは責務が別で、こちらは「消費者に公開される販売業者としての情報」です。
            すべて任意入力ですが、実運用開始前にすべての項目を入力してください。
          </div>
          {migration163NotApplied && (
            <div className="mt-2 text-[12px] text-orange-800 bg-orange-50 border border-orange-200 rounded px-3 py-2">
              販売事業者情報の準備が完了していません (DB 側の準備待ち)。設定完了までしばらくお待ちください。
            </div>
          )}
          {/* Migration 166: entity_type 列だけが未 apply の稀ケース (163 済 / 166 未済) */}
          {migration166NotApplied && (
            <div className="mt-2 text-[12px] text-orange-800 bg-orange-50 border border-orange-200 rounded px-3 py-2">
              販売者区分 (法人 / 個人) の準備が完了していません (DB 側の準備待ち)。 選択項目のみ一時的に無効化されます。
            </div>
          )}
          {legalReadError && !migration163NotApplied && (
            <div className="mt-2 text-[11px] text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1">
              販売事業者情報の読込に失敗しました。 新規入力として扱います。 詳細: {legalReadError}
            </div>
          )}
        </div>
        {!migration163NotApplied && (
          <BrandLegalInfoForm
            initial={legalInitial}
            action={updateBrandLegalInfoAction}
            disabled={!canEdit}
            disabledReason={disabledReason}
          />
        )}
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

      {/* Phase B (Migration 155): 配送・返品ポリシー。 送料計算 (shipping rules) とは
          意図的に別セクションに分ける — 送料は金額計算ロジック、こちらは購入者向け
          期日・可否表示のポリシーで意味が別。 */}
      <section className="border border-neutral-200 rounded-xl bg-white p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold">配送・返品ポリシー</h2>
          <div className="mt-1 text-[11px] text-neutral-500">
            発送目安・返品受付・交換受付・補足条件を設定します。 iOS 商品詳細と Checkout で
            購入者に表示されます。 未設定のままにすることも可能です (「未設定」表示になります)。
          </div>
          {migration155NotApplied && (
            <div className="mt-2 text-[12px] text-orange-800 bg-orange-50 border border-orange-200 rounded px-3 py-2">
              配送・返品ポリシー機能の準備が完了していません (DB 側の準備待ち)。設定完了までしばらくお待ちください。
            </div>
          )}
          {policyReadError && !migration155NotApplied && (
            <div className="mt-2 text-[11px] text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1">
              ポリシーの読込に失敗しました。新規入力として扱います。詳細: {policyReadError}
            </div>
          )}
        </div>
        {!migration155NotApplied && (
          <DeliveryReturnPolicySection
            initial={policyInitial}
            action={updateDeliveryReturnPolicyAction}
            canEdit={canEdit}
            disabledReason={disabledReason}
          />
        )}
      </section>

      {/* Phase 4-C.3 (Migration 170-171): Stripe Connect 接続 (販売代金の受取設定)。
          owner のみ接続操作可、admin/staff は状態閲覧 + sync のみ。
          このセクションが「接続済み」でも本 Phase では実 settlement は platform_manual を維持 (料金・精算条件と Merchant Agreement v1 正式版が確定するまで)。 */}
      <section className="border border-neutral-200 rounded-xl bg-white p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold">Stripe Connect (販売代金の受取設定)</h2>
          <div className="mt-1 text-[11px] text-neutral-500">
            HYPE で商品を販売した代金を受取るための Stripe Connect 接続設定です。
            Stripe が運営する登録画面 (ホスティング登録) で事業者情報 (法人 / 個人)、代表者、住所、銀行口座等を入力します。
            接続完了後も、Cosmohype 全体で料金・精算条件が確定するまでは、実際の代金受取は従来方式のまま継続します。
          </div>
        </div>
        <StripeConnectSection
          status={stripeConnectStatus}
          role={ctx.currentBrand.role}
          onboardingAction={startStripeConnectOnboardingAction}
          syncAction={syncStripeConnectStatusAction}
        />
      </section>
    </div>
  )
}
