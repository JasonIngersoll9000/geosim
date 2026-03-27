# HW4: Claude Code Workflow & TDD

**Due:** Monday by 2:59am  
**Points:** 50  
**Submitting:** A website URL or a file upload  
*Please complete this in pairs*

---

## Objective

Demonstrate mastery of the Claude Code development workflow by setting up a project, using the Explore→Plan→Implement→Commit pattern, and doing TDD through Claude Code.

---

## Part 1: Claude Code Project Setup (25%)

Set up Claude Code for your P3 project:

- Write a comprehensive CLAUDE.md (project context, stack, conventions, do's/don'ts)
- Configure permissions (allowlists or sandboxing)
- Demonstrate `/init` output and iterate on CLAUDE.md based on it
- Show context management strategy (`/clear`, `/compact`, `--continue`)

**Requirements:** CLAUDE.md must include: tech stack, architecture decisions, coding conventions, testing strategy, and project-specific do's/don'ts. At least one `@import` reference to additional context (e.g., PRD, API docs).

---

## Part 2: Explore → Plan → Implement → Commit (30%)

Use Claude Code's recommended 4-phase workflow on a real P3 feature:

- **Explore:** Use Glob, Grep, Read to understand existing code
- **Plan:** Use Plan mode to design the approach
- **Implement:** Execute the plan with Claude Code
- **Commit:** Create clean commits with meaningful messages

**Requirements:** Git history must clearly show this workflow. At least 3 commits demonstrating the pattern.

---

## Part 3: TDD with Claude Code (30%)

Build a P3 feature using strict TDD through Claude Code:

1. Write failing tests first
2. Have Claude Code implement minimum code to pass
3. Refactor
4. Repeat for all acceptance criteria

**Requirements:** Tests written BEFORE implementation. Git history shows red-green-refactor commits. Clear commit messages showing TDD process.

---

## Part 4: Reflection (15%)

Write a 1–2 page reflection answering:

- How does the Explore→Plan→Implement→Commit workflow compare to your previous approach?
- What context management strategies worked best?
- Include annotated Claude Code session log showing your workflow

---

## Deliverables

1. P3 repository with CLAUDE.md and permissions configuration
2. Feature code with TDD git history (red-green-refactor commits)
3. Annotated Claude Code session log
4. Reflection document (1–2 pages)

---

## Rubric (50 points)

| Criterion | Weight |
|---|---|
| CLAUDE.md & project setup | 25% (12.5 pts) |
| Explore→Plan→Implement→Commit workflow | 30% (15 pts) |
| TDD process through Claude Code | 30% (15 pts) |
| Reflection & session log | 15% (7.5 pts) |

### CLAUDE.md & Project Setup (12.5 pts)

| Excellent (12.5) | Good (9.5) | Adequate (6.25) | Needs Improvement (3) | No Marks (0) |
|---|---|---|---|---|

### Explore→Plan→Implement→Commit Workflow (15 pts)

| Excellent (15) | Good (11.25) | Adequate (7.5) | Needs Improvement (3.75) | No Marks (0) |
|---|---|---|---|---|

### TDD Process through Claude Code (15 pts)

| Excellent (15) | Good (11.25) | Adequate (7.5) | Needs Improvement (3.75) | No Marks (0) |
|---|---|---|---|---|

### Reflection & Session Log (7.5 pts)

| Excellent (7.5) | Good (5.625) | Adequate (3.75) | Needs Improvement (1.875) | No Marks (0) |
|---|---|---|---|---|