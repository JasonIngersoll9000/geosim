/**
 * Canonical actor / nation color palette — single source of truth for all
 * map markers, popups, and UI components.
 */

export interface ActorColorSpec {
  hex:    string
  border: string
  bg:     string
  text:   string
}

export const ACTOR_COLORS: Record<string, ActorColorSpec> = {
  us:            { hex: '#4a90d9', border: '#4a90d9', bg: 'rgba(74,144,217,0.20)',  text: '#7ab0e8' },
  united_states: { hex: '#4a90d9', border: '#4a90d9', bg: 'rgba(74,144,217,0.20)',  text: '#7ab0e8' },
  israel:        { hex: '#4fc3f7', border: '#4fc3f7', bg: 'rgba(79,195,247,0.20)',  text: '#82d4f7' },
  iran:          { hex: '#c0392b', border: '#c0392b', bg: 'rgba(192,57,43,0.20)',   text: '#e74c3c' },
  saudi_arabia:  { hex: '#f39c12', border: '#f39c12', bg: 'rgba(243,156,18,0.20)',  text: '#f5ab35' },
  russia:        { hex: '#8e44ad', border: '#8e44ad', bg: 'rgba(142,68,173,0.20)',  text: '#a569bd' },
  china:         { hex: '#e74c3c', border: '#e74c3c', bg: 'rgba(231,76,60,0.20)',   text: '#ec7063' },
  default:       { hex: '#e67e22', border: '#e67e22', bg: 'rgba(230,126,34,0.20)',  text: '#f39c12' },
}

/**
 * ISO-3166 alpha-2 nation code → hex color.
 * Derived from ACTOR_COLORS where applicable.
 */
export const NATION_HEX_COLORS: Record<string, string> = {
  US:    ACTOR_COLORS.us.hex,
  IL:    ACTOR_COLORS.israel.hex,
  IR:    ACTOR_COLORS.iran.hex,
  SA:    ACTOR_COLORS.saudi_arabia.hex,
  AE:    '#9b59b6',   // UAE — purple
  QA:    '#27ae60',   // Qatar — green
  OM:    '#16a085',   // Oman — teal
  KW:    '#5d6d7e',   // Kuwait — grey-blue
  IQ:    '#7f8c8d',   // Iraq — grey
  LB:    '#e74c3c',   // Lebanon — red (Hezbollah nexus)
  SY:    '#95a5a6',   // Syria — silver
  YE:    '#d35400',   // Yemen — burnt orange
  'US/IL': ACTOR_COLORS.us.hex,
}

export function getActorColor(actorId: string): ActorColorSpec {
  return ACTOR_COLORS[actorId.toLowerCase().replace(/-/g, '_')] ?? ACTOR_COLORS.default
}

export function getNationHex(nationCode: string): string {
  return NATION_HEX_COLORS[nationCode] ?? '#8a8880'
}

export function nationToActorId(nationCode: string): string {
  const MAP: Record<string, string> = {
    US: 'us', IL: 'israel', IR: 'iran', SA: 'saudi_arabia',
    RU: 'russia', CN: 'china',
  }
  return MAP[nationCode] ?? 'default'
}
