/**
 * Per-actor military capabilities derived from the research capability JSON files.
 * Used by the Military tab in the actor detail panel.
 * This is static reference data — no Supabase queries required.
 */

import iranCaps from '@/data/capabilities-iran.json'
import usCaps from '@/data/capabilities-us.json'
import israelCaps from '@/data/capabilities-israel.json'
import russiaChina from '@/data/capabilities-russia-china.json'
import gccCaps from '@/data/capabilities-gulf-states.json'

export interface MilitaryCapabilityEntry {
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

function toEntry(r: RawEntry): MilitaryCapabilityEntry {
  return {
    name:             r.name ?? '',
    description:      r.description ?? '',
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

/**
 * Return the list of military capability entries for an actor.
 * Returns an empty array for unknown actors.
 */
export function getActorMilitaryAssets(actorId: string): MilitaryCapabilityEntry[] {
  const id = actorId.toLowerCase().replace(/-/g, '_')
  const aliasMap: Record<string, string> = {
    usa: 'us', united_states: 'us', unitedstates: 'us',
    irn: 'iran',
    isr: 'israel',
    sau: 'saudi_arabia',
    rus: 'russia',
    chn: 'china',
  }
  return ACTOR_MILITARY[aliasMap[id] ?? id] ?? []
}
