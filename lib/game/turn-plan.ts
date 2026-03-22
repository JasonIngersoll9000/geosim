import type { Decision, TurnPlan, TurnPlanValidationResult } from '../types/simulation'

// ------------------------------------------------------------
// TURNPLAN VALIDATION
// Checks concurrency rules, resource allocation, and detects
// synergies and tensions between planned actions.
// ------------------------------------------------------------

/**
 * Validate a TurnPlan against the full decision catalog.
 * Returns errors (blockers), warnings (advisories), synergies,
 * tensions, and the total resource utilization.
 */
export function validateTurnPlan(
  plan: TurnPlan,
  decisions: Decision[]
): TurnPlanValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const synergies: { actions: string[]; bonus: string }[] = []
  const tensions: { actions: string[]; penalty: string }[] = []

  const decisionMap = new Map(decisions.map(d => [d.id, d]))

  const primaryDecision = decisionMap.get(plan.primaryAction.decisionId)
  const allActions = [plan.primaryAction, ...plan.concurrentActions]
  const allDecisions = allActions
    .map(a => decisionMap.get(a.decisionId))
    .filter((d): d is Decision => d !== undefined)

  // ── Resource allocation ─────────────────────────────────
  const totalPercent = allActions.reduce((sum, a) => sum + a.resourcePercent, 0)

  if (totalPercent > 100) {
    errors.push(`Resource allocation exceeds 100% (total: ${totalPercent}%)`)
  }

  for (const action of allActions) {
    if (action.resourcePercent === 0) {
      const dec = decisionMap.get(action.decisionId)
      errors.push(
        `Action "${dec?.title ?? action.decisionId}" has 0% resource allocation — remove it or assign resources`
      )
    }
  }

  if (plan.primaryAction.resourcePercent < 50 && plan.concurrentActions.length > 0) {
    warnings.push(
      'Primary action receives less than 50% of resources — consider whether concurrent actions are diluting your main effort'
    )
  }

  // ── Concurrency rules ───────────────────────────────────
  if (primaryDecision?.resourceWeight === 'total' && plan.concurrentActions.length > 0) {
    errors.push(
      `"${primaryDecision.title}" requires total resource commitment — no concurrent actions allowed`
    )
  }

  // Check each concurrent action against the primary and each other
  const concurrentDecisions = plan.concurrentActions
    .map(a => decisionMap.get(a.decisionId))
    .filter((d): d is Decision => d !== undefined)

  for (const concurrent of concurrentDecisions) {
    // Check against primary
    if (primaryDecision) {
      const primaryIncompatible = primaryDecision.incompatibleWith ?? []
      if (primaryIncompatible.includes(concurrent.id)) {
        errors.push(
          `"${primaryDecision.title}" and "${concurrent.title}" are incompatible — cannot run concurrently`
        )
        tensions.push({
          actions: [primaryDecision.id, concurrent.id],
          penalty: `Combining ${primaryDecision.title} with ${concurrent.title} creates strategic contradiction`,
        })
      }

      const concurrentIncompatible = concurrent.incompatibleWith ?? []
      if (concurrentIncompatible.includes(primaryDecision.id) && !primaryIncompatible.includes(concurrent.id)) {
        errors.push(
          `"${concurrent.title}" and "${primaryDecision.title}" are incompatible — cannot run concurrently`
        )
        tensions.push({
          actions: [primaryDecision.id, concurrent.id],
          penalty: `Combining ${concurrent.title} with ${primaryDecision.title} creates strategic contradiction`,
        })
      }
    }
  }

  // ── Synergy detection ────────────────────────────────────
  const allDecisionIds = allDecisions.map(d => d.id)

  for (const dec of allDecisions) {
    for (const syn of dec.synergiesWith ?? []) {
      if (allDecisionIds.includes(syn.decisionCategory) && syn.decisionCategory !== dec.id) {
        // Avoid duplicate synergy entries
        const alreadyRecorded = synergies.some(
          s => s.actions.includes(dec.id) && s.actions.includes(syn.decisionCategory)
        )
        if (!alreadyRecorded) {
          synergies.push({
            actions: [dec.id, syn.decisionCategory],
            bonus: syn.bonus,
          })
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    synergies,
    tensions,
    resourceUtilization: totalPercent,
  }
}
