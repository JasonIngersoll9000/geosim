# Multi-Actor Decision Catalog — Design Spec

**Issue:** #52
**Status:** Draft for user review
**Author:** Claude (auto-mode)

## Problem

`lib/game/iran-decisions.ts` exports only US decisions (7 options). The AI pipeline's `/advance` route filters AI actors to only those with a non-empty catalog (`aiActors = actorRows.filter(a => (decisionCatalog[a.id]?.length ?? 0) > 0)`). Result: each turn, only the US agent acts; Iran, Israel, Russia, China, and the Gulf states sit still. This makes the entire simulation degenerate — no one is reacting to US moves.

## Goal

Author authentic, research-grounded decision catalogs for all 6 scenario actors so every AI actor submits a TurnPlan each turn and the resolution engine has real material to work with.

## Scope

- 6 catalogs: `united_states` (already exists), `iran`, `israel`, `russia`, `china`, `gulf_states`
- Each catalog has 5–7 `DecisionOption` entries and matching `DecisionDetail` entries
- Decisions grounded in `docs/Iran Research/research-{military,political,economic}.md` content
- Non-goals (explicit): cross-actor concurrency rules; per-actor asset prerequisites beyond US; prompt-caching retrofit (that's #32)

## Design decisions (made + flagged)

### D1 — File layout: **one file per actor** ✅
Split `lib/game/iran-decisions.ts` into:
```
lib/game/decisions/
  index.ts              — exports IRAN_DECISION_CATALOG, IRAN_DECISION_DETAILS
  united-states.ts      — US decisions (moved from root file)
  iran.ts               — Iran decisions
  israel.ts             — Israel decisions
  russia.ts             — Russia decisions
  china.ts              — China decisions
  gulf-states.ts        — Gulf states decisions
```
**Why:** Each actor's catalog is ~80–150 lines with detail text. Single file (~900 lines) makes editing painful and review diffs noisy. Per-actor files mirror how a human researcher would organize this.

**Alternative considered:** one big `iran-decisions.ts` with a nested record. Rejected — file becomes unmaintainable.

**Backwards compat:** keep `lib/game/iran-decisions.ts` exporting the legacy `IRAN_DECISIONS`/`IRAN_DECISION_DETAILS` names from the new `decisions/united-states.ts` so existing importers (TurnPlanBuilder, decision panels) don't break. Plan to migrate them in a follow-up.

### D2 — Catalog shape ✅
```ts
// lib/game/decisions/index.ts
import type { DecisionOption, DecisionDetail } from '@/lib/types/panels'

export type ActorId = 'united_states' | 'iran' | 'israel' | 'russia' | 'china' | 'gulf_states'

export const DECISION_CATALOG: Record<ActorId, DecisionOption[]> = {
  united_states: US_DECISIONS,
  iran: IRAN_DECISIONS,
  israel: ISRAEL_DECISIONS,
  russia: RUSSIA_DECISIONS,
  china: CHINA_DECISIONS,
  gulf_states: GULF_DECISIONS,
}

export const DECISION_DETAILS: Record<ActorId, Record<string, DecisionDetail>> = { ... }
```
Then `turn-helpers.ts::loadDecisionCatalog()` returns `DECISION_CATALOG` adapted to `Record<actorId, Decision[]>`.

**Actor IDs** match the `scenario_actors.id` column values used in the seed script: `united_states`, `iran`, `israel`, `russia`, `china`, `gulf_states`. Verified against `scripts/seed-iran.ts`.

### D3 — Concurrency rules: within-actor only ✅
Each actor's decisions have concurrency rules referencing only other decisions for the same actor. Cross-actor concurrency (e.g. "Iran closes Hormuz incompatible with US oil release") is modeled by the resolution engine, not the decision catalog.

**Why:** N² combinatoric explosion. Also: actors submit plans blind to each other's plans (fog of war).

### D4 — Required assets: only where canonical ⚠️
- US keeps its `requiredAssets` (tomahawks, carriers) — already modeled
- Iran: add `requiredAssets` for nuclear-threshold decisions (needs centrifuge capacity), ballistic missile strikes (needs reserve count), Hormuz closure (needs fast-attack craft)
- Israel: add for F-35 strikes (squadron availability)
- Russia, China, Gulf: skip — decisions are political/economic in nature, not asset-gated

**Open:** `AssetRequirement` currently uses string literals like `'tomahawk_cruise_missiles'`. These must match `actor_capabilities.capability_type` values in the DB. I'll verify during implementation; if there's no matching capability seeded for Iran/Israel decisions, fall back to no asset requirement (don't gate on missing DB state).

### D5 — Dimension coverage per actor ✅
Each actor's catalog should span **at least 3 dimensions** to let the AI agent pick a rounded plan:
- military, diplomatic, economic, intelligence, political, information

Per-actor target mix:
- **US:** military-heavy (4 mil, 1 diplo, 2 eco) — already so
- **Iran:** retaliatory (3 mil, 1 diplo, 1 eco, 1 info — propaganda/nuclear signaling)
- **Israel:** military + intelligence heavy (3 mil, 1 intel, 1 diplo, 1 political — Netanyahu coalition pressure)
- **Russia:** 1 mil (arms transfer), 2 diplo (UN positioning, Iran mediation), 2 eco (oil, BRICS leverage), 1 info (disinfo campaign)
- **China:** 2 diplo (mediation, UN), 2 eco (oil procurement, yuan settlement), 1 intel (cyber), 1 info (narrative)
- **Gulf:** 1 mil (basing denial), 2 diplo (Oman backchannel, Saudi mediation), 2 eco (production adjustment, divestment), 1 political (regime signaling)

### D6 — Escalation direction is actor-relative ⚠️
"Escalate" means "raise conflict intensity from MY strategic perspective."
- US expanding air campaign = escalate
- Iran closing Hormuz = escalate (from US/Gulf view), but also Iran's own escalation ladder
- China mediating = de-escalate
- Russia arming Iran = escalate
- Gulf pursuing Oman backchannel = de-escalate

This matches the current `EscalationDirection` semantics. The judge and resolution engine already read actor-keyed escalation (per PR #65 `escalationChanges`).

### D7 — AI agent selection using new catalog
`app/api/scenarios/[id]/branches/[branchId]/advance/route.ts:99-104` filters AI actors to those with non-empty catalog. This already works — once catalogs exist, AI agents run for all 5 non-US actors.

**Open concern:** real API cost. With 6 actors instead of 1, each turn invokes 6 actor agents + 1 resolution + 1 judge + 1 narrator = 9 Claude calls per turn. Each turn could run ~$1–$2. Issue #58 (rate limiting) becomes blocking once #52 ships.

## Research grounding

Each of the 5 new catalogs will be authored by reading the relevant research doc sections:

| Actor | Key research sections |
|---|---|
| Iran | research-political.md §2 (decapitated but not defeated), research-military.md §2 (weapons inventory), §10 (Shahed/missile retaliation), §11 (oil infrastructure) |
| Israel | research-political.md §3 (near-unanimous support, Netanyahu coalition), research-military.md §12 (Lebanon/Gaza status) |
| Russia | research-political.md §5 (propaganda matrix — need to scan body), research-economic.md (oil/gas market, petrodollar/BRICS) |
| China | research-political.md §5, research-economic.md (oil demand, yuan settlement) |
| Gulf | research-political.md §4 (betrayed by allies), research-economic.md (oil production, Dubai) |

Each decision's `strategicRationale` and `expectedOutcomes` will cite a specific research passage (even if paraphrased), so the rationale is traceable back to verified reporting, not AI-invented.

## Implementation plan

Defer to `superpowers:writing-plans` after user approves this design. Rough sketch:

1. Create `lib/game/decisions/index.ts` with `DECISION_CATALOG` / `DECISION_DETAILS` records
2. Move existing US decisions to `lib/game/decisions/united-states.ts`
3. Author each new actor catalog — one PR per actor, parallel-safe (different files):
   - `feat(decisions): iran decision catalog`
   - `feat(decisions): israel decision catalog`
   - `feat(decisions): russia decision catalog`
   - `feat(decisions): china decision catalog`
   - `feat(decisions): gulf states decision catalog`
4. Update `lib/game/turn-helpers.ts::loadDecisionCatalog()` to return the full record (final PR)
5. Update `app/scenarios/[id]/play/[branchId]/page.tsx` to pass actor-specific decisions to UI (final PR)
6. Tests: `tests/game/decisions.test.ts` covering shape, actor coverage, concurrency-rule validity

Parallelization: steps 3a–3e can run simultaneously via 5 subagents, each with a research doc and the catalog spec. Step 4 and 5 are final serial merges.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Cost explosion (9 AI calls/turn × many turns) | Pair with #58 rate limiting before real play |
| Catalog entries feel AI-generated, not research-grounded | Every decision cites a research passage; reviewer spot-checks citations |
| Concurrency rules become inconsistent | Automated test that every referenced `decisionId` in a rule actually exists |
| `actor_capabilities.capability_type` values don't match | During impl, grep seed data first; skip asset gating if no match |

## Open decisions (flagged for user before writing-plans runs)

1. **Are the 6 actor IDs correct?** Derived from seed script. If scenarios have additional actors (e.g. Turkey, Hezbollah proxy separately), extend the catalog.
2. **Keep legacy `IRAN_DECISIONS` named export?** Planned yes for backwards compat, migrate in follow-up. Alternative: rename everywhere immediately.
3. **Decision count: 5, 6, or 7 per actor?** Planned 5–7. Fewer = simpler AI choice, less cost. More = richer simulation. Recommend 6.
4. **Ship catalogs incrementally or all at once?** Planned: 5 parallel PRs (one per actor), merged as they're approved. Alternative: single big PR. Incremental lets partial-value ship.
