---
name: start-session
disable-model-invocation: true
---

## Description
Run at the start of every Claude Code session to get up to speed.

## Steps
1. Run `pwd` to confirm working directory
2. Read claude-progress.txt to see what happened last session
3. Read features.json to see what's done and what's next
4. Run `git log --oneline -20` to see recent commits
5. Run `npm test` to verify nothing is broken
6. Run `npm run build` to verify the project compiles
7. If tests or build fail, fix them BEFORE starting new work
8. Summarize current state and ask what to work on next