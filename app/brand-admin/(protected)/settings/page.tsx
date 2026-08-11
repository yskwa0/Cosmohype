import { getBrandAdminContext, isBrandAdminDevBypassEnabled } from '@/lib/brandAdmin'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import ReturnAddressForm, {
  type ReturnAddressInitial,
} from '@/components/brand-admin/ReturnAddressForm'
import { updateReturnAddressAction } from './actions'

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
    case 'forbidden':              return '返品先住所の編集権限がありません (owner / admin のみ)。'
    case 'not_authenticated':      return '認証情報が失われました。再ログインしてください。'
    case 'service_role_missing':   return 'Dev Bypass に service_role key が設定されていません。'
    case 'update_failed':          return '保存に失敗しました。時間をおいて再度お試しください。'
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
      {errCode && !savedOk && (
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
    </div>
  )
}
