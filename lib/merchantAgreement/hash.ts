// =============================================================================
// lib/merchantAgreement/hash.ts  (Phase 4-B / Migration 168)
//
// Merchant Agreement canonical content の SHA-256 ハッシュ計算。
// 決定的 (deterministic) な JSON serialization を通して hash を算出するため、
// TS 側 (server boot) と Migration 168 seed の literal が完全一致する。
//
// stableStringify は「オブジェクトキーをアルファベット順に固定」した JSON 出力を返す。
// JSON.stringify のデフォルトはキーの挿入順に依存するため、直接使わない。
// =============================================================================

import 'server-only'
import { createHash } from 'crypto'
import type { AgreementDocument } from './content'

function stableStringify(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}'
}

/**
 * 契約本文の canonical serialization (hash 対象の bytes)。
 * bytes 長は現行 v1 で 15072 (utf-8)。 数字自体は informational。
 */
export function serializeCanonical(doc: AgreementDocument): string {
  return stableStringify(doc as unknown)
}

/**
 * 契約本文の SHA-256 hex 文字列 (64 chars, lowercase)。
 * Migration 168 seed の literal と boot 時計算値が一致することを前提とする。
 */
export function computeAgreementHash(doc: AgreementDocument): string {
  return createHash('sha256').update(serializeCanonical(doc), 'utf8').digest('hex')
}
