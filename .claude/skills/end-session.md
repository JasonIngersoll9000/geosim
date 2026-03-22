---
name: end-session
description: "Use when ending a Claude Code session to commit changes, update progress notes, and push to remote"
---

## Description
Run at the end of every Claude Code session to save state.

## Steps
1. Run `bun run test -- --run` — if tests fail, fix before proceeding
2. Run `bun run lint` — fix any lint errors
3. Stage and commit all changes with a descriptive conventional commit message
4. Update claude-progress.txt with:
   - What was completed this session
   - What's in progress (partially done work)
   - Any blockers or known bugs
   - Architecture decisions made this session
   - What should be worked on next
5. Update features.json — mark any completed features as passes: true
6. Push to remote: `git push`