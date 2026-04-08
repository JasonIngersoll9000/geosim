// lib/game/branch-worthiness.ts
import type { BranchWorthiness } from '@/lib/types/simulation'

interface ScoringPattern {
  pattern: RegExp
  points: number
  reason: string
}

const HIGH_SCORE_PATTERNS: ScoringPattern[] = [
  { pattern: /nuclear|fordow|natanz|arak|dimona/i,       points: 60, reason: 'Nuclear facility involved' },
  { pattern: /civilian|refinery|power grid|electricity/i, points: 60, reason: 'Civilian infrastructure targeted' },
  { pattern: /assassinat|kill|eliminat.*general|kill.*official/i, points: 55, reason: 'Key figure killed' },
  { pattern: /hormuz|strait|blockade|mine/i,             points: 25, reason: 'Strait of Hormuz affected' },
  { pattern: /first.*(strike|attack)|open.*(war|conflict)/i, points: 20, reason: 'First-use escalation' },
  { pattern: /alliance|ally|israel|hezbollah|houthi/i,   points: 10, reason: 'Alliance dynamics' },
  { pattern: /carrier.*strike|air.*campaign|bomb/i,       points: 10, reason: 'Major military action' },
]

export function scoreBranchWorthiness(
  events: Array<{ name: string; description: string }>,
  turnNarrative: string
): BranchWorthiness {
  let score = 0
  const reasons: string[] = []
  const fullText = `${turnNarrative} ${events.map(e => `${e.name} ${e.description}`).join(' ')}`

  for (const { pattern, points, reason } of HIGH_SCORE_PATTERNS) {
    if (pattern.test(fullText)) {
      score += points
      reasons.push(reason)
    }
  }

  score = Math.min(100, score)

  const reason = reasons.length > 0 ? reasons.join('; ') : 'Routine turn — no high-significance events'
  const suggestedBranchLabel = reasons.length > 0
    ? `Response to: ${reasons[0]}`
    : 'Alternate path'

  return { score, reason, suggestedBranchLabel, alternateResponses: [] }
}
