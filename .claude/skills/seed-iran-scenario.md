---
name: seed-iran-scenario
description: Use when populating the Iran conflict scenario into Supabase by running the 7-stage research pipeline end-to-end to create the ground truth trunk with all actors, events, escalation ladders, and fog-of-war data
---

## Description
Run the GeoSim research pipeline (Stages 0–6) to populate the Iran conflict scenario
into Supabase and create the ground truth trunk branch.

## Prerequisites
- Supabase is running (local or remote) with migrations applied
- `ANTHROPIC_API_KEY` set in `.env.local`
- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in `.env.local`
- Dev server optionally running: `bun run dev`

## Steps

### 1. Verify environment
```bash
bun run typecheck   # confirm no type errors before seeding
```

Check `.env.local` has all three required vars: `NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`.

### 2. Create the scenario record
POST to `/api/scenarios`:
```json
{
  "name": "US-Israel-Iran Conflict 2025-2026",
  "description": "Strategic simulation branching from Day 19 of Operation Epic Fury, one day after the Ayatollah assassination.",
  "category": "geopolitical_conflict",
  "dimensions": ["military", "economic", "political", "diplomatic", "intelligence", "cultural"],
  "tags": ["iran", "middle-east", "nuclear", "strait-of-hormuz", "2026"]
}
```
Save the returned `id` as `SCENARIO_ID`.

### 3. Run Stage 0 — Scenario framing
POST to `/api/scenarios/{SCENARIO_ID}/research/frame`:
```json
{
  "userDescription": "<paste full Iran scenario description from docs/prd.md section 10.1>"
}
```
Review clarifying questions. Then confirm:
POST to `/api/scenarios/{SCENARIO_ID}/research/frame/confirm` with any clarifications.

### 4. Run Stages 1–6 — Full pipeline
POST to `/api/scenarios/{SCENARIO_ID}/research/populate`:
```json
{
  "confirmedFrame": "<frame from step 3>",
  "userDescription": "<same Iran description>"
}
```
This is long-running (~5–10 min). Poll status:
```
GET /api/scenarios/{SCENARIO_ID}/research/status
```
Wait until `status: "complete"`.

**Key actors that must appear in the output:**
- United States, Israel, Iran (primary)
- Russia, China, Gulf States (UAE, Saudi, Qatar) (secondary)
- Hezbollah, IRI militia, Houthis (proxy/non-state)

### 5. Verify scenario data quality
Check that the populated scenario includes:
- [ ] All 8+ actors with `overallReadiness` scores and `keyFigures`
- [ ] Iran's nuclear constraint cascade (Ayatollah death → fatwa removed → breakout possible)
- [ ] Strait of Hormuz as `status: "blocked"` with mine threat data
- [ ] US policy disconnect: public support ~31%, AIPAC influence ~82
- [ ] Intelligence pictures where US believes Iran readiness=25, actual=58
- [ ] Event timeline covering Twelve-Day War (Jun 13–24), interwar, Epic Fury (Feb 28+)
- [ ] Escalation ladders: US at rung 5, Iran at rung 6, Israel at rung 6

### 6. Create the ground truth trunk branch
POST to `/api/scenarios/{SCENARIO_ID}/branches`:
```json
{
  "name": "Ground Truth Trunk",
  "description": "Real-world verified timeline — Day 19 of Operation Epic Fury",
  "forkFromCommitId": null,
  "gameMode": "observer",
  "userControlledActors": [],
  "visibility": "public"
}
```
Save the returned `id`. Then update the scenario's `trunk_branch_id`:
```
PATCH /api/scenarios/{SCENARIO_ID}
{ "trunk_branch_id": "<branch_id>" }
```

### 7. Create the initial turn commit
POST to `/api/branches/{BRANCH_ID}/turns/start`

This creates Turn 0 (the branching point) with the full scenario snapshot.
Verify the commit saves and `head_commit_id` is updated on the branch.

### 8. Verify playability
- Navigate to `/scenarios/{SCENARIO_ID}/play/{BRANCH_ID}` in the browser
- Confirm map shows Middle East with actor colors
- Confirm actors panel shows all 8+ actors
- Confirm escalation rungs match expected values

## Constraints
- Never re-seed over an existing trunk — create a new scenario record instead
- Do not commit `.env.local` after running
- If any stage errors, check `research/status` for the specific stage that failed
- Research pipeline uses web search — results may vary; verify key facts against
  `docs/Iran Research/` ground truth documents after seeding
