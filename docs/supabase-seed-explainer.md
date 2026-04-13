# What We're Setting Up in Supabase

## Overview

We're seeding the **Iran 2026 scenario** — a pre-built, historically-grounded geopolitical simulation covering the US-Iran conflict from February through April 2026. This gives the app a rich, playable scenario on first load rather than starting from scratch.

---

## The Pipeline (how data flows)

```
Raw research docs
      ↓
scripts/parse-gap-fill.ts       → data/iran-gap-fill.json
      ↓
scripts/score-state-effects.ts  → data/iran-state-effects.json
      ↓
scripts/compute-state-snapshots.ts → data/iran-state-snapshots.json
      ↓
scripts/seed-iran.ts            → Supabase (the database)
```

Each step builds on the previous. All intermediate JSON files live in `data/` and are not committed to git (they're pipeline artifacts). Only `data/radar-network.json` is committed because it's a curated reference file, not generated.

---

## What Gets Written to Supabase

### 1. `scenarios` table — 1 row
The top-level scenario record for "Iran 2026". Contains:
- Title, description, start date (`2026-02-17`), ground truth through date (`2026-04-05`)
- `background_context_enriched` — the full enriched research briefing (the 92KB narrative from `iran-enriched.json`)
- Links to all other data via `scenario_id`

### 2. `branches` table — 1 row
A single "main" branch for the scenario (think of it like `main` in git). All the historical turns live on this branch. Players can fork from any turn to create alternate branches.

### 3. `scenario_actors` table — 6 rows
One row per actor (nation/faction) with their full profile:
- United States, Iran, Israel, Russia, China, Gulf States
- Each has: biography, leadership profile, win condition, strategic doctrine, initial power scores, intelligence profile

### 4. `key_figures` table — ~20 rows
Named individuals within each actor (e.g. Trump, Khamenei, Netanyahu). Each has biography, motivations, decision style, and current context.

### 5. `actor_capabilities` table — ~150 rows
The pre-war military/economic/diplomatic inventory for each actor. Examples: "3,150 Tomahawk missiles", "2 carrier strike groups", "900 ballistic missiles (Iran)". These establish the starting inventory before the conflict depletes them.

### 6. `turn_commits` table — 115 rows
Each row is one historical event from the timeline (Feb 17 – Apr 5, 2026). Think of each event as a "commit" in the scenario's history. Each commit contains:
- The event narrative (`full_briefing`, `chronicle_entry`, `chronicle_headline`)
- Whether it's a decision point and what the alternatives were
- The escalation ladder position before/after
- The AI-scored state effects (how it changed each actor's military/economic/political scores)

### 7. `actor_state_snapshots` table — 115 × 6 = ~690 rows
After each of the 115 events, we record the state of all 6 actors. Each snapshot has:
- Military strength, political stability, economic health, public support, international standing (all 0–100)
- Current asset inventory (missiles remaining, aircraft, interceptors, etc.)
- Global state (oil price, Hormuz throughput, economic stress index)
- Interceptor effectiveness per sector (reduced when radars are destroyed)

### 8. `daily_depletion_rates` table — ~30 rows
Records how fast assets are being consumed during the conflict. For example:
- Iran loses ~8 ballistic missiles/day through March, dropping to ~3/day in April
- US expends ~15 Tomahawks/day during peak strike operations
These rates change at inflection points (e.g. after a major Iranian salvo is exhausted).

### 9. `threshold_triggers` table — ~10 rows
Armed tripwires that fire forced events if state crosses a threshold. Examples:
- If Iran's military strength drops below 20 → trigger "Iran signals willingness to negotiate"
- If Hormuz throughput drops below 30% → trigger "IEA emergency release"
These create dynamic branching even in the historical replay.

---

## Why We Need the Migrations First

The `scenarios` table in the live database is missing three columns that were added in a later migration:
- `background_context_enriched` (the enriched research briefing)
- `scenario_start_date`
- `ground_truth_through_date`

The `actor_state_snapshots`, `daily_depletion_rates`, and `threshold_triggers` tables don't exist yet at all.

The `turn_commits` table is also missing ~11 columns added later (chronicle fields, decision point fields, escalation ladder fields).

**The migrations add all of this.** Once applied, `seed-iran.ts` can write everything.

---

## The Two Migrations

### `20260402000000_comprehensive_seed_schema.sql`
- Creates 3 new tables: `scenario_actors`, `key_figures`, `actor_capabilities`
- Adds 11 columns to `turn_commits` (chronicle/decision/escalation fields)
- Adds 3 columns to `scenarios` (background_context_enriched, start_date, ground_truth_date)

### `20260407000000_state_tracking.sql`
- Creates 3 new tables: `actor_state_snapshots`, `daily_depletion_rates`, `threshold_triggers`
- Adds 4 columns to `turn_commits` (state_effects, decision node tracking)

All statements use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` — safe to run even if partially applied.

---

## After Migrations Are Applied

Run:
```bash
bun run scripts/seed-iran.ts
```

This drops any existing Iran scenario data and re-seeds everything fresh. Takes ~30 seconds (mostly Supabase insert latency).
