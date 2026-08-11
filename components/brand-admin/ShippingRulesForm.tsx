'use client'

import { useMemo, useState } from 'react'
import { useFormStatus } from 'react-dom'

/**
 * Brand Admin 送料ルール入力フォーム。
 *
 * 保存先: shop_brand_shipping_rules (Migration 116 + 136)
 *   - flat_rate                : 全国一律送料 (必須、0 以上)。地域別 rate が NULL の時に使用。
 *   - free_shipping_threshold  : 送料無料閾値 (任意)。¥XXXX 以上で送料 0。
 *   - rate_{region}            : 地域別送料 (任意、9 地域)。NULL の地域は flat_rate。
 *
 * UI 上の「完全送料無料」toggle は
 *   flat_rate=0 / 地域別=全 NULL / threshold=NULL を送出する短絡。
 *
 * 空欄 = NULL (=flat_rate フォールバック) として扱う。
 * "0" と入力すると「その地域は送料無料」の意味になる。
 */

export interface ShippingRulesInitial {
  flatRate: number | null
  freeShippingThreshold: number | null
  rateHokkaido: number | null
  rateTohoku:   number | null
  rateKanto:    number | null
  rateChubu:    number | null
  rateKinki:    number | null
  rateChugoku:  number | null
  rateShikoku:  number | null
  rateKyushu:   number | null
  rateOkinawa:  number | null
}

interface Props {
  initial: ShippingRulesInitial
  action: (formData: FormData) => Promise<void>
  disabled?: boolean
  disabledReason?: string
}

function num(v: number | null): string {
  return v === null || v === undefined ? '' : String(v)
}

/** 「完全送料無料」の初期判定: flat_rate=0 かつ地域列すべて NULL かつ閾値 NULL */
function isCompletelyFree(i: ShippingRulesInitial): boolean {
  return i.flatRate === 0
    && i.freeShippingThreshold === null
    && i.rateHokkaido === null && i.rateTohoku === null && i.rateKanto === null
    && i.rateChubu === null && i.rateKinki === null && i.rateChugoku === null
    && i.rateShikoku === null && i.rateKyushu === null && i.rateOkinawa === null
}

function SaveButton({ enabled, label }: { enabled: boolean; label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={!enabled || pending}
      className={
        'px-4 py-2 rounded-md text-sm font-semibold ' +
        (enabled && !pending
          ? 'bg-neutral-900 text-white hover:bg-neutral-800'
          : 'bg-neutral-300 text-neutral-500 cursor-not-allowed')
      }
    >
      {pending ? '保存中…' : label}
    </button>
  )
}

interface RegionRowProps {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
  disabled: boolean
}

function RegionRow({ label, name, value, onChange, disabled }: RegionRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <label htmlFor={name} className="text-[13px] text-neutral-700 min-w-[6rem]">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-neutral-500">¥</span>
        <input
          id={name}
          name={name}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={value}
          disabled={disabled}
          placeholder="空欄=一律送料"
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
          className="w-32 rounded-md border border-neutral-300 px-2 py-1 text-right text-sm disabled:bg-neutral-100"
        />
      </div>
    </div>
  )
}

// 都道府県サンプル → 地域 (プレビュー用)。SQL の shop_prefecture_region と同じ結果になる。
type Region =
  | 'hokkaido' | 'tohoku' | 'kanto' | 'chubu' | 'kinki'
  | 'chugoku'  | 'shikoku' | 'kyushu' | 'okinawa'

function parseNum(s: string): number | null {
  if (!/^\d+$/.test(s)) return null
  return Number(s)
}

/**
 * SQL 側 shop_calc_group_shipping と 100% 同じ順位で計算するクライアント mock。
 * サブトータル / 都道府県サンプルから preview 表示に使う。
 */
function previewShipping(args: {
  completelyFree: boolean
  flatRate: number | null
  threshold: number | null
  subtotal: number
  region: Region
  regional: Record<Region, number | null>
}): number | '—' {
  if (args.completelyFree) return 0
  if (args.flatRate === null) return '—'
  if (args.threshold !== null && args.subtotal >= args.threshold) return 0
  const r = args.regional[args.region]
  return r ?? args.flatRate
}

const FMT_YEN = new Intl.NumberFormat('ja-JP')
function yen(n: number | '—'): string {
  return n === '—' ? '—' : `¥${FMT_YEN.format(n)}`
}

export default function ShippingRulesForm({
  initial,
  action,
  disabled = false,
  disabledReason,
}: Props) {
  const [completelyFree, setCompletelyFree] = useState(isCompletelyFree(initial))
  const [flatRate, setFlatRate] = useState(num(initial.flatRate))
  const [freeThreshold, setFreeThreshold] = useState(num(initial.freeShippingThreshold))
  const [hokkaido, setHokkaido] = useState(num(initial.rateHokkaido))
  const [tohoku, setTohoku]     = useState(num(initial.rateTohoku))
  const [kanto, setKanto]       = useState(num(initial.rateKanto))
  const [chubu, setChubu]       = useState(num(initial.rateChubu))
  const [kinki, setKinki]       = useState(num(initial.rateKinki))
  const [chugoku, setChugoku]   = useState(num(initial.rateChugoku))
  const [shikoku, setShikoku]   = useState(num(initial.rateShikoku))
  const [kyushu, setKyushu]     = useState(num(initial.rateKyushu))
  const [okinawa, setOkinawa]   = useState(num(initial.rateOkinawa))

  // Validation:
  //   - 完全送料無料 ON: OK (保存側で flat_rate=0 に固定)
  //   - 完全送料無料 OFF: flat_rate は必須 (0 以上)。地域列 / threshold は任意。
  //   - threshold は 0 より大きい場合のみ有効 (0 は「常に無料」に等しく flat_rate=0 と重複するため拒否)
  const isValid = useMemo(() => {
    if (completelyFree) return true
    if (!(flatRate.length > 0 && /^\d+$/.test(flatRate))) return false
    if (freeThreshold.length > 0) {
      const n = parseNum(freeThreshold)
      if (n === null || n <= 0) return false
    }
    return true
  }, [completelyFree, flatRate, freeThreshold])

  // Preview 計算 (クライアント mock、SQL と同順位)
  const preview = useMemo(() => {
    const flatRateN = parseNum(flatRate)
    const thresholdN = parseNum(freeThreshold)
    const regional: Record<Region, number | null> = {
      hokkaido: parseNum(hokkaido),
      tohoku:   parseNum(tohoku),
      kanto:    parseNum(kanto),
      chubu:    parseNum(chubu),
      kinki:    parseNum(kinki),
      chugoku:  parseNum(chugoku),
      shikoku:  parseNum(shikoku),
      kyushu:   parseNum(kyushu),
      okinawa:  parseNum(okinawa),
    }
    const base = { completelyFree, flatRate: flatRateN, threshold: thresholdN, regional }
    return {
      tokyo3k:      previewShipping({ ...base, subtotal: 3_000,  region: 'kanto'    }),
      hokkaido3k:   previewShipping({ ...base, subtotal: 3_000,  region: 'hokkaido' }),
      okinawa3k:    previewShipping({ ...base, subtotal: 3_000,  region: 'okinawa'  }),
      tokyoLarge:   previewShipping({ ...base, subtotal: (thresholdN ?? 10_000), region: 'kanto' }),
      showFree:     thresholdN !== null && thresholdN > 0,
      threshold:    thresholdN,
    }
  }, [completelyFree, flatRate, freeThreshold, hokkaido, tohoku, kanto, chubu, kinki, chugoku, shikoku, kyushu, okinawa])

  return (
    <form action={action} className="space-y-6">
      {disabled && disabledReason && (
        <div className="text-[12px] text-neutral-700 bg-neutral-50 border border-neutral-200 rounded px-3 py-2">
          {disabledReason}
        </div>
      )}

      <div className="text-[12px] text-neutral-600 bg-neutral-50 border border-neutral-200 rounded px-3 py-2">
        購入者の配送先に応じて送料が自動計算されます。
      </div>

      {/* 完全送料無料 toggle — ON にすると他の入力は disable + 送出時に flat_rate=0/全地域NULL/閾値NULL */}
      <label className="flex items-start gap-3 border border-neutral-200 rounded-md px-3 py-2 cursor-pointer">
        <input
          type="checkbox"
          name="completely_free"
          value="1"
          checked={completelyFree}
          disabled={disabled}
          onChange={(e) => setCompletelyFree(e.target.checked)}
          className="mt-1 h-4 w-4 accent-neutral-900"
        />
        <div>
          <div className="text-[13px] font-semibold text-neutral-900">送料無料にする</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">
            全ての注文で送料 ¥0。地域別 / 閾値の入力は無視されます。
          </div>
        </div>
      </label>

      <div className={completelyFree ? 'opacity-50 pointer-events-none select-none' : ''}>
        <div className="space-y-6">
          {/* 基本送料 */}
          <div className="space-y-1">
            <label className="text-[12px] font-semibold text-neutral-700">
              全国一律送料 (必須)
            </label>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-neutral-500">¥</span>
              <input
                name="flat_rate"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                required={!completelyFree}
                disabled={disabled || completelyFree}
                value={flatRate}
                placeholder="500"
                onChange={(e) => setFlatRate(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-40 rounded-md border border-neutral-300 px-2 py-1 text-right text-sm disabled:bg-neutral-100"
              />
            </div>
            <div className="text-[11px] text-neutral-500">
              地域別送料を指定していない都道府県はこの金額。
            </div>
          </div>

          {/* 送料無料閾値 */}
          <div className="space-y-1">
            <label className="text-[12px] font-semibold text-neutral-700">
              ○円以上購入で送料無料 (任意)
            </label>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-neutral-500">¥</span>
              <input
                name="free_shipping_threshold"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                disabled={disabled || completelyFree}
                value={freeThreshold}
                placeholder="例: 10000 (空欄=送料無料なし)"
                onChange={(e) => setFreeThreshold(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-40 rounded-md border border-neutral-300 px-2 py-1 text-right text-sm disabled:bg-neutral-100"
              />
            </div>
            <div className="text-[11px] text-neutral-500">
              この金額 (税込小計) 以上の注文は送料 0。空欄なら常に送料あり。
            </div>
          </div>

          {/* 地域別送料 */}
          <div className="border-t border-neutral-200 pt-4">
            <div className="text-[12px] font-semibold text-neutral-700 mb-2">地域別送料 (任意)</div>
            <div className="text-[11px] text-neutral-500 mb-3">
              空欄 → 全国一律送料が適用。「0」→ その地域は送料無料。
            </div>
            <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-md px-3 py-1">
              <RegionRow label="北海道" name="rate_hokkaido" value={hokkaido} onChange={setHokkaido} disabled={disabled || completelyFree} />
              <RegionRow label="東北"   name="rate_tohoku"   value={tohoku}   onChange={setTohoku}   disabled={disabled || completelyFree} />
              <RegionRow label="関東"   name="rate_kanto"    value={kanto}    onChange={setKanto}    disabled={disabled || completelyFree} />
              <RegionRow label="中部"   name="rate_chubu"    value={chubu}    onChange={setChubu}    disabled={disabled || completelyFree} />
              <RegionRow label="近畿"   name="rate_kinki"    value={kinki}    onChange={setKinki}    disabled={disabled || completelyFree} />
              <RegionRow label="中国"   name="rate_chugoku"  value={chugoku}  onChange={setChugoku}  disabled={disabled || completelyFree} />
              <RegionRow label="四国"   name="rate_shikoku"  value={shikoku}  onChange={setShikoku}  disabled={disabled || completelyFree} />
              <RegionRow label="九州"   name="rate_kyushu"   value={kyushu}   onChange={setKyushu}   disabled={disabled || completelyFree} />
              <RegionRow label="沖縄"   name="rate_okinawa"  value={okinawa}  onChange={setOkinawa}  disabled={disabled || completelyFree} />
            </div>
          </div>
        </div>
      </div>

      {/* Live preview — 現在のフォーム値で shop_calc_group_shipping と同順位計算 */}
      <div className="border border-neutral-200 rounded-md bg-neutral-50 p-3">
        <div className="text-[12px] font-semibold text-neutral-700 mb-2">送料プレビュー</div>
        <div className="text-[11px] text-neutral-500 mb-2">
          小計 ¥3,000 の注文が届く先ごとの送料の例。
        </div>
        <div className="grid grid-cols-3 gap-2 text-[12px]">
          <div className="flex flex-col items-center rounded bg-white border border-neutral-200 px-2 py-1.5">
            <span className="text-[10px] text-neutral-500">東京都</span>
            <span className="font-semibold font-mono">{yen(preview.tokyo3k)}</span>
          </div>
          <div className="flex flex-col items-center rounded bg-white border border-neutral-200 px-2 py-1.5">
            <span className="text-[10px] text-neutral-500">北海道</span>
            <span className="font-semibold font-mono">{yen(preview.hokkaido3k)}</span>
          </div>
          <div className="flex flex-col items-center rounded bg-white border border-neutral-200 px-2 py-1.5">
            <span className="text-[10px] text-neutral-500">沖縄県</span>
            <span className="font-semibold font-mono">{yen(preview.okinawa3k)}</span>
          </div>
        </div>
        {preview.showFree && preview.threshold !== null && (
          <div className="mt-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
            ¥{FMT_YEN.format(preview.threshold)} 以上 → 送料無料
          </div>
        )}
        {completelyFree && (
          <div className="mt-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
            すべての注文で送料 ¥0
          </div>
        )}
      </div>

      {!isValid && !disabled && (
        <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {completelyFree
            ? '設定内容を確認してください。'
            : (flatRate.length === 0 || !/^\d+$/.test(flatRate))
              ? '全国一律送料 (数字、0 以上) を入力してください。'
              : '送料無料閾値は 1 円以上の整数を入力してください (空欄可)。'}
        </div>
      )}

      <SaveButton enabled={!disabled && isValid} label="送料設定を保存" />
    </form>
  )
}
