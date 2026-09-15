// AI HQ Phase 2C: deliverable content schema SoT + agent mapping。
//
// 各 deliverable_type に対して:
//   - fields: JSON key 名の list
//   - primary_agent: default 担当 agent (server-side validation で unknown 組合わせを reject)
//   - allowed_agents: 例外的に他 agent も許可する場合 (通常 primary のみ)

import type { AgentId } from '../types'

export const DELIVERABLE_TYPES = [
  'social_content_draft',
  'growth_experiment',
  'ux_proposal',
  'engineering_plan',
  'research_brief',
  'business_case',
  'executive_brief',
] as const
export type DeliverableType = (typeof DELIVERABLE_TYPES)[number]

interface Spec {
  fields: string[]
  primary_agent: AgentId
  allowed_agents?: AgentId[]
  human_labels: Record<string, string> // UI 表示ラベル
}

export const DELIVERABLE_SPECS: Record<DeliverableType, Spec> = {
  social_content_draft: {
    primary_agent: 'juria',
    fields: ['concept', 'hook', 'body', 'caption', 'target_audience', 'objective', 'suggested_kpi', 'brand_notes'],
    human_labels: {
      concept: 'CONCEPT',
      hook: 'HOOK',
      body: 'STRUCTURE',
      caption: 'CAPTION',
      target_audience: 'TARGET',
      objective: 'OBJECTIVE',
      suggested_kpi: 'SUGGESTED KPI',
      brand_notes: 'BRAND NOTES',
    },
  },
  growth_experiment: {
    primary_agent: 'harvey',
    fields: ['hypothesis', 'target_segment', 'experiment', 'success_metric', 'duration', 'stop_condition', 'expected_learning'],
    human_labels: {
      hypothesis: 'HYPOTHESIS',
      target_segment: 'TARGET SEGMENT',
      experiment: 'EXPERIMENT',
      success_metric: 'SUCCESS METRIC',
      duration: 'DURATION',
      stop_condition: 'STOP CONDITION',
      expected_learning: 'EXPECTED LEARNING',
    },
  },
  ux_proposal: {
    primary_agent: 'chisa',
    fields: ['problem', 'evidence', 'proposed_change', 'user_flow', 'edge_cases', 'acceptance_criteria'],
    human_labels: {
      problem: 'PROBLEM',
      evidence: 'EVIDENCE',
      proposed_change: 'PROPOSED CHANGE',
      user_flow: 'USER FLOW',
      edge_cases: 'EDGE CASES',
      acceptance_criteria: 'ACCEPTANCE CRITERIA',
    },
  },
  engineering_plan: {
    primary_agent: 'hinata',
    fields: ['problem', 'suspected_cause', 'affected_areas', 'proposed_changes', 'risks', 'test_plan', 'rollback_plan'],
    human_labels: {
      problem: 'PROBLEM',
      suspected_cause: 'SUSPECTED CAUSE',
      affected_areas: 'AFFECTED AREAS',
      proposed_changes: 'PROPOSED CHANGES',
      risks: 'RISKS',
      test_plan: 'TEST PLAN',
      rollback_plan: 'ROLLBACK PLAN',
    },
  },
  research_brief: {
    primary_agent: 'maya',
    fields: ['signal', 'evidence', 'why_now', 'relevance_to_cosmohype', 'confidence', 'recommended_action'],
    human_labels: {
      signal: 'SIGNAL',
      evidence: 'EVIDENCE',
      why_now: 'WHY NOW',
      relevance_to_cosmohype: 'RELEVANCE TO COSMOHYPE',
      confidence: 'CONFIDENCE',
      recommended_action: 'RECOMMENDED ACTION',
    },
  },
  business_case: {
    primary_agent: 'cocona',
    fields: ['opportunity', 'assumptions', 'estimated_cost', 'expected_value', 'roi_logic', 'risks', 'recommendation'],
    human_labels: {
      opportunity: 'OPPORTUNITY',
      assumptions: 'ASSUMPTIONS',
      estimated_cost: 'ESTIMATED COST',
      expected_value: 'EXPECTED VALUE',
      roi_logic: 'ROI LOGIC',
      risks: 'RISKS',
      recommendation: 'RECOMMENDATION',
    },
  },
  executive_brief: {
    primary_agent: 'jurin',
    fields: ['situation', 'findings', 'options', 'recommendation', 'priority', 'owner', 'next_action'],
    human_labels: {
      situation: 'SITUATION',
      findings: 'FINDINGS',
      options: 'OPTIONS',
      recommendation: 'RECOMMENDATION',
      priority: 'PRIORITY',
      owner: 'OWNER',
      next_action: 'NEXT ACTION',
    },
  },
}

/// agent と type の組合わせを検証。 mismatch は reject 用 boolean を返す。
export function isValidAgentType(agent: AgentId, type: DeliverableType): boolean {
  const spec = DELIVERABLE_SPECS[type]
  if (!spec) return false
  if (spec.primary_agent === agent) return true
  if (spec.allowed_agents?.includes(agent)) return true
  return false
}

/// content jsonb の shape validation。 required field が全て存在 (string、空でない) を確認。
export function validateContent(type: DeliverableType, content: Record<string, unknown>): { ok: true } | { ok: false; missing: string[] } {
  const spec = DELIVERABLE_SPECS[type]
  const missing: string[] = []
  for (const f of spec.fields) {
    const v = content[f]
    if (typeof v !== 'string' || v.trim().length === 0) missing.push(f)
  }
  return missing.length === 0 ? { ok: true } : { ok: false, missing }
}
