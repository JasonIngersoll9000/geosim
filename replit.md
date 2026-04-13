# GeoSim on Replit

GeoSim is an AI-powered strategic simulation engine that models competitive dynamics between actors (nations, organizations, political factions) through an interactive decision-making loop with branching scenario trees.

## Tech Stack

- **Next.js 14** (App Router), TypeScript 5, React 18
- **Tailwind CSS** for styling
- **Supabase** (PostgreSQL + Auth + Realtime) for database and authentication
- **Mapbox GL JS** for map visualization
- **Anthropic Claude** (via SDK) for AI agents
- **Bun** as package manager and runtime

## Project Structure

- `app/` — Next.js App Router pages and API routes
- `app/api/ai/` — AI agent endpoints (actor, resolution, judge, narrator)
- `app/api/scenarios/` — Scenario CRUD + research pipeline
- `app/api/branches/` — Branch management + game loop
- `components/` — React components (ui/, game/, map/, providers/)
- `lib/` — Business logic, types, utilities
- `lib/types/` — TypeScript types
- `lib/game/` — Game loop, fog of war, escalation logic
- `lib/ai/` — Prompt construction, API wrappers with prompt caching
- `hooks/` — Custom React hooks
- `supabase/migrations/` — Database migrations
- `tests/` — Unit and E2E tests

## Running the App

The app runs on port 5000. Use `bun run dev` to start the dev server.

Always use `bun` (not npm/npx) for all package management and script execution.

## Required Environment Variables

Set these as secrets in Replit:

- `NEXT_PUBLIC_SUPABASE_URL` — Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-side only)
- `ANTHROPIC_API_KEY` — Anthropic API key for Claude AI
- `NEXT_PUBLIC_MAPBOX_TOKEN` — Mapbox public token for map rendering
- `NEXT_PUBLIC_APP_URL` — The public URL of this Replit app

## Data Layer Architecture

### RLS / Server-Side Access
All Supabase queries must go through server-side API routes (`createClient()` from `lib/supabase/server`). Browser client returns empty arrays for `branches` and `turn_commits` due to RLS.

### Nested PostgREST Joins
PostgREST nested join syntax (e.g. `turn_commits(turn_number)`) does **not** reliably return data even from server-side routes. Always use a **separate** `.from('turn_commits').select(...).in('branch_id', ids)` query instead.

### Performance Constraint
`turn_commits.full_briefing` is 10–15 KB per row. **Never SELECT it in list endpoints.** Only fetch individually if needed (e.g. for a single turn detail view).

### chronicle_headline in Branches API
`/api/branches` GET returns `chronicle_headline` alongside `turn_number` and `simulated_date` in each turn_commit object. This enables the landing page Intel Package to show live headline data.

### Scenarios API lastActiveDate
`/api/scenarios` GET now returns `lastActiveDate` (the `simulated_date` of the latest trunk commit) for each scenario, enabling the scenario browser to show a real date instead of a turn number.

## Replit Configuration Notes

- Dev and start scripts are configured with `-p 5000 -H 0.0.0.0` for Replit compatibility
- Package manager: bun (detected from bun.lock)
- Workflow: "Start application" runs `bun run dev`

## Data Fetching Architecture

All pages that read `branches` and `turn_commits` must use **server-side API routes** (not the browser Supabase client) because those tables have RLS that blocks the anon key.

| Table | Browser client | Server route |
|-------|---------------|-------------|
| `branches` | ❌ RLS blocks | ✅ `/api/branches?scenarioId=` |
| `turn_commits` | ❌ RLS blocks | ✅ `/api/chronicle/[branchId]` |
| `scenario_actors` | ✅ works | — |
| `scenarios` | ✅ works | — |

**Performance note**: `full_briefing` column on `turn_commits` can be 10–15 KB per row. Never select it in list endpoints; only select it when displaying a single turn's detailed briefing.

## Active API Routes (server-side, bypass RLS)

- `GET /api/branches?scenarioId=` — branches + actors for a scenario
- `GET /api/chronicle/[branchId]` — turn_commits for a branch (no `full_briefing`)
- `GET /api/scenarios` — enriched scenario list (actorCount, turnNumber, isActive)
- `GET /api/scenarios/[id]` — single scenario detail

## GitHub Workflow Rules

- **Never push directly to `main`** — always push to a named feature branch.
- Naming convention: `feat/<short-description>` (e.g. `feat/scenario-browser-polish`)
- Each task or logical batch of work gets its own branch; open a PR on GitHub for review before merging.
- Git remote is authenticated via the `GITHUB_TOKEN` secret.
