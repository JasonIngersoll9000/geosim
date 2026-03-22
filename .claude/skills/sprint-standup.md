---
name: sprint-standup
description: "Use when generating a sprint standup report showing completed, in-progress, and blocked issues with sprint health metrics"
---

## Description
Generate a sprint standup summary — what's done, in progress, and blocked.

## Steps
1. Run `gh issue list --state open --label sprint-N` to see open issues
2. Run `gh issue list --state closed --label sprint-N` to see completed issues
3. Read claude-progress.txt for latest session notes
4. Read features.json for feature completion status
5. Check `git log --oneline -20` for recent commits
6. Generate a standup report:

### Done (since last standup)
- List of closed issues with PR links

### In Progress
- List of open assigned issues with current status

### Blocked
- Any issues that can't proceed and why

### Sprint Health
- Issues completed vs total
- Features passing vs total
- Days remaining in sprint

## Constraints
- Be concise — this is a standup, not a report
- Flag any issue that hasn't had commits in 2+ days
- Flag dependencies between partners' issues
