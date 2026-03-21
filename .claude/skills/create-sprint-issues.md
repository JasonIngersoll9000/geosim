---
name: create-sprint-issues
disable-model-invocation: true
---

## Description
Batch-create GitHub issues for a sprint from the scrum issues document.

## Steps
1. Read docs/scrum-issues.md to get the issue definitions
2. Ask which sprint to create issues for (1, 2, or 3)
3. For each issue in that sprint, create it via gh CLI:
   ```
   gh issue create \
     --title "TITLE" \
     --body "BODY" \
     --label "LABELS" \
     --assignee "ASSIGNEE" \
     --milestone "MILESTONE"
   ```
4. Report all created issue numbers

## Constraints
- Create milestones first if they don't exist
- Create labels first if they don't exist
- Verify each issue was created successfully
- Do NOT create duplicate issues (check existing first)
