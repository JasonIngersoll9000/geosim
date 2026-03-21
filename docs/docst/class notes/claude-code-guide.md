# Claude Code: Practical Step-by-Step Guide

A reorganized, actionable guide for getting maximum value from Claude Code on any project. Distilled from Anthropic's documentation, course materials, and best practices.

---

## Phase 0: Install & First Launch

```bash
# Install
curl -fsSL https://claude.ai/install.sh | bash
# OR: npm install -g @anthropic-ai/claude-code

# Verify
claude --version

# Navigate to your project and start
cd ~/your-project
claude
```

On startup, Claude Code scans your project, reads any `CLAUDE.md` files, and presents a prompt. It's not a chatbot — it's an agent that reads files, runs commands, and takes action autonomously.

---

## Phase 1: Project Setup (Do This First, Every Project)

### 1.1 Write your CLAUDE.md

This is the most important file in your project for Claude Code. It reads it every session. Without it, the agent starts with zero context every time.

**What to include (keep under 200 lines):**

```markdown
# CLAUDE.md

## Project overview
One paragraph describing what this project does and why.

## Tech stack
- Framework, language, versions
- Database, ORM
- Testing framework
- Deployment target

## Build & run commands
npm run dev       # Start dev server
npm test          # Run tests
npm run lint      # Lint check
npm run build     # Production build

## Architecture
- Brief description of folder structure
- Key architectural patterns (e.g., API routes as service layer)

## Conventions
- Naming conventions, file organization rules
- TypeScript strict mode, no `any`
- Test files live next to source files

## Do NOT
- Hard rules that must never be broken
- e.g., "Never commit API keys", "Never modify migrations without review"

## Reference docs
@docs/prd.md
@docs/data-model.ts
@docs/api-routes.md
```

**The `@import` pattern** lets you reference other files without duplicating them. Claude Code reads them on demand. The HW4 rubric explicitly requires at least one `@import`.

**What NOT to include:** entire codebases (Claude reads files itself), secrets, long tutorials, overly specific instructions that only apply to one task.

### 1.2 Run /init and iterate

```bash
claude
> /init
```

Claude Code scans your project and generates a starting `CLAUDE.md`. Always review and edit the output — it's a starting point. Compare it against what you wrote manually, merge the best of both.

### 1.3 Configure permissions

Start restrictive, widen as trust builds:

```json
// .claude/settings.json
{
  "permissions": {
    "allow": [
      "Read",
      "Glob",
      "Grep",
      "Bash(npm test)",
      "Bash(npm run lint)",
      "Bash(git status)",
      "Bash(git diff)"
    ]
  }
}
```

Add write permissions after you're comfortable reviewing changes. For sandboxed environments, you can use YOLO mode (`claude --sandbox`).

---

## Phase 2: The Core Workflow — Explore → Plan → Implement → Commit

This is Anthropic's recommended pattern for every feature. Each phase produces a reviewable checkpoint.

### 2.1 Explore

Goal: understand before changing.

```
> Explore the authentication system. What middleware is used?
> How are sessions managed? Where are the route guards?
```

Claude Code reads files, greps patterns, traces dependencies. You get a mental model without writing code. For complex tasks, save findings:

```
> Write your findings to docs/auth-analysis.md
> /clear
```

### 2.2 Plan

Goal: design the solution before writing code.

```
> (plan) Add OAuth2 login with Google. The app currently
> uses session-based auth with express-session.
```

Type `(plan)` before your prompt or press `Shift+Tab` to enter plan mode. Claude Code reads relevant files, proposes a step-by-step plan, and waits for your approval. Review and redirect if needed — this is cheaper than fixing code later.

**Rule of thumb: if the task touches more than 3 files, use plan mode.**

### 2.3 Implement

After approving the plan, Claude Code creates/modifies files, installs dependencies, runs tests, and fixes issues. Your role is to monitor and intervene when needed.

```
> Wait — use passport-google-oauth20, not the deprecated package
```

### 2.4 Commit

```
> Create a commit for the Google OAuth integration
> Push this branch and create a PR with a description
```

Claude Code stages files, writes descriptive commit messages, and can create PRs via the `gh` CLI.

---

## Phase 3: TDD Through Claude Code

TDD is what Anthropic calls "the single highest-leverage thing" for AI-assisted development. Tests are the specification — Claude Code writes code to meet the spec.

### The cycle

1. **YOU** write the failing test (the spec)
2. Commit: `git commit -m "test: add failing tests for [feature]"`
3. **Claude Code** implements the code to pass
4. Commit: `git commit -m "feat: implement [feature] (passes tests)"`
5. Refactor (either you or Claude Code)
6. Commit: `git commit -m "refactor: clean up [feature]"`

### Example prompt sequence

```
# Step 1: You write the test
> Here are failing tests in tests/game/fog-of-war.test.ts.
> Implement buildFogOfWarContext to make them pass.
> Do not modify the tests.

# Step 2: After it passes
> Refactor the implementation. Extract helper functions.
> Tests must still pass.
```

### Git history should look like

```
abc1234  test: add failing tests for fog-of-war filtering
def5678  feat: implement buildFogOfWarContext (passes tests)
ghi9012  refactor: extract actorWouldKnowAbout helper
```

The HW4 rubric requires this red-green-refactor pattern to be visible in git history.

---

## Phase 4: Context Management

Claude Code has a ~200K token context window. Manage it actively.

### Key commands

| Command | When to use |
|---|---|
| `/clear` | Switching to a completely different task |
| `/compact` | Mid-task when context is getting full |
| `/rewind` | Claude Code made a bad edit or went wrong |
| `/context` | Check current token usage |
| `--continue` | Resume your last session |
| `--resume` | Browse and pick from past sessions |

### The Document-then-Implement pattern (for large tasks)

```
Phase 1: > Explore the auth system and summarize findings
         > Write your findings to docs/auth-analysis.md
         > /clear

Phase 2: > Read docs/auth-analysis.md and plan the refactoring
         > /clear

Phase 3: > Read docs/auth-analysis.md and implement the plan
```

Findings persist in files, not in context. This lets you tackle tasks larger than the context window.

### Model switching

```
> /model sonnet    # Daily coding (default, most cost-effective)
> /model opus      # Complex architecture, multi-file refactoring
> /model haiku     # Quick lookups, fast iteration
```

Use Sonnet by default. Switch to Opus only for tasks requiring deep reasoning.

---

## Phase 5: Skills (Custom Slash Commands)

Skills are markdown files in `.claude/skills/` that define reusable workflows.

### Creating a skill

```markdown
# .claude/skills/add-feature.md

---
name: add-feature
---

## Description
Add a new feature using the full Explore → Plan → Implement → Commit workflow.

## Steps
1. Read the feature description from the user
2. Explore the relevant codebase area using Glob and Read
3. Write failing tests first (TDD)
4. Implement minimum code to pass tests
5. Refactor
6. Create a commit with a descriptive message
7. Run the full test suite to verify nothing broke

## Constraints
- Always write tests BEFORE implementation
- Follow project conventions in CLAUDE.md
- Never modify unrelated files
- Commit messages follow conventional commits format
```

**Usage:** Type `/add-feature` in Claude Code, or Claude may auto-match your prompt to the skill.

**For HW5:** You need to show v1 → v2 iteration. Create v1 of your skill, test it on 2 real tasks, identify what went wrong, create v2 with improvements, and document the changes.

### Skill vs. CLAUDE.md

If Claude should always know it → `CLAUDE.md`. If it's a specific workflow triggered on demand → skill.

---

## Phase 6: Hooks (Deterministic Automation)

Hooks run before/after Claude Code tool calls. Unlike CLAUDE.md rules (advisory), hooks are enforced 100% of the time.

```json
// .claude/settings.json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "command": "npx prettier --write $CLAUDE_FILE_PATH"
    }],
    "PreToolUse": [{
      "matcher": "Edit",
      "command": "bash .claude/hooks/protect-files.sh"
    }]
  }
}
```

Exit code `0` = allow, exit code `2` = block with feedback message.

**Rule of thumb:** If you'd be upset when the rule is broken, use a hook. If it's a preference, use CLAUDE.md.

---

## Phase 7: MCP Servers (External Tools)

MCP connects Claude Code to external data sources and services.

```bash
# Add a Postgres MCP server
claude mcp add postgres -- npx @anthropic-ai/mcp-server-postgres \
  --connection-string "$DATABASE_URL"

# Add Playwright for browser testing
claude mcp add playwright -- npx @anthropic-ai/mcp-server-playwright

# Add Sentry for error tracking
claude mcp add sentry -- npx @anthropic-ai/mcp-server-sentry \
  --token "$SENTRY_TOKEN"
```

**For HW5:** You need at least one working MCP server with a demonstrated workflow. Good options for a web app project: Postgres/Supabase MCP (query your database), Playwright (E2E testing), or Sentry (error tracking).

### Team sharing via .mcp.json

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["@anthropic-ai/mcp-server-postgres",
               "--connection-string", "$DATABASE_URL"]
    }
  }
}
```

Commit this to your repo — every teammate gets the same MCP connections automatically.

---

## Phase 8: CI/CD & GitHub Integration

Claude Code has full access to `git` and `gh` (GitHub CLI).

### Setting up GitHub Actions

```
> Set up GitHub Actions for this project:
> - Run lint, typecheck, and tests on every PR
> - Deploy to Vercel on merge to main
> - Block merges if any check fails
```

### AI-powered PR review

```yaml
# .github/workflows/claude-review.yml
name: Claude PR Review
on:
  pull_request:
    types: [opened, synchronize]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          prompt: |
            Review this PR for code quality,
            missing tests, and security concerns.
```

### Non-interactive mode for scripts

```bash
claude -p "Review this code" --allowedTools "Read,Grep,Glob"  # Read-only
claude -p "Generate tests" --output-format json                # Structured output
claude -p "Audit security" --max-budget-usd 5.00               # Budget cap
```

---

## Phase 9: Parallel Development (Advanced)

### Worktrees for parallel work

```bash
# Terminal 1: working on feature A
claude --worktree
> "Implement the research pipeline API routes"

# Terminal 2: working on feature B simultaneously
claude --worktree
> "Build the map component with Mapbox"
```

Each worktree gets its own branch and file state. Merge via git when done.

### Sub-agents for specialized review

```markdown
# .claude/agents/security-reviewer.md
---
name: security-reviewer
isolation: worktree
---

## Role
Review code for OWASP Top 10 vulnerabilities.

## Instructions
Check for SQL injection, XSS, CSRF, input validation,
hardcoded secrets, dependency CVEs.

## Output
Checklist with severity ratings (HIGH/MED/LOW).
```

---

## Phase 10: Security Pipeline

The 8-gate pipeline for production readiness:

```bash
# Gate 1: Pre-commit secrets detection
gitleaks protect --staged

# Gate 2: Dependency scanning
npm audit --audit-level=high

# Gate 3: Static analysis
npx semgrep --config auto src/

# Gate 4: Dynamic testing (via Playwright/OWASP ZAP)
npx playwright test

# Gate 8: Software Bill of Materials
npx @cyclonedx/cyclonedx-npm --output-file sbom.json
```

Integrate these into your CI/CD pipeline. The P3 rubric requires "OWASP top 10 addressed" and "security audit."

---

## Quick Reference

```bash
# Session
claude                    # Start
claude --continue         # Resume last
claude --worktree         # Isolated worktree

# In-session
/init                     # Generate CLAUDE.md
/clear                    # Reset context
/compact                  # Compress context
/rewind                   # Undo
/model sonnet|opus|haiku  # Switch model
(plan) your task          # Plan mode

# Non-interactive
claude -p "prompt"                        # One-shot
claude -p "prompt" --output-format json   # JSON output
claude -p "prompt" --allowedTools "Read"  # Read-only
claude -p "prompt" --max-budget-usd 5     # Budget cap
```
