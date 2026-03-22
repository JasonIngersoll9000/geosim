---
name: security-audit
description: "Use when running a full security review covering secrets, OWASP Top 10, dependencies, and Supabase RLS policies"
---

## Description
Run the full security pipeline (OWASP Top 10, secrets, dependencies).

## Steps
1. Run gitleaks to check for secrets: `gitleaks detect`
2. Run npm audit: `npm audit --audit-level=high`
3. Check all API routes for input validation and parameterized queries
4. Verify ANTHROPIC_API_KEY never appears in client-side code
5. Verify Supabase RLS policies are active on all tables
6. Check for XSS vectors in any user-facing inputs
7. Verify auth middleware on all protected routes
8. Generate SBOM: `npx @cyclonedx/cyclonedx-npm --output-file sbom.json`
9. Report all findings with severity ratings (HIGH/MED/LOW)

## Constraints
- Do NOT auto-fix — report for human review
- Flag any new dependencies added since last audit
