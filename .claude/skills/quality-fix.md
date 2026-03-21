---
name: quality-fix
disable-model-invocation: true
---

## Description
Implement fixes for gaps identified in the quality gate report.

## Prerequisites
- docs/quality-gate-report.md must exist (run /quality-gate first)

## Steps
1. Read docs/quality-gate-report.md
2. If report is older than 7 days, suggest re-running /quality-gate first
3. STEP 1 — Config fixes: Fix linting configs, tsconfig issues, test configs.
   Run verification after each fix. Commit: "fix: quality gate config fixes"
4. STEP 2 — Dependency fixes (REQUIRES CONFIRMATION): Run npm audit fix.
   Show what will change. Wait for user approval. Commit: "fix: dependency updates"
5. STEP 3 — CI fixes (REQUIRES CONFIRMATION): Add missing CI pipeline stages.
   Show the workflow changes. Wait for user approval. Commit: "ci: add missing pipeline stages"
6. Do NOT fix test coverage gaps here — those should go through /add-feature with TDD
7. Update docs/quality-gate-report.md with what was fixed

## Constraints
- Three gated steps — config, then deps (confirm), then CI (confirm)
- Verify after EACH fix — run the tool immediately, stop on failure
- Never fix test gaps by writing tests — that's a /add-feature task
