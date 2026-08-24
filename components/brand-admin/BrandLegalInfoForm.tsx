'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { pressableClass, Spinner } from '@/lib/brandAdminUi'

/**
 * ブランドの「特定商取引法に基づく表記」用 販売事業者法定情報フォーム (Migration 163)。
 *
 * 9 field を一括で更新する。 保存は shop_brand_update_legal_info RPC
 * (owner/admin gate + server 側 validation + 空文字 → NULL 正規化)。
 *
 * このフォームは他の Brand Admin セクション (returnAddress / shippingRules /
 * profile / policy / social) とは責務が完全に別。 独立セクション化して blast radius を
 * 抑える (BrandSocialLinksForm と同じ設計方針)。
 */

export interface BrandLegalInfoInitial {
  legalName:                 string | null
  legalRepresentativeName:   string | null
  legalPostalCode:           string | null
  legalPrefecture:           string | null
  legalCity:                 string | null
  legalAddressLine1:         string | null
  legalAddressLine2:         string | null
  legalPhone:                string | null
  legalEmail:                string | null
}

interface Props {
  initial: BrandLegalInfoInitial
  action: (formData: FormData) => Promise<void>
  disabled?: boolean
  disabledReason?: string
}

function SaveButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={!enabled || pending}
      className={
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold ' +
        'bg-neutral-900 text-white hover:bg-neutral-800 ' +
        'disabled:bg-neutral-400 disabled:text-neutral-100 disabled:cursor-not-allowed ' +
        pressableClass
      }
    >
      {pending && <Spinner />}
      {pending ? '保存中…' : '保存する'}
    </button>
  )
}

// server 側と同じ形式チェック (UX 用の pre-validate、送信可否のみ判定)
const POSTAL_RE = /^\d{3}-?\d{4}$/           // 273-0002 も 2730002 も OK (RPC で正規化)
const PHONE_RE  = /^[0-9\-\s()+]+$/
const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function trimOrEmpty(v: string): string { return v.trim() }

export default function BrandLegalInfoForm({ initial, action, disabled, disabledReason }: Props) {
  const [name,    setName]    = useState(initial.legalName ?? '')
  const [rep,     setRep]     = useState(initial.legalRepresentativeName ?? '')
  const [postal,  setPostal]  = useState(initial.legalPostalCode ?? '')
  const [pref,    setPref]    = useState(initial.legalPrefecture ?? '')
  const [city,    setCity]    = useState(initial.legalCity ?? '')
  const [a1,      setA1]      = useState(initial.legalAddressLine1 ?? '')
  const [a2,      setA2]      = useState(initial.legalAddressLine2 ?? '')
  const [phone,   setPhone]   = useState(initial.legalPhone ?? '')
  const [email,   setEmail]   = useState(initial.legalEmail ?? '')

  // 各 field OK 判定 (空欄は OK = 未入力に戻せる、入力ありなら形式チェック)
  const nameOk    = trimOrEmpty(name).length    <= 100
  const repOk     = trimOrEmpty(rep).length     <= 100
  const postalRaw = trimOrEmpty(postal)
  const postalOk  = postalRaw.length === 0 || POSTAL_RE.test(postalRaw)
  const prefOk    = trimOrEmpty(pref).length    <= 20
  const cityOk    = trimOrEmpty(city).length    <= 100
  const a1Ok      = trimOrEmpty(a1).length      <= 200
  const a2Ok      = trimOrEmpty(a2).length      <= 200
  const phoneRaw  = trimOrEmpty(phone)
  const phoneOk   = phoneRaw.length === 0 || (phoneRaw.length <= 30 && PHONE_RE.test(phoneRaw))
  const emailRaw  = trimOrEmpty(email)
  const emailOk   = emailRaw.length === 0 || (emailRaw.length <= 200 && EMAIL_RE.test(emailRaw))

  const canSubmit = !disabled
                 && nameOk && repOk && postalOk && prefOk && cityOk
                 && a1Ok && a2Ok && phoneOk && emailOk

  function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
      <div>
        <label className="block text-[12px] font-semibold text-neutral-700 mb-1">
          {label}
        </label>
        {children}
        {hint && <div className="mt-1 text-[11px] text-neutral-500">{hint}</div>}
      </div>
    )
  }

  const inputClass =
    'w-full h-10 border border-neutral-300 rounded px-3 text-sm bg-white disabled:bg-neutral-100'

  return (
    <form action={action} className="space-y-4">
      <Row label="法人名 / 個人事業者氏名 (任意)" hint="実際に販売する法人名 または 個人事業者の氏名。 屋号ではなく法定表記に使う正式名称。">
        <input name="legal_name" type="text" value={name} onChange={(e) => setName(e.target.value)}
               maxLength={100} placeholder="株式会社サンプル / 山田 太郎"
               disabled={disabled} className={inputClass} />
        {!nameOk && <div className="mt-1 text-[11px] text-red-600">100 文字以内で入力してください。</div>}
      </Row>

      <Row label="代表責任者名 (任意)" hint="代表取締役名 / 事業運営責任者名。">
        <input name="legal_representative_name" type="text" value={rep} onChange={(e) => setRep(e.target.value)}
               maxLength={100} placeholder="山田 太郎"
               disabled={disabled} className={inputClass} />
        {!repOk && <div className="mt-1 text-[11px] text-red-600">100 文字以内で入力してください。</div>}
      </Row>

      <Row label="所在地: 郵便番号 (任意)" hint="7 桁数字。 ハイフンあり ('273-0002') / なし ('2730002') どちらでも可、保存時に数字のみに正規化されます。">
        <input name="legal_postal_code" type="text" inputMode="numeric" value={postal} onChange={(e) => setPostal(e.target.value)}
               maxLength={20} placeholder="273-0002"
               disabled={disabled} className={inputClass + ' font-mono max-w-[180px]'} />
        {!postalOk && <div className="mt-1 text-[11px] text-red-600">郵便番号は 7 桁 (例: 273-0002 / 2730002) で入力してください。</div>}
      </Row>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Row label="都道府県 (任意)">
          <input name="legal_prefecture" type="text" value={pref} onChange={(e) => setPref(e.target.value)}
                 maxLength={20} placeholder="千葉県"
                 disabled={disabled} className={inputClass} />
          {!prefOk && <div className="mt-1 text-[11px] text-red-600">20 文字以内で入力してください。</div>}
        </Row>
        <Row label="市区町村 (任意)">
          <input name="legal_city" type="text" value={city} onChange={(e) => setCity(e.target.value)}
                 maxLength={100} placeholder="船橋市"
                 disabled={disabled} className={inputClass} />
          {!cityOk && <div className="mt-1 text-[11px] text-red-600">100 文字以内で入力してください。</div>}
        </Row>
      </div>

      <Row label="番地 (任意)">
        <input name="legal_address_line1" type="text" value={a1} onChange={(e) => setA1(e.target.value)}
               maxLength={200} placeholder="海神 1-1-1"
               disabled={disabled} className={inputClass} />
        {!a1Ok && <div className="mt-1 text-[11px] text-red-600">200 文字以内で入力してください。</div>}
      </Row>

      <Row label="建物名・部屋番号 (任意)">
        <input name="legal_address_line2" type="text" value={a2} onChange={(e) => setA2(e.target.value)}
               maxLength={200} placeholder="サンプルビル 101"
               disabled={disabled} className={inputClass} />
        {!a2Ok && <div className="mt-1 text-[11px] text-red-600">200 文字以内で入力してください。</div>}
      </Row>

      <Row label="連絡先電話番号 (任意)" hint="数字 / ハイフン / 空白 / () のみ許容。 消費者からの問合せに応答できる番号。">
        <input name="legal_phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
               maxLength={30} placeholder="03-1234-5678"
               disabled={disabled} className={inputClass + ' font-mono max-w-[260px]'} />
        {!phoneOk && <div className="mt-1 text-[11px] text-red-600">数字 / - / 空白 / () で 30 文字以内で入力してください。</div>}
      </Row>

      <Row label="連絡先メール (任意)" hint="消費者から問合せを受け取れるメールアドレス。">
        <input name="legal_email" type="email" inputMode="email" autoComplete="off"
               value={email} onChange={(e) => setEmail(e.target.value)}
               maxLength={200} placeholder="contact@example.com"
               disabled={disabled} className={inputClass + ' max-w-[380px]'} />
        {!emailOk && <div className="mt-1 text-[11px] text-red-600">正しいメールアドレス形式で入力してください。</div>}
      </Row>

      {disabled && disabledReason && (
        <div className="text-[11px] text-neutral-500">{disabledReason}</div>
      )}

      <div>
        <SaveButton enabled={canSubmit} />
      </div>
    </form>
  )
}
