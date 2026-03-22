---
name: pick-issue
description: "Use when selecting a GitHub issue from the sprint board to begin end-to-end implementation on a branch"
---

## Description
Pick up a GitHub issue from the sprint board and work on it end-to-end.

## Steps
1. Run `gh issue list --assignee @me --label sprint-N --state open` (where N is current sprint)
2. If no issues assigned, show all open sprint issues: `gh issue list --label sprint-N --state open`
3. Display the issue list and ask which issue to work on
4. Once selected, read the full issue: `gh issue view NUMBER`
5. Create a feature branch: `git checkout -b issue-NUMBER-short-description`
6. Read the acceptance criteria carefully
7. If the issue has a `game-logic` label, use /add-feature workflow (TDD)
8. If the issue has a `frontend` label:
   - Read `docs/frontend-design.md` before planning
   - Confirm the component plan follows the signature elements and avoids the anti-patterns list
   - Then use (plan) mode for multi-file work
9. If the issue has an `infrastructure` label, use (plan) mode
10. Work through all acceptance criteria, checking each off
11. Run full test suite: `bun run test -- --run`
12. Run lint: `bun run lint`
13. Commit with conventional message referencing the issue: `git commit -m "feat: description (#NUMBER)"`
14. Push branch: `git push -u origin issue-NUMBER-short-description`
15. Create PR: `gh pr create --title "feat: description" --body "Closes #NUMBER\n\n## Changes\n- ..."`
16. Update features.json if any features were completed
17. Update claude-progress.txt

## Constraints
- One issue per session (focus)
- Branch name must reference issue number
- All acceptance criteria must be met before PR
- PR must reference the issue number (Closes #N)
- Run tests before pushing