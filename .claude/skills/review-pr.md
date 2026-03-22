---
name: review-pr
description: "Use when reviewing a partner pull request using the C.L.E.A.R. framework before approving or requesting changes"
---

## Description
Review a partner's pull request using the C.L.E.A.R. framework.

## Steps
1. Ask for the PR number or run `gh pr list` to show open PRs
2. Fetch the PR: `gh pr view NUMBER`
3. Fetch the diff: `gh pr diff NUMBER`
4. Review using C.L.E.A.R.:
   - **Context**: Does this fit the project architecture and CLAUDE.md conventions?
   - **Logic**: Is the business logic correct? Edge cases handled?
   - **Evidence**: Are there tests? Do they verify behavior, not just pass?
   - **Architecture**: Does it follow established patterns? Unnecessary deps?
   - **Risk**: Security issues? API keys exposed? Fog-of-war leaks? Neutrality violations?
5. Check that the acceptance criteria from the linked issue are all met
6. Post review as a PR comment: `gh pr review NUMBER --comment --body "REVIEW"`
7. If issues found, request changes: `gh pr review NUMBER --request-changes --body "REVIEW"`
8. If all good, approve: `gh pr review NUMBER --approve --body "REVIEW"`

## Constraints
- Always check for fog-of-war information leaks
- Always check for neutrality principle violations in AI prompts
- Always verify tests exist for new logic
- Be specific: reference file:line, not vague complaints
