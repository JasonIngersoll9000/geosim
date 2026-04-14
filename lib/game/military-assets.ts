/**
 * Per-actor military capabilities with domain classification.
 * Sourced from research capability JSON files (static, scenario-anchored data).
 * Grouped into capability domains for structured display in the Military tab.
 */

import iranCaps from '@/data/capabilities-iran.json'
import usCaps from '@/data/capabilities-us.json'
import israelCaps from '@/data/capabilities-israel.json'
import russiaChina from '@/data/capabilities-russia-china.json'
import gccCaps from '@/data/capabilities-gulf-states.json'

export type MilitaryDomain =
  | 'ground'
  | 'air'
  | 'naval'
  | 'missiles'
  | 'drones'
  | 'nuclear'
  | 'cyber'
  | 'other'

export const DOMAIN_LABELS: Record<MilitaryDomain, string> = {
  ground:   'Ground Forces',
  air:      'Air Power',
  naval:    'Naval Assets',
  missiles: 'Missiles & Rockets',
  drones:   'Drones / UAVs',
  nuclear:  'Nuclear Posture',
  cyber:    'Cyber & Intel',
  other:    'Other Capabilities',
}

export interface MilitaryCapabilityEntry {
  domain: MilitaryDomain
  name: string
  description: string
  quantity: number | null
  unit: string | null
  deploymentStatus: string
}

type RawEntry = {
  category?: string
  name?: string
  description?: string
  quantity?: number | null
  unit?: string | null
  deployment_status?: string
  actor?: string
}

function classifyDomain(name: string, description: string): MilitaryDomain {
  const text = (name + ' ' + description).toLowerCase()
  if (/nuclear|enrichment|uranium|warhead|fissile|npt|fatwa.*nuclear|nuclear.*weapon/.test(text))
    return 'nuclear'
  if (/drone|uav|shahed|loiter|one.way.attack|owa|kamikaze drone/.test(text))
    return 'drones'
  if (/ballistic|cruise missile|rocket arsenal|shahab|emad|khorramshahr|kheibar|fattah|soumar|hoveyzeh|abu mahdi|patriot|thaad|iron dome|arrow|aegis|icbm|mrbm|srbm|missile.*arsenal|missile.*inventory/.test(text))
    return 'missiles'
  if (/submarine|destroyer|frigate|corvette|naval|navy|fleet|ship|carrier strike|fast.attack|mine.war/.test(text))
    return 'naval'
  if (/fighter|bomber|f-35|f-15|f-16|f-22|b-2|b-52|iai|iaf|aircraft|air force|aviation|jet|eurofighter|typhoon|aerial|air.*power|stealth|awacs|tanker|recon|sr-71|surveillance aircraft/.test(text))
    return 'air'
  if (/ground.*force|army|infantry|armored|armor|tank|brigade|division|artillery|mechanized|corps|troops|soldiers|maneuver|battal|regiment|special forces|rangers|marines|idf ground|irgc ground/.test(text))
    return 'ground'
  if (/cyber|electronic warfare|sigint|signals intelligence|information operation|disinform|hack|unit 8200|nis|gru|fsb/.test(text))
    return 'cyber'
  return 'other'
}

function toEntry(r: RawEntry): MilitaryCapabilityEntry {
  const name  = r.name ?? ''
  const desc  = r.description ?? ''
  return {
    domain:           classifyDomain(name, desc),
    name,
    description:      desc,
    quantity:         r.quantity ?? null,
    unit:             r.unit ?? null,
    deploymentStatus: r.deployment_status ?? 'available',
  }
}

function militaryOnly(items: RawEntry[], actorFilter?: string): MilitaryCapabilityEntry[] {
  return items
    .filter(x => x.category === 'military' && (!actorFilter || x.actor === actorFilter))
    .map(toEntry)
}

const ACTOR_MILITARY: Record<string, MilitaryCapabilityEntry[]> = {
  iran:         militaryOnly(iranCaps as RawEntry[]),
  us:           militaryOnly(usCaps as RawEntry[]),
  israel:       militaryOnly(israelCaps as RawEntry[]),
  russia:       militaryOnly(russiaChina as RawEntry[], 'russia'),
  china:        militaryOnly(russiaChina as RawEntry[], 'china'),
  saudi_arabia: militaryOnly(gccCaps as RawEntry[], 'saudi_arabia'),
}

const ALIAS: Record<string, string> = {
  usa: 'us', united_states: 'us', unitedstates: 'us',
  irn: 'iran', isr: 'israel',
  sau: 'saudi_arabia', rus: 'russia', chn: 'china',
}

/** All military capabilities for an actor, sorted by domain. */
export function getActorMilitaryAssets(actorId: string): MilitaryCapabilityEntry[] {
  const id = actorId.toLowerCase().replace(/-/g, '_')
  return ACTOR_MILITARY[ALIAS[id] ?? id] ?? []
}

const DOMAIN_ORDER: MilitaryDomain[] = ['ground', 'air', 'naval', 'missiles', 'drones', 'nuclear', 'cyber', 'other']

/** Capabilities grouped by domain, ordered canonically. */
export function getActorMilitaryByDomain(actorId: string): Array<{
  domain: MilitaryDomain
  label: string
  items: MilitaryCapabilityEntry[]
}> {
  const all = getActorMilitaryAssets(actorId)
  return DOMAIN_ORDER
    .map(domain => ({
      domain,
      label: DOMAIN_LABELS[domain],
      items: all.filter(c => c.domain === domain),
    }))
    .filter(g => g.items.length > 0)
}
