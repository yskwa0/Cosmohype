// AI HQ Phase 1: Agent registry。
//
// persona .md を server-side で 1 回だけ読み、 AgentDefinition[] として保持する。
// import 時に fs で同期読み込み → cold start に少しコストがかかるが、
// runtime には毎 turn 参照するのでキャッシュ効果は高い。

import fs from 'node:fs'
import path from 'node:path'
import { AGENT_IDS, type AgentId, type AgentDefinition } from '../types'

const PERSONA_DIR = path.join(process.cwd(), 'ai-company', 'agents')

const DISPLAY_NAMES: Record<AgentId, string> = {
  jurin: 'ジュリン',
  chisa: 'チサ',
  hinata: 'ヒナタ',
  harvey: 'ハーヴィー',
  juria: 'ジュリア',
  maya: 'マヤ',
  cocona: 'ココナ',
}

const ROLES: Record<AgentId, string> = {
  jurin: 'Chief of Staff',
  chisa: 'Product / UX',
  hinata: 'Engineering',
  harvey: 'Growth',
  juria: 'Marketing / SNS',
  maya: 'Research / Trend',
  cocona: 'Finance / Business Strategy',
}

let cache: Record<AgentId, AgentDefinition> | null = null

function loadPersona(id: AgentId): string {
  const p = path.join(PERSONA_DIR, `${id}.md`)
  try {
    return fs.readFileSync(p, 'utf-8')
  } catch (err) {
    console.error(`[ai-company/registry] failed to load ${p}`, err)
    return `# ${DISPLAY_NAMES[id]}\n\n(persona file missing)`
  }
}

export function getAgent(id: AgentId): AgentDefinition {
  if (!cache) {
    const built: Partial<Record<AgentId, AgentDefinition>> = {}
    for (const a of AGENT_IDS) {
      built[a] = {
        id: a,
        displayName: DISPLAY_NAMES[a],
        role: ROLES[a],
        personaMarkdown: loadPersona(a),
      }
    }
    cache = built as Record<AgentId, AgentDefinition>
  }
  return cache[id]
}

export function allAgents(): AgentDefinition[] {
  return AGENT_IDS.map(getAgent)
}

export function displayName(id: AgentId): string {
  return DISPLAY_NAMES[id]
}
export function roleOf(id: AgentId): string {
  return ROLES[id]
}
