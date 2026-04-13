/**
 * filter-timeline.ts
 * One-time utility to clean iran-timeline-raw.json before enrichment.
 *
 * Applies three passes:
 *   1. Date gate — pre-negotiation (< 2025-04-01) events moved to _background
 *   2. Noise filter — economic indicators, polling data, unrelated domestic events
 *   3. Deduplication — same-day events with near-identical titles (keeps first)
 *
 * Input:  data/iran-timeline-raw.json
 * Output: data/iran-timeline-filtered.json   (clean events)
 *         data/iran-timeline-background.json  (pre-2025 events for scenario description)
 *
 * Usage:
 *   bun run scripts/filter-timeline.ts
 *   bun run scripts/filter-timeline.ts --dry-run   (print stats only, no write)
 */

import { readJsonFile, writeJsonFile } from './pipeline/utils'
import type { TimelineEvent } from './pipeline/types'

const CUT_DATE = '2025-04-01'   // start of Oman-mediated nuclear talks
const FUTURE_DATE = '2026-04-06' // today + 1 (April 5, 2026)

// Title substrings that indicate pure economic indicators or noise
const NOISE_PATTERNS = [
  // Economic indicators (embed in briefings, not standalone nodes)
  '/bbl', 'per barrel', 'bbl —', 'crude oil price', 'crude peaks', 'crude settles',
  'crude reaches', 'crude at $', 'crude priced', 'brent crude', 'wti crude',
  'ttf gas', 'ttf —', '€/mwh', 'gas price', 'gas prices', 'gas storage',
  'oil revenues', 'oil imports', 'oil trade', 'yuan-denominated crude',
  'kospi', 'national debt reaches', 'corporate bonds', 'real estate index',
  'imf managing director', 'inflationary risk',

  // Polling data (embed in briefings)
  'poll shows', 'quinnipiac', 'npr/pbs', 'reuters/ipsos', 'washington post poll',
  'channel 12 poll', 'idl poll', 'inss poll', 'fox news mid-march poll',
  'fox news poll', 'cnn poll', 'marist poll',

  // Unrelated US domestic (Epstein, AIPAC fundraising, etc.)
  'epstein', 'adelson donates', 'aipac 2024', 'aipac spends',
  'aipac lobbying costs', 'aipac retreats', 'bowman',
  'brics single currency',

  // Background geopolitics unrelated to Iran conflict path
  'beidou-3', 'russia-china yuan oil trade reaches',
  'china conducts \'justice mission\'',
  'pla adiz incursions near taiwan drop',
  'russia oil revenues at their weakest',
  'eu gas storage begins',
  'last israeli hostage body returned',
  'doj announces no additional epstein',
  'epstein files transparency act',
  'house oversight committee subpoenas',
  'netanyahu sets aside haredi',
  'critical israeli budget deadline',
  '2026 us midterm elections',
  'russia gains 182 square miles',

  // Pure casualty/infrastructure damage counts (embed in event briefings)
  'centcom reports 7,000',
  'regional death toll reaches',
  'us national average gasoline',
  'us gas prices hit',
  'six us soldiers killed in kuwait by iranian drone',
  'saudi arabia destroys 51',
  'saudi arabia intercepts 12 iranian drones',
  'inss poll shows 81%',
  'idl poll shows 81%',
  'inss poll shows slight decline',

  // Color/reaction events — fold into briefings of the major event they accompany
  'forty-day mourning period declared',
  'iranians celebrate khamenei',
  'iranian state media confirms khamenei',
  'iran assembly of experts convenes to select',
  'islamic resistance in iraq claims 16',
  'iran exports 2.16 million barrels',
  'senior iranian military and security officials killed in opening strikes',
  'iran fires 14 missiles at al udeid',
  'uss george h.w. bush completes pre-deployment',
  'uss gerald r. ford experiences fire',
  '13 us service members killed as of march 17',
  'iran conducts 21 confirmed attacks on merchant',
  'taiwan records beginning of 13 consecutive',
  'chinese pla flights near taiwan resume',
  'thaad radar apparently destroyed at muwaffaq',
  'iranian missile and drone attack rate declines 90',
  'pentagon assesses nuclear strikes set back iranian',
  'white house internal document acknowledges strikes',

  // Exact duplicates with different phrasing — keep the more precise version
  'iran effectively closes strait',              // dup of IRGC declaration
  'irgc officially declares strait of hormuz closed',  // dup of Feb 28 declaration
  'irgc commander announces strait of hormuz closed',  // dup
  'iran launches retaliatory strikes against us bases in 9', // dup of "begins retaliatory"
  'iran launches retaliatory strikes against all six gcc', // dup of "begins retaliatory"
  'qatar shoots down two iranian su-24 aircraft', // dup of "qatar shoots down two iranian jets"
  'mojtaba khamenei elected third supreme leader', // dup of "appointed"
  'israel assassinates senior iranian military and nuclear leadership', // fold into Rising Lion
  'twelve-day war ends; dia leaks assessment',  // fold into ceasefire event
  'iaea director grossi assesses fordow',        // fold into IAEA expulsion
  'massive iranian domestic protests; regime kills thousands', // fold into massacre
  'iran opens internet reduced to 4%',           // fold into Epic Fury
  'rubio makes critical admission on capitol hill', // fold into rubio walks back
  'trump claims iran has \'no navy',             // political color, fold into briefings
  'uss gerald r. ford transits suez',            // operational detail
  'israel strikes tehran oil depots',            // fold into "israel strikes iranian oil infrastructure"
  'european council and german and french leaders sharply criticize', // fold into sanctions waiver
  'uae gas field set ablaze in iranian strike',  // fold into UAE strikes briefing
  'intelligence minister esmaeil khatib killed', // fold into Larijani/Soleimani event
  'nationwide protests erupt in iran over currency', // fold into january massacre
  'joe kent confirmed as nctc director',         // too minor / tangential
]

// Events we want to keep even if they match a noise pattern
const NOISE_EXCEPTIONS = [
  'commercial shipping traffic through hormuz falls to zero',
]

// Key terms that identify a specific event — if two same-day events share a key term, they're duplicates
const KEY_TERMS = [
  'epic fury', 'operation rising lion', 'midnight hammer',
  'khamenei killed', 'ayatollah khamenei killed',
  'hormuz closed', 'strait of hormuz closed',
  'qatar shoots down', 'mojtaba khamenei appointed', 'mojtaba khamenei elected',
  'south pars', 'ras laffan', 'war powers resolution',
  'iran retaliatory strikes', 'iran launches retaliatory',
]

// Similarity check — returns true if two titles are likely the same event
function areDuplicates(a: TimelineEvent, b: TimelineEvent): boolean {
  if (a.timestamp !== b.timestamp) return false

  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()

  const na = normalize(a.title)
  const nb = normalize(b.title)

  if (na === nb) return true

  // Key term match — same day + same key term = same event
  for (const term of KEY_TERMS) {
    if (na.includes(term) && nb.includes(term)) return true
  }

  // Containment — shorter title is a subset of longer (one is a truncated version)
  const shorter = na.length < nb.length ? na : nb
  const longer = na.length < nb.length ? nb : na
  if (longer.includes(shorter) && shorter.split(' ').length >= 4) return true

  // Jaccard similarity on word sets (lowered threshold to catch near-paraphrases)
  const wa = new Set(na.split(' '))
  const wb = new Set(nb.split(' '))
  const intersection = [...wa].filter(w => wb.has(w)).length
  const union = new Set([...wa, ...wb]).size
  return intersection / union > 0.50
}

function isNoise(event: TimelineEvent): boolean {
  const titleLower = event.title.toLowerCase()
  if (NOISE_EXCEPTIONS.some(e => titleLower.includes(e))) return false
  return NOISE_PATTERNS.some(p => titleLower.includes(p.toLowerCase()))
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')
  const raw = await readJsonFile<{ events: TimelineEvent[] }>('data/iran-timeline-raw.json')
  const all = raw.events

  console.log(`Input: ${all.length} events`)

  // Pass 1: Date gate
  const background: TimelineEvent[] = []
  const future: TimelineEvent[] = []
  const inRange: TimelineEvent[] = []

  for (const e of all) {
    if (e.timestamp < CUT_DATE) {
      background.push(e)
    } else if (e.timestamp >= FUTURE_DATE) {
      future.push(e)
    } else {
      inRange.push(e)
    }
  }

  console.log(`  → ${background.length} moved to background (pre-${CUT_DATE})`)
  console.log(`  → ${future.length} dropped as future projections (>= ${FUTURE_DATE})`)
  console.log(`  → ${inRange.length} in range`)

  // Pass 2: Noise filter
  const noiseRemoved: TimelineEvent[] = []
  const afterNoise: TimelineEvent[] = []

  for (const e of inRange) {
    if (isNoise(e)) {
      noiseRemoved.push(e)
    } else {
      afterNoise.push(e)
    }
  }

  console.log(`\nPass 2 — noise filter:`)
  console.log(`  → ${noiseRemoved.length} noise events removed`)
  console.log(`  → ${afterNoise.length} remaining`)

  // Pass 3: Deduplication
  const kept: TimelineEvent[] = []
  const duplicates: { kept: string; dropped: string }[] = []

  for (const candidate of afterNoise) {
    const match = kept.find(k => areDuplicates(k, candidate))
    if (match) {
      duplicates.push({ kept: `${match.timestamp} | ${match.title}`, dropped: `${candidate.timestamp} | ${candidate.title}` })
    } else {
      kept.push(candidate)
    }
  }

  console.log(`\nPass 3 — deduplication:`)
  console.log(`  → ${duplicates.length} duplicates removed`)
  console.log(`  → ${kept.length} final events`)

  if (duplicates.length > 0) {
    console.log('\nDuplicates removed:')
    duplicates.forEach(d => {
      console.log(`  KEPT:    ${d.kept}`)
      console.log(`  DROPPED: ${d.dropped}`)
    })
  }

  console.log('\nFinal timeline:')
  kept.forEach(e => console.log(`  ${e.is_decision ? '[D]' : '[ ]'} ${e.timestamp} | ${e.title}`))

  console.log(`\nNoise removed:`)
  noiseRemoved.forEach(e => console.log(`  ${e.timestamp} | ${e.title}`))

  if (dryRun) {
    console.log('\n[dry-run] No files written.')
    return
  }

  await writeJsonFile('data/iran-timeline-filtered.json', {
    _meta: {
      source: 'data/iran-timeline-raw.json',
      filtered_at: new Date().toISOString(),
      original_count: all.length,
      final_count: kept.length,
      cut_date: CUT_DATE,
    },
    events: kept,
  })

  await writeJsonFile('data/iran-timeline-background.json', {
    _meta: { description: 'Pre-negotiation background events — use for scenario background text, not as turn nodes' },
    events: background,
  })

  console.log('\n✓ Saved data/iran-timeline-filtered.json')
  console.log('✓ Saved data/iran-timeline-background.json')
  console.log('\nNext steps:')
  console.log('  1. Review data/iran-timeline-filtered.json and manually remove/merge anything else')
  console.log('  2. Add March 19 → present events (see docs/Iran Research/research-prompts.md)')
  console.log('  3. Run scripts/generate-profiles.ts')
}

if (process.argv[1] === decodeURIComponent(new URL(import.meta.url).pathname)) {
  main().catch(err => { console.error(err); process.exit(1) })
}
