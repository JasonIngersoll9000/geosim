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

## Replit Configuration Notes

- Dev and start scripts are configured with `-p 5000 -H 0.0.0.0` for Replit compatibility
- Package manager: bun (detected from bun.lock)
- Workflow: "Start application" runs `bun run dev`

## GitHub Workflow Rules

- **Never push directly to `main`** — always push to a named feature branch.
- Naming convention: `feat/<short-description>` (e.g. `feat/scenario-browser-polish`)
- Each task or logical batch of work gets its own branch; open a PR on GitHub for review before merging.
- Git remote is authenticated via the `GITHUB_TOKEN` secret.
