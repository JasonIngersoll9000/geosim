# Next.js 14 Scaffolding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap a Next.js 14 App Router project with TypeScript, Tailwind, Supabase SSR clients, Vitest, and the folder structure defined in CLAUDE.md.

**Architecture:** `create-next-app` provides the framework skeleton; Supabase SSR clients live in `lib/supabase/` with separate browser (`createBrowserClient` singleton) and server (`createServerClient` using Next.js cookies) utilities; middleware.ts handles session refresh; Vitest with jsdom runs all unit tests.

**Tech Stack:** Next.js 14 (App Router), TypeScript 5 (strict), Tailwind CSS, @supabase/supabase-js, @supabase/ssr, Vitest, @testing-library/react, jsdom

---

## File Map

| File | Purpose |
|---|---|
| `package.json` | Dependencies + scripts (created by create-next-app, then modified) |
| `next.config.ts` | Next.js config |
| `tsconfig.json` | TypeScript strict config with `@/*` alias |
| `tailwind.config.ts` | Tailwind config |
| `vitest.config.ts` | Vitest with jsdom + react plugin + `@/*` alias |
| `middleware.ts` | Supabase session refresh on every request |
| `lib/supabase/client.ts` | Browser Supabase client (singleton, uses NEXT_PUBLIC_ vars) |
| `lib/supabase/server.ts` | Server Supabase client (async, uses Next.js cookies()) |
| `.env.example` | Placeholder env vars (committed) |
| `tests/lib/supabase-client.test.ts` | Tests for browser client |
| `tests/lib/supabase-server.test.ts` | Tests for server client |
| `tests/smoke.test.ts` | Vitest smoke test |

---

### Task 1: Scaffold Next.js 14

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `.eslintrc.json`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore`, `next-env.d.ts`

- [ ] **Step 1: Run create-next-app in the current directory**

```bash
echo y | npx create-next-app@latest . --app --typescript --tailwind --eslint --no-src-dir --import-alias "@/*" --no-turbopack
```

> **Note:** The `echo y |` handles the "directory contains files that could conflict" prompt non-interactively. The existing `README.md` will be overwritten (it only contained `# geosim`).

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 14 with App Router, TypeScript, Tailwind"
```

---

### Task 2: Install Supabase and Vitest dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Supabase runtime dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Install Vitest and React testing dependencies**

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom
```

- [ ] **Step 3: Add test scripts to package.json**

Open `package.json`. Replace the existing `"test"` script (if any) with:

```json
"test": "vitest",
"test:coverage": "vitest --coverage"
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add Supabase SSR and Vitest dependencies"
```

---

### Task 3: Configure Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/smoke.test.ts`

- [ ] **Step 1: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 2: Write a smoke test**

Create `tests/smoke.test.ts`:

```typescript
describe('vitest setup', () => {
  it('runs tests', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 3: Run the smoke test**

```bash
npm test -- tests/smoke.test.ts
```

Expected: `✓ tests/smoke.test.ts (1 test) ... PASS`

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts tests/smoke.test.ts
git commit -m "feat: configure Vitest with jsdom and React testing plugin"
```

---

### Task 4: Create Supabase browser client

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `tests/lib/supabase-client.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/supabase-client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({ auth: {}, from: vi.fn() })),
}))

// Import once at module scope — Vitest caches the module between tests in the
// same file, so the singleton `client` variable persists across both it() blocks.
// This is what we want: test 1 creates it, test 2 verifies it's the same object.
import * as supabaseClient from '@/lib/supabase/client'

describe('createClient (browser)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
  })

  it('creates a supabase client', () => {
    const client = supabaseClient.createClient()
    expect(client).toBeDefined()
    expect(client).toHaveProperty('auth')
  })

  it('returns the same instance on repeated calls (singleton)', () => {
    const a = supabaseClient.createClient()
    const b = supabaseClient.createClient()
    expect(a).toBe(b)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/lib/supabase-client.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/supabase/client'`

- [ ] **Step 3: Implement the browser client**

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) return client
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return client
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/lib/supabase-client.test.ts
```

Expected: `✓ tests/lib/supabase-client.test.ts (2 tests) ... PASS`

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/client.ts tests/lib/supabase-client.test.ts
git commit -m "feat: add Supabase browser client with singleton pattern"
```

---

### Task 5: Create Supabase server client

**Files:**
- Create: `lib/supabase/server.ts`
- Create: `tests/lib/supabase-server.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/supabase-server.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ auth: {}, from: vi.fn() })),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: vi.fn(() => []),
      set: vi.fn(),
    })
  ),
}))

import { createClient } from '@/lib/supabase/server'

describe('createClient (server)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
  })

  it('creates a server-side supabase client', async () => {
    const client = await createClient()
    expect(client).toBeDefined()
    expect(client).toHaveProperty('auth')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/lib/supabase-server.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/supabase/server'`

- [ ] **Step 3: Implement the server client**

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Called from a Server Component — mutations handled by middleware
          }
        },
      },
    }
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/lib/supabase-server.test.ts
```

Expected: `✓ tests/lib/supabase-server.test.ts (1 test) ... PASS`

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/server.ts tests/lib/supabase-server.test.ts
git commit -m "feat: add Supabase server client for Next.js App Router"
```

---

### Task 6: Create Supabase middleware

**Files:**
- Create: `middleware.ts`
- Create: `tests/middleware.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/middleware.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } })

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

describe('middleware', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
    mockGetUser.mockClear()
  })

  it('calls supabase.auth.getUser to refresh the session', async () => {
    const { middleware } = await import('@/middleware')
    const request = new NextRequest('http://localhost:3000/dashboard')
    await middleware(request)
    expect(mockGetUser).toHaveBeenCalledOnce()
  })

  it('returns a NextResponse', async () => {
    const { middleware } = await import('@/middleware')
    const request = new NextRequest('http://localhost:3000/')
    const response = await middleware(request)
    expect(response).toBeDefined()
    expect(response.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/middleware.test.ts
```

Expected: FAIL — `Cannot find module '@/middleware'`

- [ ] **Step 3: Create middleware.ts at project root**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — must not be removed
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/middleware.test.ts
```

Expected: `✓ tests/middleware.test.ts (2 tests) ... PASS`

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add middleware.ts tests/middleware.test.ts
git commit -m "feat: add Supabase middleware for session token refresh"
```

---

### Task 7: Create .env.example

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create .env.example**

```bash
# GeoSim Environment Variables
# Copy to .env.local and fill in your values

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-your-key

# Mapbox (add when installing Mapbox GL)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-mapbox-token

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 2: Verify .env.local is gitignored**

```bash
grep "\.env\.local" .gitignore
```

Expected: `.env.local` appears in the output

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "feat: add .env.example with placeholder values"
```

---

### Task 8: Create folder structure stubs

**Files:**
- Create: `.gitkeep` files in all directories from CLAUDE.md

- [ ] **Step 1: Create all directory stubs**

```bash
mkdir -p \
  app/api/ai \
  app/api/scenarios \
  app/api/branches \
  app/auth/login \
  app/auth/signup \
  app/scenarios/new \
  app/chronicle \
  app/admin \
  components/ui \
  components/game \
  components/map \
  components/providers \
  lib/types \
  lib/game \
  lib/ai \
  hooks \
  tests/lib \
  tests/game \
  tests/api \
  tests/ai \
  tests/components \
  tests/e2e \
  tests/mocks

touch \
  app/api/ai/.gitkeep \
  app/api/scenarios/.gitkeep \
  app/api/branches/.gitkeep \
  app/auth/login/.gitkeep \
  app/auth/signup/.gitkeep \
  app/scenarios/new/.gitkeep \
  app/chronicle/.gitkeep \
  app/admin/.gitkeep \
  components/ui/.gitkeep \
  components/game/.gitkeep \
  components/map/.gitkeep \
  components/providers/.gitkeep \
  lib/types/.gitkeep \
  lib/game/.gitkeep \
  lib/ai/.gitkeep \
  hooks/.gitkeep \
  tests/lib/.gitkeep \
  tests/game/.gitkeep \
  tests/api/.gitkeep \
  tests/ai/.gitkeep \
  tests/components/.gitkeep \
  tests/e2e/.gitkeep \
  tests/mocks/.gitkeep
```

- [ ] **Step 2: Run all tests to confirm nothing broken**

```bash
npm test
```

Expected: all tests pass (smoke=1, browser client=2, server client=1, middleware=2 = 6 tests total)

- [ ] **Step 3: Final typecheck and lint**

```bash
npm run typecheck && npm run lint
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: create folder structure stubs from CLAUDE.md architecture"
```
