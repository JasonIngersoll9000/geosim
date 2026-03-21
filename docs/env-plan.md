# GeoSim Environment & Secrets Plan

## Environment Variables

### Required in all environments

```bash
# ── Supabase ──────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...        # public, safe for client
SUPABASE_SERVICE_ROLE_KEY=eyJhb...             # SECRET — server-side only, bypasses RLS

# ── Anthropic ─────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...                   # SECRET — server-side only

# ── Mapbox ────────────────────────────────────────────
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...             # public token, restricted by domain

# ── App ───────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000       # used for redirects, OG tags
```

### Environment-specific overrides

```bash
# ── Development ───────────────────────────────────────
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Use Supabase local development instance or dev project

# ── Staging (Vercel preview deployments) ──────────────
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://geosim-staging.vercel.app
# Separate Supabase project for staging
# Same Anthropic key (or separate with lower rate limits)

# ── Production ────────────────────────────────────────
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://geosim.app
# Production Supabase project
# Production Anthropic key
```

### Optional / future

```bash
# ── Monitoring ────────────────────────────────────────
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx      # error tracking
SENTRY_AUTH_TOKEN=sntrys_...                   # for source maps upload

# ── Analytics ─────────────────────────────────────────
# Vercel Analytics is automatic, no env var needed

# ── Rate Limiting (if needed) ─────────────────────────
UPSTASH_REDIS_URL=https://xxxxx.upstash.io     # for API rate limiting
UPSTASH_REDIS_TOKEN=AXxx...
```

## Secrets Management

### Where secrets live

| Secret | Local dev | Vercel staging | Vercel production |
|---|---|---|---|
| SUPABASE_SERVICE_ROLE_KEY | `.env.local` | Vercel env vars | Vercel env vars |
| ANTHROPIC_API_KEY | `.env.local` | Vercel env vars | Vercel env vars |
| SENTRY_AUTH_TOKEN | `.env.local` | Vercel env vars | Vercel env vars |

### Rules

1. **Never commit secrets.** `.env.local` is in `.gitignore`. Always.
2. **`NEXT_PUBLIC_` prefix** = safe for client bundle. Everything else is server-only.
3. **Supabase anon key** is public by design — RLS policies protect data.
4. **Supabase service role key** bypasses RLS — only use in server-side API routes for admin operations.
5. **Anthropic API key** is only used in `/api/ai/*` routes. Never expose to client.
6. **Mapbox token** is public but should be restricted to your domains in the Mapbox dashboard.

### .env.local template

```bash
# Copy this to .env.local and fill in values
# NEVER commit this file

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### .env.example (committed to repo)

```bash
# GeoSim Environment Variables
# Copy to .env.local and fill in your values

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

ANTHROPIC_API_KEY=sk-ant-your-key

NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-mapbox-token

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Supabase Project Setup

### Local development

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize (in project root)
supabase init

# Start local instance
supabase start
# This gives you local URL + anon key + service role key

# Apply migrations
supabase db push
```

### Migrations strategy

```
supabase/
├── migrations/
│   ├── 20260318000000_initial_schema.sql    ← tables, enums, RLS
│   ├── 20260318000001_indexes.sql           ← indexes
│   ├── 20260318000002_functions.sql         ← triggers, functions
│   └── ...
└── seed.sql                                  ← optional dev seed data
```

Migrations are created with `supabase migration new <name>` and applied
with `supabase db push` (local) or through the Supabase dashboard (staging/prod).

## Vercel Configuration

### vercel.json (if needed)

```json
{
  "buildCommand": "next build",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

### Environment variable setup

1. Go to Vercel project settings → Environment Variables
2. Add each secret variable for the appropriate environments
3. Mark `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` as "Sensitive"
4. Set `NEXT_PUBLIC_APP_URL` per environment (staging vs production URL)

### Preview deployments

Every PR gets a preview deployment automatically. These use the "Preview"
environment variables in Vercel, which should point to the staging Supabase
project.

## API Key Budget Considerations

### Anthropic API costs (estimated per turn)

| Call | Model | Est. tokens | Est. cost |
|---|---|---|---|
| Actor agent (×6 actors) | Sonnet | ~4k each = 24k | ~$0.18 |
| Resolution engine | Sonnet | ~8k | ~$0.06 |
| Judge evaluator | Sonnet | ~4k | ~$0.03 |
| Narrator | Sonnet | ~3k | ~$0.02 |
| Decision analysis (on demand) | Sonnet | ~4k | ~$0.03 |
| **Total per turn** | | **~43k** | **~$0.32** |

A 12-turn game = ~$3.84 in API costs.
Research pipeline (all 7 stages with search) = ~$2-5 per scenario.

### Monthly budget estimate

| Usage level | Turns/month | Research/month | Est. cost |
|---|---|---|---|
| Development (just you two) | ~200 | ~10 | ~$115 |
| Class demo + grading | ~500 | ~20 | ~$260 |
| Post-class with community | ~5,000 | ~200 | ~$2,600 |

**Recommendation:** Start with Sonnet for all agents. If quality on
actor agents is insufficient, upgrade the resolution engine and judge
to Opus selectively (~4x cost increase on those calls only).
