---
name: quality-gate
description: "Use when auditing project quality across tests, types, linting, security, and CI/CD — produces read-only report"
---

## Description
Full quality audit across all dimensions. Read-only — reports gaps but does NOT fix them.

> **v2 — WSL2 + context-mode aware.** Uses `bun` (not npm/npx) for all commands.
> Pipes large outputs through ctx_execute to protect the context window.

## Steps

1. **DETECT STACK** — Read `package.json` and `tsconfig.json` to confirm stack and
   available scripts. Note the `bun` runtime requirement (WSL2 environment).

2. **TEST COVERAGE** — Run via ctx_execute to sandbox output:
   ```
   bun run test -- --run --reporter=verbose
   ```
   Report:
   - Total test count and pass/fail counts
   - Files with zero coverage (cross-reference `lib/game/`, `lib/ai/`, `app/api/`)
   - Features in `features.json` marked `passes:false` that need tests
   - Any test that imports `any`-typed mocks

3. **LINTING** — Run and capture output in ctx_execute:
   ```
   bun run lint
   ```
   Count errors vs warnings. Flag disabled rules (`// eslint-disable`). Note any
   `react/jsx-no-comment-textnodes` or `no-unused-vars` suppressions.

4. **TYPE CHECKING** — Run:
   ```
   bun run typecheck
   ```
   Count type errors. Flag any `as any` casts or `@ts-ignore` comments.

5. **SECURITY** — Run:
   ```
   bun audit
   ```
   Count vulnerabilities by severity. Also scan for hardcoded secrets:
   - Grep for `ANTHROPIC_API_KEY`, `SERVICE_ROLE_KEY` in non-env files
   - Check that `.env.local` is in `.gitignore`

6. **NEUTRALITY CHECK** (GeoSim-specific) — Grep `lib/ai/` and `docs/prompt-library.ts`
   for actor-specific favoritism: any prompt that names one actor as "aggressor",
   "defender", "good", "evil", etc. without equal treatment. Flag violations.

7. **CI/CD** — Check `.github/workflows/` exists. Verify the pipeline runs:
   lint → typecheck → test → build. Flag any missing stages or `--no-verify` bypasses.

8. **BUILD** — Run:
   ```
   bun run build
   ```
   Report success/failure. Note any `Module not found` or peer dependency warnings.

9. **WRITE REPORT** — Save to `docs/quality-gate-report.md` with:
   - Date and current commit hash (`git rev-parse --short HEAD`)
   - Score per dimension: PASS / WARN / FAIL
   - Specific gaps with exact file paths and line numbers
   - Prioritized action items (P1 = blocks merge, P2 = tech debt, P3 = nice-to-have)

## Constraints
- READ-ONLY: do NOT fix anything. Only report.
- Use ctx_execute for any command that produces >20 lines of output.
- Be specific: "tests/game/branching.test.ts has 0 tests" not "testing is incomplete".
- After reviewing the report, run /quality-fix to implement approved fixes.
