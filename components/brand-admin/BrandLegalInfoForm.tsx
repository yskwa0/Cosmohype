'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { pressableClass, Spinner } from '@/lib/brandAdminUi'

/**
 * ブランドの「特定商取引法に基づく表記」用 販売事業者法定情報フォーム (Migration 163 / 166)。
 *
 * 【保存ルール — Phase 4 更新】
 *   販売者区分 + 区分別必須項目がすべて揃っていないと保存不可 (「途中保存」は廃止)。
 *   従来の「途中保存 → 公開 gate でだけ強制」から「保存時に強制 + 公開 gate で再チェック」の
 *   二重防御に変更。
 *
 *   必須:
 *     ・legal_entity_type
 *     ・legal_name / legal_postal_code / legal_prefecture / legal_city / legal_address_line1
 *       / legal_phone / legal_email  (両区分共通、7 項目)
 *     ・legal_representative_name    (法人時のみ)
 *   任意:
 *     ・legal_address_line2 (建物名等)
 *
 *   client の canSubmit + Server Action updateBrandLegalInfoAction 側でも同じ必須検証を実施
 *   (client 側 disable の bypass に耐える二重防波堤)。
 *
 * このフォームは他の Brand Admin セクション (returnAddress / shippingRules /
 * profile / policy / social) とは責務が完全に別。 独立セクション化して blast radius を
 * 抑える (BrandSocialLinksForm と同じ設計方針)。
 */

export type LegalEntityType = 'corporation' | 'individual'

export interface BrandLegalInfoInitial {
  legalEntityType:           LegalEntityType | null
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

/** 必須マーク (赤字) — 各 field label の脇に付ける。 */
function RequiredMark() {
  return <span className="ml-1 text-red-600 text-[11px] font-bold">必須</span>
}

/** ラベル + 任意 hint + 必須マーク付き 1 行レイアウト。
 *  【重要】この Row は必ず BrandLegalInfoForm の "外側" に定義すること。
 *  内側 (component 本体スコープ) で定義すると、state 更新のたびに Row が
 *  新しい関数参照になり React が全 Row を unmount / remount = 各 input が
 *  キーストロークごとにフォーカスを失って実質入力不能になる (Bug 2026-08-25)。 */
function Row({ label, required, hint, children }: { label: React.ReactNode; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-neutral-700 mb-1">
        {label}{required && <RequiredMark />}
      </label>
      {children}
      {hint && <div className="mt-1 text-[11px] text-neutral-500">{hint}</div>}
    </div>
  )
}

const INPUT_CLASS =
  'w-full h-10 border border-neutral-300 rounded px-3 text-sm bg-white disabled:bg-neutral-100'

export default function BrandLegalInfoForm({ initial, action, disabled, disabledReason }: Props) {
  const [entityType, setEntityType] = useState<LegalEntityType | ''>(initial.legalEntityType ?? '')

  const [name,    setName]    = useState(initial.legalName ?? '')
  const [rep,     setRep]     = useState(initial.legalRepresentativeName ?? '')
  const [postal,  setPostal]  = useState(initial.legalPostalCode ?? '')
  const [pref,    setPref]    = useState(initial.legalPrefecture ?? '')
  const [city,    setCity]    = useState(initial.legalCity ?? '')
  const [a1,      setA1]      = useState(initial.legalAddressLine1 ?? '')
  const [a2,      setA2]      = useState(initial.legalAddressLine2 ?? '')
  const [phone,   setPhone]   = useState(initial.legalPhone ?? '')
  const [email,   setEmail]   = useState(initial.legalEmail ?? '')

  // 販売者区分に応じたラベル切替
  const isIndividual  = entityType === 'individual'
  const isCorporation = entityType === 'corporation'
  const entitySelected = isIndividual || isCorporation
  const nameLabel = isCorporation ? '法人名' : (isIndividual ? '販売者氏名' : '販売事業者名')
  const nameHint  = isCorporation
    ? '法人の正式名称 (登記上の名称)。 屋号やサービス名ではありません。'
    : (isIndividual
        ? '販売者本人の氏名。 屋号やペンネームではなく本人確認できる氏名を入力してください。'
        : '販売者区分を選ぶと入力ラベルが切り替わります。')

  // trim 済み値
  const nameV   = trimOrEmpty(name)
  const repV    = trimOrEmpty(rep)
  const postalV = trimOrEmpty(postal)
  const prefV   = trimOrEmpty(pref)
  const cityV   = trimOrEmpty(city)
  const a1V     = trimOrEmpty(a1)
  const a2V     = trimOrEmpty(a2)
  const phoneV  = trimOrEmpty(phone)
  const emailV  = trimOrEmpty(email)

  // 各 field の形式チェック (長さ / regex)。 必須判定と分離。
  const nameFmtOk   = nameV.length <= 100
  const repFmtOk    = repV.length <= 100
  const postalFmtOk = postalV.length === 0 || POSTAL_RE.test(postalV)
  const prefFmtOk   = prefV.length <= 20
  const cityFmtOk   = cityV.length <= 100
  const a1FmtOk     = a1V.length <= 200
  const a2FmtOk     = a2V.length <= 200
  const phoneFmtOk  = phoneV.length === 0 || (phoneV.length <= 30 && PHONE_RE.test(phoneV))
  const emailFmtOk  = emailV.length === 0 || (emailV.length <= 200 && EMAIL_RE.test(emailV))

  // 必須判定 (両区分共通 + 法人時のみ rep 追加)
  const nameFilled   = nameV.length > 0
  const repFilled    = repV.length > 0
  const postalFilled = postalV.length > 0
  const prefFilled   = prefV.length > 0
  const cityFilled   = cityV.length > 0
  const a1Filled     = a1V.length > 0
  const phoneFilled  = phoneV.length > 0
  const emailFilled  = emailV.length > 0

  const commonRequiredOk = nameFilled && postalFilled && prefFilled && cityFilled
                        && a1Filled && phoneFilled && emailFilled
  const repRequiredOk = isCorporation ? repFilled : true

  const allFormatsOk = nameFmtOk && repFmtOk && postalFmtOk && prefFmtOk && cityFmtOk
                    && a1FmtOk && a2FmtOk && phoneFmtOk && emailFmtOk

  const canSubmit = !disabled && entitySelected && commonRequiredOk && repRequiredOk && allFormatsOk

  // 保存 disabled 時の理由テキスト (「なぜ押せないか」を明示)
  const missingItems: string[] = []
  if (!entitySelected)  missingItems.push('販売者区分')
  if (!nameFilled)      missingItems.push(nameLabel)
  if (isCorporation && !repFilled) missingItems.push('代表者 / 通信販売責任者')
  if (!postalFilled)    missingItems.push('郵便番号')
  if (!prefFilled)      missingItems.push('都道府県')
  if (!cityFilled)      missingItems.push('市区町村')
  if (!a1Filled)        missingItems.push('番地')
  if (!phoneFilled)     missingItems.push('電話番号')
  if (!emailFilled)     missingItems.push('メールアドレス')

  return (
    <form action={action} className="space-y-4">
      {/* Migration 166 / Phase 4: 販売者区分は保存時必須。 未選択 → canSubmit=false で保存ボタン disable。 */}
      <Row label="販売者区分" required hint="商品を販売するには「法人」または「個人」の選択が必要です。">
        <div className="flex items-center gap-4 text-[13px]">
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name="legal_entity_type" value="corporation"
                   checked={isCorporation}
                   onChange={() => setEntityType('corporation')}
                   disabled={disabled} />
            <span>法人</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name="legal_entity_type" value="individual"
                   checked={isIndividual}
                   onChange={() => setEntityType('individual')}
                   disabled={disabled} />
            <span>個人</span>
          </label>
        </div>
      </Row>

      <Row label={nameLabel} required hint={nameHint}>
        <input name="legal_name" type="text" value={name} onChange={(e) => setName(e.target.value)}
               maxLength={100} placeholder={isCorporation ? '株式会社サンプル' : (isIndividual ? '山田 太郎' : '株式会社サンプル / 山田 太郎')}
               disabled={disabled} className={INPUT_CLASS} />
        {!nameFmtOk && <div className="mt-1 text-[11px] text-red-600">100 文字以内で入力してください。</div>}
      </Row>

      {/* 代表責任者: 法人のみ表示 + 必須。 個人選択時は非表示 (概念自体を要求しない方針)。
          未選択時は下位互換で表示 (途中で法人 / 個人を切替できる余地を残すため)。 */}
      {!isIndividual && (
        <Row label="代表者 / 通信販売責任者" required={isCorporation} hint="法人の場合は代表取締役名または通信販売業務責任者名を入力してください。">
          <input name="legal_representative_name" type="text" value={rep} onChange={(e) => setRep(e.target.value)}
                 maxLength={100} placeholder="山田 太郎"
                 disabled={disabled} className={INPUT_CLASS} />
          {!repFmtOk && <div className="mt-1 text-[11px] text-red-600">100 文字以内で入力してください。</div>}
        </Row>
      )}
      {/* 個人選択時、既存 rep が残っている場合は明示的に「保存時に消去」する hidden input を送出。
          これで RPC 側の nullif btrim で NULL 化される (代表者概念を持たせない設計)。 */}
      {isIndividual && (
        <input type="hidden" name="legal_representative_name" value="" />
      )}

      <Row label="郵便番号" required hint="7 桁数字。 ハイフンあり ('273-0002') / なし ('2730002') どちらでも可、保存時に数字のみに正規化されます。">
        <input name="legal_postal_code" type="text" inputMode="numeric" value={postal} onChange={(e) => setPostal(e.target.value)}
               maxLength={20} placeholder="273-0002"
               disabled={disabled} className={INPUT_CLASS + ' font-mono max-w-[180px]'} />
        {!postalFmtOk && <div className="mt-1 text-[11px] text-red-600">郵便番号は 7 桁 (例: 273-0002 / 2730002) で入力してください。</div>}
      </Row>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Row label="都道府県" required>
          <input name="legal_prefecture" type="text" value={pref} onChange={(e) => setPref(e.target.value)}
                 maxLength={20} placeholder="千葉県"
                 disabled={disabled} className={INPUT_CLASS} />
          {!prefFmtOk && <div className="mt-1 text-[11px] text-red-600">20 文字以内で入力してください。</div>}
        </Row>
        <Row label="市区町村" required>
          <input name="legal_city" type="text" value={city} onChange={(e) => setCity(e.target.value)}
                 maxLength={100} placeholder="船橋市"
                 disabled={disabled} className={INPUT_CLASS} />
          {!cityFmtOk && <div className="mt-1 text-[11px] text-red-600">100 文字以内で入力してください。</div>}
        </Row>
      </div>

      <Row label="番地" required>
        <input name="legal_address_line1" type="text" value={a1} onChange={(e) => setA1(e.target.value)}
               maxLength={200} placeholder="海神 1-1-1"
               disabled={disabled} className={INPUT_CLASS} />
        {!a1FmtOk && <div className="mt-1 text-[11px] text-red-600">200 文字以内で入力してください。</div>}
      </Row>

      <Row label="建物名等（任意）">
        <input name="legal_address_line2" type="text" value={a2} onChange={(e) => setA2(e.target.value)}
               maxLength={200} placeholder="サンプルビル 101"
               disabled={disabled} className={INPUT_CLASS} />
        {!a2FmtOk && <div className="mt-1 text-[11px] text-red-600">200 文字以内で入力してください。</div>}
      </Row>

      <Row label="電話番号" required hint="数字 / ハイフン / 空白 / () のみ許容。 消費者からの問合せに応答できる番号。">
        <input name="legal_phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
               maxLength={30} placeholder="03-1234-5678"
               disabled={disabled} className={INPUT_CLASS + ' font-mono max-w-[260px]'} />
        {!phoneFmtOk && <div className="mt-1 text-[11px] text-red-600">数字 / - / 空白 / () で 30 文字以内で入力してください。</div>}
      </Row>

      <Row label="メールアドレス" required hint="消費者から問合せを受け取れるメールアドレス。">
        <input name="legal_email" type="email" inputMode="email" autoComplete="off"
               value={email} onChange={(e) => setEmail(e.target.value)}
               maxLength={200} placeholder="contact@example.com"
               disabled={disabled} className={INPUT_CLASS + ' max-w-[380px]'} />
        {!emailFmtOk && <div className="mt-1 text-[11px] text-red-600">正しいメールアドレス形式で入力してください。</div>}
      </Row>

      {disabled && disabledReason && (
        <div className="text-[11px] text-neutral-500">{disabledReason}</div>
      )}

      {/* 保存 disabled 理由の明示 (どの必須項目が不足しているか) */}
      {!disabled && !canSubmit && missingItems.length > 0 && (
        <div className="text-[12px] text-orange-800 bg-orange-50 border border-orange-200 rounded px-3 py-2">
          未入力または不正な形式の項目があるため保存できません。<br />
          <span className="font-semibold">不足項目:</span> {missingItems.join(' / ')}
        </div>
      )}

      <div>
        <SaveButton enabled={canSubmit} />
      </div>
    </form>
  )
}
