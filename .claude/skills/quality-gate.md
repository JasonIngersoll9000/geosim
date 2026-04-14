---
name: quality-gate
description: "Use when auditing project quality across tests, types, linting, security, and CI/CD — produces read-only report"
---

## Description
Full quality audit across all dimensions. Read-only — reports gaps but does NOT fix them.
Adapted from PlonGuo/claude-dev-setup quality-gate pattern.

## Steps
1. DETECT STACK: Read package.json, tsconfig.json, and project config to confirm stack
2. TEST COVERAGE: Run `npm test -- --coverage` if available. Report:
   - Total test count and pass rate
   - Coverage percentage (lines, branches, functions)
   - Files with zero test coverage
   - Features in features.json marked as passes:false that should have tests
3. LINTING: Run `npm run lint`. Count errors vs warnings. Note any disabled rules.
4. TYPE CHECKING: Run `npm run typecheck`. Count type errors. Flag any `any` types.
5. SECURITY: Run `npm audit`. Count vulnerabilities by severity. Check for gitleaks.
6. CI/CD: Check .github/workflows/ exists. Verify it runs: lint, typecheck, test, audit.
   Flag missing stages.
7. BUILD: Run `npm run build`. Report success/failure and any warnings.
8. Write full report to docs/quality-gate-report.md with:
   - Date and commit hash
   - Score per dimension (pass/warning/fail)
   - Specific gaps with file paths
   - Prioritized action items

## Constraints
- READ-ONLY: do NOT fix anything. Only report.
- Be specific: "tests/game/branching.test.ts has 0 tests" not "testing is incomplete"
- Run /quality-fix after reviewing the report to implement approved fixes
