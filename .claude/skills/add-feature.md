---
name: add-feature
description: "Use when implementing any new feature or bugfix, before writing any implementation code"
---

## Description
Add a new feature using strict TDD and the Explore → Plan → Implement → Commit workflow.

## Steps
1. Read the feature description from the user
2. Explore relevant code using Glob, Grep, and Read
3. Write failing tests FIRST (the spec — user defines what correctness means)
4. Commit the failing tests: `git commit -m "test: add failing tests for [feature]"`
5. Implement minimum code to make tests pass
6. Commit: `git commit -m "feat: implement [feature] (passes tests)"`
7. Refactor for clarity without changing behavior
8. Commit: `git commit -m "refactor: clean up [feature]"`
9. Run the FULL test suite to verify nothing else broke
10. Update features.json — mark feature as passes: true

## Constraints
- ALWAYS write tests BEFORE implementation (TDD)
- Git history MUST show red-green-refactor pattern
- Follow all conventions in CLAUDE.md
- Never modify unrelated files
