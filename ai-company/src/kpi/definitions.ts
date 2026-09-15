// AI HQ Phase 2A: KPI 定義 SoT。
//
// ここに登録された KPI だけが HARVEY の KPI Check で参照される。
// 各 KPI は「24h aggregate + 7d baseline 用 daily counts」を SQL 一発で計算できる形にする。
// last_seen_at 系の存在しない指標は追加しない (Prod schema 調査で不在確認済)。
//
// 追加ルール:
//   - id: snake_case、DB unique key として使う
//   - table: public.* テーブル名
//   - created_at_col: 「新規行の発生タイミング」を示す column
//   - filter: 追加条件 (SQL 断片、null 可)
//   - description: 一行日本語 (HARVEY prompt に埋め込まれる)
//
// 変更時: agent_kpi_snapshots.kpi_id が古い定義を参照している可能性を考慮する。

export interface KpiDefinition {
  id: string
  table: string
  createdAtCol: string
  filter?: string
  description: string
}

export const KPI_DEFINITIONS: KpiDefinition[] = [
  {
    id: 'new_users',
    table: 'profiles',
    createdAtCol: 'created_at',
    filter: 'deleted_at IS NULL',
    description: '新規登録ユーザー (deleted 除外)',
  },
  {
    id: 'posts',
    table: 'posts',
    createdAtCol: 'created_at',
    description: '投稿数 (feed 側)',
  },
  {
    id: 'hype_participations',
    table: 'hype_participations',
    createdAtCol: 'created_at',
    description: 'HYPE 相談への参加',
  },
  {
    id: 'hype_responses',
    table: 'hype_responses',
    createdAtCol: 'created_at',
    description: 'HYPE 回答',
  },
  {
    id: 'style_diagnoses',
    table: 'style_diagnoses',
    createdAtCol: 'created_at',
    description: 'STYLE ID 診断 (旧テーブル)',
  },
  {
    id: 'style_id_diagnosis_results',
    table: 'style_id_diagnosis_results',
    createdAtCol: 'created_at',
    description: 'STYLE ID 診断完了',
  },
  {
    id: 'marketplace_listings',
    table: 'marketplace_listings',
    createdAtCol: 'created_at',
    description: 'HYPE 出品',
  },
  {
    id: 'marketplace_reservations',
    table: 'marketplace_purchase_reservations',
    createdAtCol: 'created_at',
    description: 'HYPE 購入意図',
  },
  {
    id: 'marketplace_orders',
    table: 'marketplace_orders',
    createdAtCol: 'created_at',
    description: 'HYPE 実購入',
  },
  {
    id: 'follows',
    table: 'follows',
    createdAtCol: 'created_at',
    description: '新規フォロー',
  },
  {
    id: 'likes',
    table: 'likes',
    createdAtCol: 'created_at',
    description: 'いいね',
  },
]

/// baseline vs current の変化を anomaly かどうか判定。
/// スケール小 (7d 平均 < 3) の場合は insufficient_data として anomaly を出さない。
export interface AnomalyVerdict {
  isAnomaly: boolean
  reason: 'insufficient_data' | 'drop_to_zero' | 'drop_50' | 'surge_3x' | 'normal'
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
}

export function verdict(current: number, avg7d: number): AnomalyVerdict {
  if (avg7d < 3) return { isAnomaly: false, reason: 'insufficient_data', severity: 'info' }
  if (current === 0 && avg7d >= 3)
    return { isAnomaly: true, reason: 'drop_to_zero', severity: avg7d >= 10 ? 'high' : 'medium' }
  if (avg7d >= 5 && current <= avg7d * 0.5)
    return { isAnomaly: true, reason: 'drop_50', severity: avg7d >= 20 ? 'high' : 'medium' }
  if (avg7d >= 3 && current >= avg7d * 3)
    return { isAnomaly: true, reason: 'surge_3x', severity: 'medium' }
  return { isAnomaly: false, reason: 'normal', severity: 'info' }
}
