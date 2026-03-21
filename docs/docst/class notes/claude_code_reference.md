# Claude Code: Complete Reference Guide

---

## 1. What Is Claude Code?

Claude Code is an **agentic coding tool** that runs in your terminal — not a chatbot in an IDE sidebar. It operates in a continuous loop: reading files, thinking, taking actions, and verifying results on its own. You shift from *driving* every step to *supervising* the agent.

| | IDE Chat (Antigravity) | Claude Code |
|---|---|---|
| Interface | Editor sidebar | Terminal |
| Interaction | Turn-based | Agentic loop |
| File access | Current file + what you provide | Full project via tools |
| Shell access | Limited or none | Full Bash access |
| Workflow | You drive each step | It drives, you approve |
| Best for | Focused edits, inline changes | Multi-file tasks, refactoring, automation |

**Key mindset shift:** A chatbot waits for you after every response. An agent takes initiative — it reads files, runs tests, fixes errors, and keeps going until the task is done.

---

## 2. Installation & Setup

```bash
# Recommended: native install (auto-updates in background)
curl -fsSL https://claude.ai/install.sh | bash

# Or via npm
npm install -g @anthropic-ai/claude-code

# Verify
claude --version

# Update an existing install
claude update
```

Also available as a **VS Code Extension** or **Desktop App**.

### Starting a session

```bash
cd ~/your-project
claude
```

On startup, Claude Code automatically:
1. Scans your project structure
2. Reads any `CLAUDE.md` files it finds
3. Presents a prompt — you type your task
4. Begins the agentic loop

---

## 3. Built-in Tools

Claude Code selects and chains these tools autonomously:

| Tool | Purpose | Example |
|---|---|---|
| **Read** | Read file contents | Read a config file |
| **Edit** | Make targeted edits | Replace a function, fix a bug |
| **Write** | Create or overwrite files | Generate a new component |
| **Bash** | Run shell commands | `npm test`, `git status` |
| **Glob** | Find files by pattern | `**/*.test.ts` |
| **Grep** | Search file contents | Find all imports of a module |
| **WebFetch** | Fetch URLs | Pull documentation, check an API |

A single prompt can trigger 10+ tool calls in sequence. Trust the agent — don't try to pre-load context manually.

---

## 4. CLAUDE.md — Project Instructions

`CLAUDE.md` is a markdown file in your project root that Claude Code reads **every session**. Think of it as your project's onboarding document for the AI — the same way you'd onboard a new teammate.

Without a `CLAUDE.md`, Claude Code starts every session with zero project context.

### What to include

```markdown
# CLAUDE.md

## Tech Stack
- Next.js 14, TypeScript 5.3, Tailwind CSS
- PostgreSQL with Prisma ORM
- Vitest for unit tests, Playwright for E2E

## Build Commands
npm run dev       # Start development server
npm test          # Run all tests
npm run lint      # Lint check

## Architecture
- src/app/        — Next.js App Router pages
- src/components/ — Reusable React components
- src/lib/        — Business logic, DB queries

## Conventions
- All components use TypeScript strict mode
- API routes return { data, error } shape
- Tests live next to source files (*.test.ts)
- Never use `any` type — use `unknown` and narrow

## Do NOT
- Modify the database schema without a migration
- Skip writing tests for new API routes
- Use client components unless interactivity requires it

## Reference Docs
@docs/api-spec.md
@prisma/schema.prisma
```

### What NOT to include

- Entire codebases (Claude Code reads files on its own)
- Secrets or credentials (`CLAUDE.md` is committed to git)
- Long tutorials (link to docs instead)
- Non-universal instructions (they get deprioritized)

**Rule of thumb: Keep it under 200 lines.** Files that grow too large cause Claude to deprioritize instructions.

### @imports

Use `@import` to reference other files without duplicating them:

```markdown
## API Documentation
@docs/api-spec.md

## Testing Patterns
@docs/testing-guide.md
```

### The CLAUDE.md hierarchy

Claude Code merges multiple `CLAUDE.md` files (most specific wins):

```
~/.claude/CLAUDE.md          ← Global: applies to ALL projects
your-project/
  CLAUDE.md                  ← Project root: main project context
  src/
    CLAUDE.md                ← Directory-specific rules
  tests/
    CLAUDE.md                ← Test-specific rules
```

Use the global file for personal preferences (editor style, commit format).

### Auto-Memory

Claude Code can remember things across sessions automatically. When you tell it something important, it may add it to `CLAUDE.md`:

```
You: "Always use vitest instead of jest in this project"
Claude Code: "I'll remember that." (adds to CLAUDE.md)
```

Check your `CLAUDE.md` periodically — auto-memories accumulate and may need pruning.

### The /init command

Starting a new project? Let Claude Code generate an initial `CLAUDE.md`:

```bash
claude
> /init
```

Claude Code will scan your project structure, read `package.json` and config files, and generate a starting `CLAUDE.md`. **Always review and edit the output** — it's a starting point, not a finished product.

---

## 5. Permissions & Tool Control

### Permission levels

| Level | Behavior | When to use |
|---|---|---|
| **Ask every time** | Approve each tool call | Learning, unfamiliar projects |
| **Allowlist** | Auto-approve specific tools/commands | Daily workflow, trusted commands |
| **YOLO mode** | Auto-approve everything | Sandboxed environments only |

### Configuring allowlists

```json
{
  "permissions": {
    "allow": [
      "Read",
      "Glob",
      "Grep",
      "Bash(npm test)",
      "Bash(git status)"
    ]
  }
}
```

**Start restrictive, widen as trust builds.** Allow read-only tools first. Add write tools after you're comfortable reviewing changes.

### Sandboxing

For maximum safety, run Claude Code inside a container:

```bash
# Docker sandbox
docker run -v $(pwd):/workspace -it claude-code-sandbox

# Or use the built-in sandbox flag
claude --sandbox
```

Use sandboxing for unfamiliar codebases and during learning. Required for YOLO mode in production environments.

---

## 6. Context Management

Claude Code has a ~200K token context window. That sounds large, but a medium codebase can easily exceed it. Manage context actively — when it fills up, Claude Code loses track of earlier information.

### Key commands

| Command | What it does | When to use |
|---|---|---|
| `/clear` | Wipes conversation history; re-reads CLAUDE.md | Switching to a completely different task |
| `/compact` | Summarizes and compresses conversation | Mid-task when context is getting full |
| `/rewind` | Rolls back to a previous checkpoint (conversation + files) | Claude Code made a bad edit or went down the wrong path |
| `/context` | Shows current token usage and what's loaded | When responses start feeling "off" |

### Session management

```bash
claude --continue   # Resume your last session (same context, same files)
claude --resume     # Browse and pick a session from a list
```

Sessions persist automatically — you don't lose work when you close the terminal.

### Switching models mid-session

```bash
> /model opus    # Complex refactors, architecture decisions
> /model sonnet  # Daily coding, default balance (most cost-effective)
> /model haiku   # Quick lookups, fast iteration

# Or at launch:
claude --model claude-opus-4-6
```

**Cost tip:** Use Sonnet by default. Switch to Opus only when the task genuinely requires deeper reasoning.

### The anti-pattern to avoid

**Bad:** Dumping everything into context upfront.
```
> Read all files in src/, then read all tests, then read the README, then...
```

**Good:** Let Claude Code pull in context as needed.
```
> Add input validation to the user registration endpoint
```

### The Document-then-Implement workflow

For tasks larger than your context window:

```
Phase 1 — EXPLORE:    > Explore the auth system and summarize findings
Phase 2 — DOCUMENT:   > Write your findings to docs/auth-analysis.md
                        /clear   ← reset context; findings are saved in the file
Phase 3 — PLAN:       > Read docs/auth-analysis.md and plan the refactoring
                        /clear
Phase 4 — IMPLEMENT:  > Read docs/auth-analysis.md and implement the plan
```

Your findings persist in files, not in context. This lets you tackle tasks larger than the context window.

### Best practices summary

1. **One task per session** — start fresh for each distinct task
2. **Use `/clear` between tasks** — don't carry stale context
3. **Use `/compact` for long sessions** — preserve context, reclaim space
4. **Trust the agent** — let it read files as needed; don't pre-load
5. **Keep `CLAUDE.md` concise** — it's read every session; bloat wastes tokens
6. **Document then implement** — save findings to files, `/clear`, then implement

---

## 7. Planning Modes

### Normal mode vs. Plan mode

| Mode | How to trigger | Best for |
|---|---|---|
| **Normal** | Just type your prompt | Small, well-defined tasks (< 3 files) |
| **Plan** | Type `(plan)` before your prompt, or press `Shift+Tab` | Large, multi-file changes |

**Rule of thumb: If the task touches more than 3 files, use Plan mode.**

### Plan mode flow

1. Claude Code analyzes the codebase
2. Creates a step-by-step plan
3. Shows you the plan
4. Waits for your approval
5. Executes the plan

You can edit the plan before approving, redirect the approach, or cancel entirely.

### When to use which mode

| Task | Mode | Why |
|---|---|---|
| Fix a typo | Normal | One file, obvious change |
| Add a test | Normal | Well-scoped, single file |
| New API endpoint | Plan | Multiple files (route, handler, test, types) |
| Refactor auth system | Plan | Cross-cutting, many dependencies |
| Debug a failing test | Normal | Start exploring, switch to Plan if it gets complex |
| Set up CI/CD pipeline | Plan | Multiple config files, need to verify approach |

### Extended thinking

Claude Code uses extended thinking automatically for complex reasoning — it "thinks out loud" before responding. You'll see a thinking indicator. You don't need to enable it; it activates when the task warrants it.

---

## 8. The Explore → Plan → Implement → Commit Workflow

This is Anthropic's **recommended 4-phase development pattern** for every feature. Each phase has a distinct mental mode and Claude Code usage pattern.

### Why this pattern works

Without the pattern, a prompt like `> Add OAuth login` causes Claude Code to start coding immediately, make assumptions, and create a mess across many files that's hard to review. With the pattern, each phase produces a reviewable checkpoint — you catch problems early when they're cheap to fix.

- **Explore** catches wrong assumptions
- **Plan** catches wrong approaches
- **Implement** catches wrong code
- **Commit** catches wrong scope

### Phase 1: EXPLORE

Goal: Understand the problem and existing code before changing anything.

```
> Explore the authentication system. What middleware is used?
> How are sessions managed? Where are the route guards?
```

Claude Code reads files, greps patterns, traces dependencies. You get a mental model without writing any code. Save findings to a file if the task is complex:

```
> Write your findings to docs/auth-analysis.md
> /clear
```

### Phase 2: PLAN

Goal: Design the solution before writing code.

```
> (plan) Add OAuth2 login with Google. The app currently
> uses session-based auth with express-session.
```

Claude Code will: read relevant files, propose a step-by-step plan, and wait for your approval before writing any code. Review the plan. Redirect if the approach is wrong. This is cheaper than fixing code later.

### Phase 3: IMPLEMENT

After approving the plan, Claude Code creates/modifies files, installs dependencies, runs tests, and fixes issues along the way. Your role is to monitor and intervene if needed.

```
> Wait -- use passport-google-oauth20, not the deprecated package
```

### Phase 4: COMMIT

Ship a clean, atomic commit and PR. Claude Code stages relevant files, writes a descriptive message, and creates the commit.

```
> Create a commit for the Google OAuth integration
> Push this branch and create a PR with a description
```

### The /clear trick for complex tasks

For large features, use `/clear` between phases:

```
Phase 1: EXPLORE → save findings to a file
/clear
Phase 2: PLAN → read findings file, write plan to a file
/clear
Phase 3: IMPLEMENT → read plan file, implement step by step
/clear
Phase 4: COMMIT → review changes, commit
```

Your findings and plans persist in files, not in context. This lets you tackle tasks larger than the 200K token window.

---

## 9. TDD with Claude Code

Anthropic calls TDD **"the single highest-leverage thing"** you can do when coding with AI.

### Why TDD is critical with AI

AI-generated code needs a verification mechanism. Without tests, you read code and hope it's correct. With tests, you run them and *know* if it's correct. Tests are the specification — Claude Code writes code to meet the spec.

### The AI-TDD workflow

1. **YOU** write the test (the spec)
2. Commit the failing test
3. **Claude Code** implements the code
4. Tests pass → commit
5. Refactor → tests still pass → commit

### Example: TDD in practice

**Step 1 (you):** Write the failing test
```javascript
describe('UserService', () => {
  test('validates email format', () => {
    expect(() => createUser({ email: 'invalid' }))
      .toThrow('Invalid email format');
  });
  test('hashes password before storing', async () => {
    const user = await createUser({
      email: 'test@example.com', password: 'secret123'
    });
    expect(user.password).not.toBe('secret123');
  });
});
```

**Step 2:** Commit the failing test: `git commit -m "test: user creation specs"`

**Step 3 (Claude Code):**
```
> The tests in userservice.test.js are failing. Implement
> createUser to make them pass. Do not modify the tests.
```

### Git history for TDD (red-green-refactor commits)

```
abc1234  test: add failing tests for user creation
def5678  feat: implement createUser (passes tests)
ghi9012  refactor: extract password hashing helper
```

### Property-based testing with fast-check

Go beyond example-based tests — property-based testing generates hundreds of random inputs:

```javascript
import fc from 'fast-check';

test('email validation rejects all non-email strings', () => {
  fc.assert(
    fc.property(
      fc.string().filter(s => !s.includes('@')),
      (input) => {
        expect(() => validateEmail(input)).toThrow();
      }
    )
  );
});
```

Research data: property-based testing shows 23–37% improvement in pass rates for AI-generated code.

### Mutation testing with Stryker

Tests pass — but are they actually testing anything? Mutation testing answers this: Stryker mutates your code (changes `>` to `>=`, removes lines, flips conditions) and checks if your tests catch the mutations.

```bash
npx stryker run
# Mutation score: 87%
# - 13% of mutations survived (tests didn't catch them)
# - These are gaps in your test suite
```

Use mutation testing to evaluate the *quality* of your test suite, not just coverage.

### Three risks of AI-generated tests

| Risk | Description | Mitigation |
|---|---|---|
| **Business logic gaps** | AI tests the code, not the requirement. Tests verify implementation details instead of business rules. | Write test descriptions yourself; let AI implement. |
| **Dependency drift** | AI mocks dependencies based on current behavior, not contracts. Mocks become stale. | Use integration tests for critical paths; update mocks in CI. |
| **Subtle logic errors** | Tests pass but encode wrong assumptions (off-by-one, timezone, encoding). | Review test assertions carefully; use property-based testing. |

**Mitigation strategy:** Humans write test descriptions and assertions. AI writes the implementation and boilerplate.

---

## 10. Git & GitHub Integration

Claude Code has full access to `git` and `gh` (GitHub CLI). You can instruct it in natural language:

```
> Create a branch called feat/oauth-login
> Commit the current changes with a descriptive message
> Push and create a PR
> Check the CI status of my PR
> Address the review comments on PR #42
```

### Branch-per-feature workflow

```
main
 |
 +-- feat/oauth-login
 |   +-- commit: tests
 |   +-- commit: implementation
 |   +-- commit: docs
 |   +-- PR #42 → main
 |
 +-- fix/session-timeout
     +-- PR #43 → main
```

```
> Create a branch called feat/oauth-login from main
> ... (work on the feature) ...
> Push this branch and create a PR targeting main
```

### The gh CLI & PR workflow

Claude Code uses `gh` for all GitHub operations:

```bash
gh pr create --title "Add OAuth login" --body "..."
gh pr checks 42       # Check CI status
gh pr view 42 --comments  # Review comments
gh pr merge 42 --squash   # Merge when ready
```

A complete feature in natural language:

```
1. > Create branch feat/user-search from main
2. > (plan) Add full-text search to the users endpoint
3. > Implement the plan
4. > Run the tests and fix any failures
5. > Create a commit for the search feature
6. > Push and create a PR with a summary of changes
7. > Address the reviewer's comments on the PR
```

---

## 11. CI/CD as Claude Code Workflows

### Setting up GitHub Actions

```
> Set up GitHub Actions for this project:
> - Run tests on every PR, run linting, build check
> - Deploy to Vercel on merge to main
```

Claude Code creates `.github/workflows/ci.yml` configured for your stack.

### AI-powered PR review (claude-code-action)

`anthropics/claude-code-action@v1` is now GA. For security-specific scanning, use `anthropics/claude-code-security-review@v1`.

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

### Running Claude Code in CI

Use `claude -p` in your pipeline. Scope tools with `--allowedTools` — read-only tools prevent Claude from modifying files or running commands in CI:

```yaml
steps:
  - uses: actions/checkout@v4
  - name: Review code
    run: |
      claude -p "Review the code for issues" \
        --allowedTools "Read,Grep,Glob" \
        --output-format json
```

---

## 12. Hooks for Quality Enforcement

Hooks are **deterministic scripts** that run before or after Claude Code tool calls — unlike `CLAUDE.md` rules which are advisory, hooks are enforced 100% of the time.

### How hooks work

```
Claude wants to edit a file
         |
         v
  PreToolUse hook runs
  (your script: allow or block?)
         |
    allowed?
    /        \
  yes         no
   |           |
 Edit       Block
 happens  + message
   |
   v
PostToolUse hook runs
(auto-format, lint, etc.)
```

### Hook types

| Hook | When It Runs | Use Cases |
|---|---|---|
| **PreToolUse** | Before a tool executes | Block writes to sensitive files, enforce naming, validate commands |
| **PostToolUse** | After a tool completes | Auto-format code, run linting, update imports |
| **Stop** | Before Claude's final response | Validate output, check for todos, ensure tests pass |

Exit codes: `0` = continue (allow the action), `2` = block (prevent the action, show message)

### Example: Block writes to sensitive files

```json
// .claude/settings.json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Edit|Write",
      "command": "python .claude/hooks/protect-files.py"
    }]
  }
}
```

```python
# .claude/hooks/protect-files.py
import sys, json
data = json.loads(sys.stdin.read())
path = data.get("tool_input", {}).get("file_path", "")
protected = [".env", "secrets.json", "production.config.js"]
if any(path.endswith(f) for f in protected):
    print(f"BLOCKED: {path}"); sys.exit(2)
sys.exit(0)
```

### Example: Auto-format after edits

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "command": "npx prettier --write $CLAUDE_FILE_PATH"
    }]
  }
}
```

Every time Claude Code edits or creates a file, Prettier auto-formats it. No more style debates.

### Hooks for production workflows

Hooks can also enforce production-readiness rules:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash(gh pr merge*)",
      "command": "check-ci-status.sh",
      "action": "block"
    }]
  }
}
```

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Bash(git tag*)",
      "command": "generate-release-notes.sh"
    }]
  }
}
```

The first hook blocks merges when CI hasn't passed. The second auto-generates release notes whenever a tag is created.

### Hooks vs. CLAUDE.md rules

| Aspect | Hooks | CLAUDE.md |
|---|---|---|
| Enforcement | Deterministic — always runs | Advisory — AI may ignore |
| Reliability | 100% — exit code 2 = blocked | ~90% — depends on context |
| Flexibility | Rigid — same rule every time | Flexible — AI applies judgment |
| Best for | Security, formatting, hard rules | Conventions, preferences, guidance |

**Rule of thumb:** If you would be upset when the rule is broken, use a hook. If it's a preference, use `CLAUDE.md`.

---

## 13. Visual Communication & Debugging

### Pasting screenshots

Claude Code accepts images. Paste a screenshot directly into the terminal:

```
> [paste screenshot of error in browser]
> Fix this error
```

Claude Code will analyze the screenshot (error message, stack trace, UI state), trace the error to source code, implement a fix, and verify the fix.

Works with: browser errors, terminal output, UI bugs, design mockups.

### The debug workflow

```
> I'm getting this error when I click the login button:
> [paste screenshot]
> The error started after the last commit.
```

Claude Code checks the recent diff, traces the error, and fixes it.

**Tips:** Include full stack traces, mention what triggered the error, reference when it broke ("after the last commit"), and paste console output when available. Claude Code can also use browser tools (Playwright MCP) to interact with your running app directly.

---

## 14. Non-Interactive Mode & Scripting

### The -p flag

`claude -p` runs Claude Code non-interactively — give it a prompt, get a result:

```bash
# One-shot task
claude -p "Explain the architecture of this project"

# Pipe input
git diff HEAD~1 | claude -p "Summarize these changes"

# From a file
claude -p "$(cat docs/migration-plan.md) -- implement step 3"
```

No interactive session. No approval prompts. Just input → output.

### Output formats & fan-out

```bash
claude -p "List endpoints" --output-format text        # plain text
claude -p "List endpoints" --output-format json        # structured
claude -p "Refactor auth" --output-format stream-json  # real-time
```

Fan-out pattern — run multiple instances in parallel:

```bash
for file in src/routes/*.ts; do
  claude -p "Review $file for security issues" \
    --output-format json --allowedTools "Read,Grep,Glob" &
done
wait
```

### Scripting safety

Always scope `--allowedTools` in automated contexts. Never give full tool access to unattended runs.

```bash
# Restrict tools -- read-only for review tasks
claude -p "Review this code" --allowedTools "Read,Grep,Glob"

# Set a timeout
claude -p "Generate tests" --timeout 120000

# Use a smaller model for quick checks
claude -p "Quick check" --model sonnet

# Set a budget cap for automated tasks
claude -p "Review this codebase for security issues" \
  --max-budget-usd 5.00
```

---

## 15. Evaluation Systems (LLM-as-Judge)

### Why evaluate AI output?

You can't manually review everything Claude Code generates. At scale, you need automated evaluation. **LLM-as-Judge** uses one LLM to evaluate the output of another. Research shows 85% agreement with human judgment — higher than human-human agreement at 81%.

### Scoring approaches

**Pointwise scoring** — rate each output independently (1–5 scale):
```
Rate this code review comment from 1-5:
Comment: "This function has O(n^2) complexity due to the nested
loop. Consider using a Set for O(n)."
```

**Pairwise comparison** — compare two outputs side by side and pick the better one. More reliable but slower (2x the cost).

### Known biases in LLM judges

| Bias | Description | Mitigation |
|---|---|---|
| **Position bias** | Prefers the first option in comparisons | Swap order and average scores |
| **Verbosity bias** | Rates longer responses higher | Normalize for length |
| **Self-enhancement** | Rates its own model's output higher | Use a different model as judge |
| **Wrong logic analysis** | Accepts plausible-sounding but incorrect reasoning (52.8% of cases) | Use binary sub-questions |

### Mitigation strategies & validation

Mitigate biases with:
1. **Chain-of-thought** — judge explains reasoning before scoring
2. **Binary sub-questions** — "Does the code handle empty input? (yes/no)"
3. **Few-shot examples** — 3–5 examples of good/bad output with scores
4. **Position swapping** — swap order in comparisons, average results

Validate with human labels — build a set of 30–50 human-labeled examples and run your judge on the same set:

- >80% agreement: Reliable
- 60–80%: Needs prompt refinement
- <60%: Do not use

---

## 16. Extensibility — Skills, Hooks, MCP & Sub-agents

### 16.1 Skills & Custom Commands

**Skills** are markdown files in `.claude/skills/` that define reusable slash commands for your team. When you type `/fix-issue`, Claude Code loads the corresponding skill file and follows its instructions.

```
your-project/
  .claude/
    skills/
      fix-issue.md       ← "/fix-issue" slash command
      deploy.md          ← "/deploy" slash command
      add-component.md   ← "/add-component" slash command
```

#### Anatomy of a skill file

```markdown
# Fix Issue

## Description
Fix a GitHub issue: branch, implement, test, PR.

## Steps
1. Read issue details from GitHub
2. Create branch fix/{issue-number}
3. Implement following project conventions
4. Write/update tests for changed code
5. Run test suite to verify
6. Create PR linking to the issue

## Constraints
- Never modify unrelated files
- Always include a test for the fix
```

#### Skills vs. CLAUDE.md

| Aspect | CLAUDE.md | Skills |
|---|---|---|
| Loaded | Every session, automatically | On demand, when invoked |
| Purpose | Project context and rules | Task-specific workflows |
| Scope | Universal project knowledge | One specific workflow |
| Triggered by | Auto-loaded | `/command` or auto-matched |
| Best for | Conventions, architecture | Repeatable multi-step tasks |

**Rule of thumb:** If Claude should always know it, put it in `CLAUDE.md`. If it's a specific workflow, make it a skill.

#### Invocation: Auto vs. Manual

Skills can be triggered two ways:

- **Auto-invoked:** Claude matches your prompt to the skill description. "Create a Button component" may trigger an `add-component` skill automatically.
- **Manual only:** Add `disable-model-invocation: true` to the skill's YAML frontmatter. This ensures the skill only runs when you explicitly type `/deploy`.

Use manual-only for potentially destructive operations like deployment, database migrations, or cleanup tasks where you want explicit human intent.

#### Sharing skills across teams

Skills are committed to your repo in `.claude/skills/` and versioned in git history — every team member gets the same workflows, and new members ramp up instantly.

```bash
git add .claude/skills/fix-issue.md
git commit -m "Add fix-issue skill for standardized bug fix workflow"
```

---

### 16.2 Hooks Deep Dive

Hooks were introduced in Section 12. This section covers additional configuration patterns and the full lifecycle model.

#### Hook lifecycle events

```
Think --> PreToolUse --> Execute Tool
                              |
                         PostToolUse
                              |
                        More work? --Yes--> Think
                              |
                              No
                              v
                            Stop
```

- **PreToolUse** — before a tool (Read, Edit, Bash) runs
- **PostToolUse** — after a tool completes
- **Stop** — agent is about to give its final response

#### Configuring hooks in `.claude/settings.json`

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "command": "npx prettier --write $CLAUDE_FILE_PATH"
    }],
    "PreToolUse": [{
      "matcher": "Edit",
      "command": "bash .claude/hooks/check-protected.sh"
    }]
  }
}
```

The `matcher` filters which tool triggers the hook. Without a matcher, the hook runs for every tool call.

#### Exit codes

| Exit Code | Meaning | Effect |
|---|---|---|
| `0` | Success | Continue normally |
| `2` | Block with feedback | Tool call is blocked; stdout shown to Claude as feedback |
| Non-zero (other) | Error | Hook failure reported; execution continues |

Exit code 2 is the key primitive — it lets hooks reject actions and explain why.

#### Example: Block edits to protected files (PreToolUse)

```bash
#!/bin/bash
# .claude/hooks/check-protected.sh
PROTECTED=(".env" ".env.local" "secrets.json")
for p in "${PROTECTED[@]}"; do
  if [[ "$CLAUDE_FILE_PATH" == *"$p"* ]]; then
    echo "BLOCKED: Cannot edit $p."; exit 2
  fi
done
exit 0
```

---

### 16.3 MCP Servers

**Model Context Protocol (MCP)** is a standard for connecting Claude Code to external data and services. MCP servers translate between Claude Code's tool-use protocol and external APIs — Claude Code calls MCP tools just like its built-in tools.

#### Why MCP matters

Without MCP, integrating external tools requires manual copy-paste:
```
You: "What tables exist in our database?"
You: *open pgAdmin, run query, copy results, paste into Claude Code*
```

With MCP:
```
You: "What tables exist in our database?"
Claude: *calls PostgreSQL MCP server*
Claude: "Your database has 12 tables..."
```

#### Adding an MCP server

Servers run as child processes. Claude Code discovers their tools automatically.

```bash
# PostgreSQL
claude mcp add postgres -- \
  npx @anthropic/mcp-server-postgres \
  --connection-string "$DATABASE_URL"

# Playwright (browser testing)
claude mcp add playwright -- \
  npx @anthropic/mcp-server-playwright

# Figma
claude mcp add figma -- \
  npx @anthropic/mcp-server-figma \
  --token "$FIGMA_TOKEN"

# Sentry (error tracking)
claude mcp add sentry -- \
  npx @anthropic/mcp-server-sentry \
  --token "$SENTRY_TOKEN"
```

#### `.mcp.json` for team sharing

Commit your MCP configuration so every teammate gets the same connections automatically:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["@anthropic/mcp-server-postgres",
               "--connection-string", "$DATABASE_URL"]
    },
    "playwright": {
      "command": "npx",
      "args": ["@anthropic/mcp-server-playwright"]
    }
  }
}
```

#### Tool Search: scaling MCP

When many MCP servers are added, their tool definitions consume context. Claude Code activates **Tool Search** automatically when tool definitions exceed ~10% of the context window — tools are indexed separately and only matched tools enter context. No configuration needed.

#### Building a simple MCP server

```javascript
import { McpServer } from "@modelcontextprotocol/sdk/server";

const server = new McpServer({ name: "my-tools" });

server.tool("get_user_count",
  "Returns the number of registered users",
  {}, async () => {
    const count = await db.users.count();
    return { content: [{ type: "text",
      text: `There are ${count} users.` }] };
  });
```

---

### 16.4 Custom Sub-agents

**Sub-agents** are specialized Claude Code instances defined in `.claude/agents/`. Each has its own instructions, constraints, and context window — like specialized teammates you can call on.

```
.claude/
  agents/
    security-reviewer.md
    test-writer.md
    docs-updater.md
```

#### Anatomy of a sub-agent

Sub-agent files live in `.claude/agents/` with YAML frontmatter specifying `name` and `isolation`:

```markdown
---
name: security-reviewer
isolation: worktree
---

## Role
Review code for security vulnerabilities.

## Instructions
Check for SQL injection, XSS, CSRF, input validation,
hardcoded secrets, dependency CVEs.

## Output
Checklist with severity ratings (HIGH/MED/LOW).
```

#### `isolation: worktree`

The `isolation: worktree` setting gives the sub-agent its own git worktree — a separate working directory.

```
Main worktree:        ~/project/
Sub-agent worktree:   ~/project/.claude/worktrees/security-reviewer/
```

Benefits: sub-agent edits don't interfere with your work, multiple sub-agents can run in parallel, each gets its own branch and file state, and failed experiments are easily discarded.

#### Skills vs. sub-agents

| Feature | Skills | Sub-agents |
|---|---|---|
| Runs in | Your main context | Isolated context window |
| File access | Your working tree | Own worktree (if isolated) |
| Best for | Defined step-by-step workflows | Open-ended review, analysis |
| Example | "Deploy to production" | "Review this PR for security" |

**Skills are recipes. Sub-agents are specialists.**

---

### 16.5 Parallel Development with Worktrees

#### The `--worktree` flag

`claude --worktree` creates a new git worktree in `.claude/worktrees/` with its own branch. All worktrees share the same git history but have independent file states.

```
~/project/                              (main worktree — your code)
~/project/.claude/worktrees/
  feature-auth/                         (worktree 1)
  feature-search/                       (worktree 2)
  fix-header-bug/                       (worktree 3)
```

#### Pattern 1: Multiple terminals

```bash
# Terminal 1
claude --worktree
> "Implement the user profile API endpoint"

# Terminal 2
claude --worktree
> "Add search functionality to the product list"

# Terminal 3
claude --worktree
> "Fix the header layout bug on mobile"
```

Each works in its own worktree. Merge results via git when done.

#### Pattern 2: Competitive solutions

Ask two agents to solve the same problem independently, then compare:

```bash
# Terminal 1
claude --worktree
> "Implement caching for the API using Redis"

# Terminal 2
claude --worktree
> "Implement caching for the API using in-memory LRU cache"
```

Review both solutions. Pick the better one. Discard the other. Useful when you're unsure about the right approach.

#### Patterns 3 & 4: Background & specialists

**Background orchestration** — fire-and-forget:
```
> Run a sub-agent in the background to add comprehensive tests
> for the auth module. I'll keep working on the API routes.
```

**Specialist sub-agents with worktrees:**
```
Main session:   "Working on the checkout flow"
Background 1:   security-reviewer (vulnerabilities)
Background 2:   test-writer (tests for new code)
Background 3:   docs-updater (API documentation)
```

#### Best practices for parallel work

1. **Scope tasks clearly** — each agent needs a well-defined goal
2. **Avoid file conflicts** — don't assign overlapping files to parallel agents
3. **Start with 2–3 agents** — scale up as you build confidence
4. **Review before merging** — parallel work needs careful integration
5. **Use Plan mode first** — have each agent plan before implementing

For P3 teams: 3–5 teammates, each running 5–6 tasks in parallel = 15–30 parallel workstreams. Coordinate via your scrumboard.

---

### 16.6 Agent Teams (Experimental)

Agent Teams is an experimental feature where multiple Claude Code instances coordinate through a **team lead**. Enable with:

```bash
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

The team lead breaks down tasks, assigns them to agents, and coordinates results. Each agent has an independent context window, its own worktree, and an assigned scope. Communication happens through the team lead, not directly between agents.

**Good fit:** Large features with separable sub-tasks, independent modules.
**Poor fit:** Tightly coupled code, small tasks where coordination overhead exceeds benefit.

This is experimental — expect rough edges. Use worktrees and sub-agents for production workflows today.

---

### 16.7 Code Review for AI-Generated Code

#### Why AI code review is different

AI-generated code has specific failure patterns that human code doesn't. Research findings (ClackyAI study):

- **1.57×** more security issues than human-written code
- **2.74×** more cross-site scripting (XSS) vulnerabilities
- **1.91×** more insecure direct object references

The code *looks* correct and passes a quick scan, but hides subtle issues.

#### AI-specific pitfalls

| Pitfall | Description |
|---|---|
| **False confidence** | AI code is well-formatted and commented, creating an illusion of quality. Reviewers let their guard down. |
| **Hallucinated APIs** | The AI calls functions or methods that don't exist. These are "the least dangerous" hallucinations — they cause immediate, visible errors. |
| **Duplicate logic** | Without global project awareness, AI generates redundant implementations. One team found 11 different email validation implementations in their AI-assisted codebase. |
| **Stale patterns** | AI may use deprecated APIs or outdated patterns from its training data. |

#### The C.L.E.A.R. Framework

A structured approach to reviewing AI-generated code:

| Letter | Dimension | What to Check | AI-Specific Risk |
|---|---|---|---|
| **C** | **Context** | Does this fit the project's architecture and conventions? | AI may invent its own conventions |
| **L** | **Logic** | Is the business logic correct? Are edge cases handled? | AI often handles happy path only |
| **E** | **Evidence** | Are there tests? Do they actually verify the behavior? | AI writes tests that pass but don't verify behavior |
| **A** | **Architecture** | Does it follow established patterns? Any new dependencies? | AI adds unnecessary libraries |
| **R** | **Risk** | SQL injection? XSS? Auth checks? | 1.57× more security issues |

#### The Writer/Reviewer pattern

Use Claude Code itself as part of the review process:

```
1. WRITE  — Agent 1 implements the feature
2. REVIEW — Agent 2 (sub-agent) reviews using C.L.E.A.R.
3. REVISE — Agent 1 addresses findings
4. HUMAN REVIEW — You review the final result
```

**Never skip Step 4.** AI reviewing AI is useful but not sufficient. A human must sign off.

#### PR metadata for AI code

Add transparency to your pull requests so reviewers know where to focus:

```markdown
### AI Disclosure
- **% AI-generated:** ~80%
- **AI tool:** Claude Code
- **Human review:** Yes, C.L.E.A.R. applied
- **Security check:** Input validation verified,
  no raw SQL, auth middleware confirmed
```

---

### 16.8 Putting It All Together

The full extensibility workflow for a feature:

```
.claude/
  skills/fix-issue.md          ← Standardized workflows
  agents/security-reviewer.md  ← Specialized reviewers
  settings.json                ← Hooks for formatting/linting
  .mcp.json                    ← Shared MCP server config
CLAUDE.md                      ← Project context & conventions
```

```
1. Pick issue from scrumboard
2. claude --worktree, then /fix-issue #42
3. Hooks auto-format on every edit
4. MCP servers provide DB schema, test data
5. Sub-agent reviews for security
6. /create-pr — teammate reviews with C.L.E.A.R.
7. Merge and move issue to Done
```

---

## 17. Agent Architectures & Security

### 17.1 Agent Fundamentals

#### The Augmented LLM

Before agents, understand the building block: the **augmented LLM**. An LLM augmented with tools (APIs, code execution), retrieval (search, RAG), and memory (conversation history, `CLAUDE.md`) is the foundation for everything that follows.

#### Workflows vs. Agents

This is the most important distinction when designing systems:

| Dimension | Workflow | Agent |
|---|---|---|
| Control | Developer defines steps | Model decides steps |
| Predictability | High — same input, same path | Variable — adapts to results |
| Complexity | Low-medium | Medium-high |
| Debugging | Easy — trace the code path | Harder — trace the model's reasoning |
| Best for | Repetitive, well-defined tasks | Open-ended, exploratory tasks |
| Cost | Lower (fewer LLM calls) | Higher (many LLM calls) |

**Rule of thumb from Anthropic:** Start with the simplest solution. Only add agent complexity when simpler patterns fail.

---

### 17.2 Anthropic's 6 Agent Patterns

#### Pattern 1: Prompt Chaining

Sequential processing with quality gates between steps. Each step's output feeds the next step's input. Quality gates catch errors early.

**Example:** Generate code → Validate syntax → Write tests → Verify tests pass

**When to use:** Tasks that decompose into fixed, dependent steps.

#### Pattern 2: Routing

Classify input, then dispatch to a specialized handler. A classifier LLM categorizes the input and routes it to specialized prompts, tools, or models — each optimized for its category.

**Example:** Customer support — route billing questions to billing agent, technical questions to tech agent.

**When to use:** Inputs vary widely and benefit from specialization.

#### Pattern 3: Parallelization

Run independent subtasks simultaneously for speed or diversity. Two sub-patterns:

- **Sectioning:** Split work into independent pieces (e.g., analyze frontend and backend separately)
- **Voting:** Run the same task multiple times for diverse perspectives (e.g., 3 code reviews, majority rules)

**When to use:** Tasks with independent subtasks or where multiple perspectives improve quality.

#### Pattern 4: Orchestrator-Workers

A central orchestrator dynamically delegates to worker agents. The orchestrator analyzes the task, creates a plan, dynamically spawns subtasks (number and type vary), and synthesizes results.

**Key difference from parallelization:** The orchestrator decides what subtasks to create at runtime — the plan is not predefined.

**Example:** "Refactor the auth system" — orchestrator identifies 5 files to change, creates a worker for each.

#### Pattern 5: Evaluator-Optimizer

Generate, then critique and refine in a loop. A generator produces an initial output; an evaluator scores or critiques it; if below threshold, feedback goes back to the generator; the loop continues until quality is sufficient.

**Example:** Write documentation → Review for completeness → Revise → Review again → Accept.

**When to use:** Tasks with clear quality criteria where iterative refinement adds value.

#### Pattern 6: Autonomous Agents

Full agentic loop with environment interaction and self-directed planning. The model controls its own loop — plans, selects tools, executes, observes results, and adapts. This is Claude Code.

**Tradeoff:** Most capable but hardest to control. Requires strong guardrails, sandboxing, and human oversight.

#### Choosing the Right Pattern

| Pattern | Complexity | Control | Best For |
|---|---|---|---|
| Prompt Chaining | Low | High | Sequential, well-defined tasks |
| Routing | Low | High | Varied inputs, specialized handling |
| Parallelization | Medium | High | Independent subtasks, consensus |
| Orchestrator-Workers | Medium | Medium | Dynamic decomposition |
| Evaluator-Optimizer | Medium | Medium | Quality-critical outputs |
| Autonomous Agents | High | Low | Open-ended, complex tasks |

**Start simple. Only escalate to more complex patterns when simpler ones are insufficient.**

---

### 17.3 Claude Agent SDK

The Claude Agent SDK lets you build agents programmatically — as opposed to the CLI (Claude Code), which is an interactive development tool for humans. The SDK is a programmatic building block for embedding agents in your apps.

Available in Python and TypeScript. You define tools, sessions, and hooks; the SDK handles the agentic loop.

#### The `query()` Function

```python
from claude_agent_sdk import Agent

agent = Agent(
    model="claude-sonnet-4-20250514",
    tools=[read_file, write_file, run_tests],
    system_prompt="You are a code review agent."
)

result = agent.query(
    "Review the pull request in /tmp/pr-diff.patch "
    "and suggest improvements."
)
print(result.response)
```

The agent autonomously decides which tools to call, in what order, and when to stop.

#### Built-in Tools

```python
from claude_agent_sdk.tools import (
    computer,      # Desktop automation
    text_editor,   # File reading and editing
    bash,          # Shell command execution
)
```

You can also define custom tools with standard function signatures and docstrings — the SDK converts them to Claude's tool-use format automatically.

#### Hooks for Control

```python
def pre_tool_use(tool_name, tool_input):
    """Called before every tool invocation."""
    if tool_name == "bash" and "rm -rf" in tool_input:
        raise PermissionError("Destructive command blocked")
    return tool_input  # Allow it

def post_tool_use(tool_name, tool_output):
    """Called after every tool invocation."""
    log(f"Tool {tool_name} returned {len(tool_output)} chars")
    return tool_output

agent = Agent(
    hooks={"pre_tool_use": pre_tool_use,
           "post_tool_use": post_tool_use}
)
```

Hooks give you guardrails without giving up autonomy.

#### Permissions with `allowed_tools`

```python
agent = Agent(
    model="claude-sonnet-4-20250514",
    allowed_tools=["text_editor", "bash(npm test)"],
    # Can read/edit files and run tests
    # Cannot run arbitrary bash, make network calls, etc.
)
```

**Principle of least privilege:** Give the agent only the tools it needs for its specific task.

---

### 17.4 Multi-Agent Coordination

#### Orchestrator-Worker in Code

The orchestrator (Sonnet/Opus) plans and spawns worker agents (Haiku) for subtasks. Workers execute independently and return results. Use powerful models for orchestrators and cheaper models for workers to control costs.

#### Writer/Reviewer Pattern

```
Writer Agent ---> Reviewer Agent
      ^                 |
      |    Feedback     |
      +-----------------+
      Loop until approved
```

The writer generates code with full tools; the reviewer checks quality, security, and tests. This is the Evaluator-Optimizer pattern applied to code generation.

#### Message Passing Between Agents

Agents communicate through structured outputs. Each agent has its own system prompt, tools, and specialization. The orchestrating code passes context between them as strings or structured data:

1. Agent 1 (Architect) produces a plan
2. Orchestrating code passes the plan to Agent 2 (Implementer)
3. Agent 2's output passes to Agent 3 (Tester)

---

### 17.5 Agent Safety & Evaluation

#### The Safety Challenge

Agents are powerful because they are autonomous. But autonomy introduces risks: unintended actions, cascading errors, data exposure, and resource consumption (infinite loops burning tokens). Safety must be designed in from the start, not bolted on later.

#### Sandboxing Strategies

| Strategy | Implementation | Protection Level |
|---|---|---|
| Container isolation | Docker, VM | Full — agent cannot affect host system |
| Tool allowlists | `allowed_tools=["read","grep"]` | Medium — limits what agent can do |
| Hooks | `pre_tool_use` validation | Medium — block specific actions |
| Network isolation | No outbound network | High — prevents data exfiltration |
| Time/token limits | Max iterations, token budget | Medium — prevents runaway agents |
| Human-in-the-loop | Approval for destructive actions | High — human reviews critical steps |

**Defense in depth:** Combine multiple strategies. No single strategy is sufficient.

#### Testing Agents Systematically

Agents are harder to test than deterministic code. Four approaches:

1. **Eval suites** — predefined tasks with known correct outcomes
2. **Trajectory analysis** — check the agent's reasoning path, not just output
3. **Boundary testing** — deliberately give ambiguous or adversarial inputs
4. **Cost monitoring** — track token usage per task to catch runaway agents

---

### 17.6 Security of AI-Generated Code

#### The Data Is Alarming

According to the Veracode 2025 Study:

| Metric | Result |
|---|---|
| AI code with OWASP Top 10 vulnerabilities | 45% |
| Java code failure rate | 72% |
| XSS vulnerability rate | 86% |
| Log injection vulnerability rate | 88% |

**Critical finding:** Larger, more capable models do NOT generate more secure code. Security performance has not improved even as models get dramatically better at functional correctness.

Additional research findings:

- **Apiiro:** Privilege escalation flaws +322%, architectural design flaws +153% in AI-generated code
- **Aikido 2026:** 1 in 5 organizations reported serious security incidents from AI-generated code

The AI writes code that works but is vulnerable. It passes tests but fails security audits. **You ship it. You own it.**

#### Why AI Code Is Insecure

1. **Training data includes vulnerable code** — learned from millions of repos with known vulnerabilities
2. **Functional correctness ≠ security** — optimizes for "does it work?" not "is it safe?"
3. **Missing context** — doesn't know your threat model or compliance requirements
4. **Developer overconfidence** — code that "looks right" and passes tests gets less scrutiny
5. **Speed vs. rigor tradeoff** — faster development tempts developers to skip security reviews

---

### 17.7 The 8-Gate Security Pipeline

Every AI-generated code change should pass through 8 security gates before reaching production. No single gate catches everything — together, they form defense in depth.

```
Code → [1] Pre-commit → [2] Deps → [3] SAST → [4] DAST
     → [5] Container → [6] License → [7] SecAcc → [8] SBOM → Production
```

#### Gate 1 — Pre-Commit Secrets Detection (Gitleaks)

Scans code before commit for API keys, tokens, passwords, and private keys. AI models sometimes hallucinate credentials or copy patterns that include hardcoded secrets.

```bash
gitleaks protect --staged  # Run as a pre-commit hook
```

#### Gate 2 — Dependency Scanning (npm audit, Dependabot, Snyk)

AI suggests dependencies from training data — some with known vulnerabilities or that are unmaintained. The model may suggest outdated package versions with known CVEs.

```bash
npm audit        # Check for known vulnerabilities
npm audit fix    # Auto-fix what you can
```

#### Gate 3 — SAST (Static Application Security Testing)

Analyzes source code without running it. Catches SQL injection patterns, XSS sinks, hardcoded secrets, and insecure crypto.

Tools: **SonarQube** (comprehensive, many languages), **Semgrep** (lightweight, pattern-based rules).

#### Gate 4 — DAST (Dynamic Application Security Testing)

Tests the running application from the outside. Catches authentication bypasses, CORS misconfigurations, and exposed endpoints.

Tools: **OWASP ZAP** (open source, automated scanning). Simulates attacks against your deployed app.

#### Gate 5 — Container Scanning

If you deploy in containers, scan the image for base image vulnerabilities, unnecessary packages, and services running as root.

#### Gate 6 — License Compliance (FOSSA)

AI-generated code may introduce dependencies with incompatible licenses. FOSSA scans your dependency tree for license conflicts automatically.

Red Hat found 17 incidents of GPL code appearing in MIT-licensed projects via Copilot. GPL dependencies in an MIT project constitute a license violation.

#### Gate 7 — Security Acceptance Criteria

Add to your Definition of Done: input validation, auth checks, no secrets in code/logs, rate limiting, and non-leaking error messages.

#### Gate 8 — SBOM (Software Bill of Materials)

A complete inventory of every component. Formats: SPDX, CycloneDX. Required by U.S. Executive Order 14028, EU Cyber Resilience Act, and enterprise procurement.

```bash
npx @cyclonedx/cyclonedx-npm --output-file sbom.json
```

---

### 17.8 Slopsquatting

**Slopsquatting** is a novel threat unique to AI-assisted development. AI models sometimes hallucinate package names that don't exist. Attackers monitor AI hallucinations, register the fake package names, and fill them with malicious code. When developers follow AI advice and `pip install` or `npm install` the hallucinated package, they install malware.

```
You: "How do I parse CSV in Python?"
AI:  "Use the fast-csv-parser package: pip install fast-csv-parser"
# fast-csv-parser doesn't exist — but an attacker can register it
```

**This is not theoretical — it's happening in production.**

#### Defenses

1. **Verify every package** — check it exists on npm/PyPI with real download counts
2. **Use lockfiles** — `package-lock.json` pins known-good versions
3. **Dependency scanning** (Gate 2) catches known malicious packages
4. **Be suspicious of unfamiliar packages** — if you've never heard of it, verify first

---

### 17.9 Ethics & Professional Responsibility

#### IP and Copyright

Per the U.S. Copyright Office (2023), wholly AI-generated content is not copyrightable. Your code is only protected if there is meaningful human creative contribution.

Active legal issues include *Doe v. GitHub* (ongoing), which alleges Copilot reproduces copyrighted code without attribution and seeks $9 billion in DMCA damages. Red Hat documented 17 incidents of GPL-licensed code appearing in MIT-licensed projects via Copilot — a license violation with legal liability.

#### Professional Responsibility

Per the ACM Code of Ethics, Principle 1.6: *"Accept full responsibility for their own work."*

When you use AI to generate code:
- You are the author of record
- You are responsible for bugs, vulnerabilities, and license violations
- You must review every line before shipping
- **"The AI wrote it" is not a defense**

The standard has not changed. AI is a tool. The engineer is accountable.

#### Bias in AI-Generated Code

AI perpetuates biases from training data, including default assumptions (binary gender in user schemas, Western names, English-only), exclusionary patterns (accessibility features omitted unless explicitly requested), and cultural bias (dates, currencies, and addresses defaulting to U.S. conventions).

**Your responsibility:** Review for inclusivity, explicitly prompt for accessibility, test with diverse personas, and don't ship defaults uncritically.

---

## 18. Production Deployment

### Why Deployment Matters

Your project is not done until it's deployed. The gap between "it works on my machine" and "it works in production" is where engineering happens. A project that only runs on localhost is a homework exercise; a deployed project is a portfolio piece.

### Vercel for Next.js

Vercel is built by the Next.js team and offers zero-config deployment, automatic HTTPS, CDN, edge functions, and a generous free tier. Every PR gets its own preview URL automatically — reviewers can test the PR live before merging.

```bash
npm i -g vercel
vercel login
vercel        # deploys to preview
vercel --prod # deploys to production
```

A PR titled "add-login-page" automatically produces a preview URL like `https://myapp-pr-42.vercel.app`.

### Environment Variable Management

Never commit secrets to git.

| Environment | Where secrets live |
|---|---|
| Local dev | `.env.local` (gitignored) |
| Preview | Vercel dashboard > Settings > Env Vars |
| Production | Vercel dashboard > Settings > Env Vars |

```bash
# .env.local (gitignored)
DATABASE_URL=postgres://localhost:5432/myapp_dev

# Vercel Production (configured in dashboard)
DATABASE_URL=postgres://prod-server:5432/myapp
```

### Production Deployment Gates

Never deploy directly. Let the pipeline decide.

**Rule:** If CI fails, production doesn't update. Period.

```
main branch push -> CI/CD runs -> All pass? -> Deploy
                                    Fail? -> Block + notify
```

### The Full CI/CD Pipeline

Each stage catches a different class of bug. Catching bugs earlier is cheaper — lint is free, production bugs cost reputation.

| Stage | Tool | What it catches |
|---|---|---|
| 1. Lint | ESLint, Prettier | Style violations, unused imports |
| 2. Typecheck | `tsc --noEmit` | Type errors tests might miss |
| 3. Unit Tests | Jest / Vitest | Logic bugs in isolated functions |
| 4. Integration | API route tests | API contract violations |
| 5. E2E Tests | Playwright | Broken user workflows |
| 6. Security Scan | npm audit, OWASP | Known vulnerable dependencies |
| 7. AI PR Review | Claude Code | Architectural issues, edge cases |
| 8. Preview Deploy | Vercel preview URL | Build failures, runtime errors |
| 9. Prod Deploy | Vercel production | Final destination |

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npx playwright test
      - run: npm audit --audit-level=high
```

---

## 19. Monitoring & Observability

Without monitoring, you only find bugs when users complain.

### The Three Pillars

| Pillar | What it tells you | Tool |
|---|---|---|
| Logs | What happened | Structured logging (JSON) |
| Metrics | How much / how fast | Uptime monitors |
| Errors | What went wrong | Sentry |

### Error Tracking with Sentry

Sentry provides stack traces with source maps, user context, breadcrumbs (what happened before the error), and release tracking (which deploy introduced it).

```javascript
import * as Sentry from "@sentry/nextjs";
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

With a Sentry MCP server, Claude Code can query your errors directly:

```
> "What are the top 5 errors in production this week?"
Claude reads Sentry API -> summarizes -> suggests fixes
```

### Structured Logging

Don't: `console.log("user logged in")`

Do:
```javascript
logger.info("user.login", {
  userId: user.id, method: "oauth", duration_ms: 142
});
logger.error("payment.failed", {
  userId: user.id, amount: 49.99, error: err.message
});
```

Structured logs are searchable, filterable, and machine-readable.

---

## 20. Performance Optimization with AI

### Lighthouse + Claude Code

Pipe performance reports directly to Claude — AI reads the 5000-line JSON so you don't have to.

```bash
# Generate Lighthouse report
npx lighthouse https://myapp.vercel.app \
  --output=json --output-path=./report.json

# Ask Claude to analyze it
cat report.json | claude -p \
  "Identify the top 3 performance improvements.
   For each: issue, expected impact, exact code changes."
```

### Common Performance Patterns

| Pattern | Problem | AI-Assisted Fix |
|---|---|---|
| DB queries | N+1 queries, missing indexes | Claude analyzes query logs, suggests indexes |
| Bundle size | Large JS bundles | Claude identifies heavy imports, suggests tree-shaking |
| Images | Unoptimized images | Claude suggests `next/image`, WebP conversion |
| Lazy loading | Everything loads upfront | Claude identifies below-fold components for `dynamic()` |
| Caching | Repeated API calls | Claude suggests cache headers, stale-while-revalidate |

```javascript
// Before: imported on every page load
import HeavyChart from './HeavyChart';

// After: loaded only when needed
const HeavyChart = dynamic(
  () => import('./HeavyChart'),
  { loading: () => <Skeleton /> }
);
```

---

## 21. Cost Optimization

### Prompt Caching

Repeated API calls with similar prompts waste tokens. Prompt caching reuses the processed result of a stable prefix.

```
First call:
  [System prompt: 2000 tokens] + [User query: 50 tokens]
  -> Full processing, result cached

Second call (same system prompt):
  [Cached: 2000 tokens] + [New query: 50 tokens]
  -> 90% cheaper, 85% faster
```

| Aspect | Detail |
|---|---|
| Cache hit | System prompt matches exactly → reuse |
| Cache miss | Any change to cached prefix → recompute |
| TTL | ~5 minutes of inactivity |
| Savings | Up to 90% cost reduction on cached tokens |
| Latency | Up to 85% faster on cache hit |
| Minimum | 1024 tokens for caching to activate |

**Key insight:** Structure prompts so the stable part comes first (system prompt, docs) and the variable part comes last (user query).

**When to use:** Long system prompts reused across calls, RAG with stable document context, batch processing with shared instructions.

### Model Routing

Not every task needs the most powerful model.

| Model | Best for | Cost | Speed |
|---|---|---|---|
| Opus | Complex architecture, multi-file refactoring | $$$ | Slower |
| Sonnet | Daily coding, PR reviews, standard features | $$ | Medium |
| Haiku | Simple tasks, classification, batch processing | $ | Fast |

Route tasks to the cheapest model that can handle them:
```
"Fix this typo in the README"                       → Haiku  ($0.001)
"Implement login following auth pattern"            → Sonnet ($0.01)
"Redesign DB schema for multi-tenancy"              → Opus   ($0.10)
```

Choosing the right model for the job:
- Development: Sonnet (good balance)
- Code review CI: Sonnet (quality matters)
- Log classification: Haiku (volume is high)
- Architecture decisions: Opus (stakes are high)

### Budget Caps

Use `--max-budget-usd` to prevent runaway costs in automated contexts (CI/CD pipeline reviews, batch processing, automated security scans, fan-out agent tasks):

```bash
claude -p "Review this codebase for security issues" \
  --max-budget-usd 5.00
```

---

## 22. RAG & Vector Databases

### The Context Problem at Scale

| Codebase | Files | Tokens |
|---|---|---|
| Small project | ~50 files | ~100K tokens |
| Medium project | ~500 files | ~1M tokens |
| Enterprise monorepo | ~50,000 files | ~100M tokens |

You can't feed 100M tokens into a 200K context window. Solution: retrieve only what's relevant.

### Claude Code's Context Management IS RAG

When Claude Code processes your request, it is already performing retrieval-augmented generation:

1. Reads your `CLAUDE.md` — cached project context
2. Uses Glob/Grep — just-in-time file retrieval
3. Reads specific files — targeted context loading
4. Compacts when full — summarizes to free space

Retrieval = Glob, Grep, Read tools. Augmentation = adding retrieved files to context. Generation = producing code with that context.

### What Are Embeddings?

Embeddings turn text into numbers that capture meaning. Similar meaning = nearby vectors. This enables semantic search — finding relevant content even when keywords don't match.

```
"authentication middleware" -> [0.82, -0.15, 0.43, ...] (1536 dims)
"login security check"     -> [0.79, -0.12, 0.41, ...] (similar!)
"database migration"       -> [0.11,  0.67, -0.33, ...] (different)
```

| Embedding Model | Dimensions | Best For |
|---|---|---|
| OpenAI text-embedding-3-small | 1536 | General purpose, good quality/cost |
| Voyage Code 3 | 1024 | Code-specific, understands syntax |
| Nomic Embed | 768 | Open source, self-hostable |

### Vector Databases

| Database | Type | Best For |
|---|---|---|
| pgvector | Postgres extension | Already using Postgres, simple setup |
| Chroma | Lightweight, local | Prototyping, small projects |
| Pinecone | Managed cloud | Production scale, zero ops |
| Weaviate | Self-hosted or cloud | Hybrid search (vector + keyword) |

`pgvector` is the easiest starting point — no new infrastructure, just a Postgres extension.

```sql
-- pgvector: add vector column to existing table
ALTER TABLE docs ADD COLUMN embedding vector(1536);

-- Find 5 most similar documents
SELECT content, 1 - (embedding <=> query_vec) AS similarity
FROM docs ORDER BY embedding <=> query_vec LIMIT 5;
```

### Chunking Strategies

How you split your data determines retrieval quality.

| Strategy | How it works | Best for |
|---|---|---|
| Fixed-size | Split every N tokens with overlap | Documents, articles |
| Semantic | Split at paragraph/section boundaries | Structured docs, markdown |
| AST-based | Split at function/class boundaries | Source code |
| Sliding window | Overlapping chunks for context continuity | Long narratives |

For code, use AST-based chunking — a function split across two chunks loses meaning:

```javascript
// Good: one chunk per function
chunk_1: function authenticate(user, pass) { ... }
chunk_2: function validateToken(token) { ... }

// Bad: split mid-function
chunk_1: function authenticate(user, pass) { if (user
chunk_2: === null) { return false; } ... }
```

**Common pitfalls:** chunks too large (noisy), chunks too small (no context), no overlap (missed boundaries), stale index (data changed but embeddings didn't).

---

## 23. AI Code Review at Scale

### Automated PR Review

```yaml
# .github/workflows/ai-review.yml
name: AI Code Review
on:
  pull_request:
    types: [opened, synchronize]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Claude Code Review
        run: |
          claude -p "Review this PR diff.
          Categorize findings as:
          - MUST FIX: bugs, security issues
          - SHOULD CONSIDER: performance, readability
          - MINOR: style, naming suggestions
          Be specific. Reference file:line."
```

### Structured Review Output

```markdown
## MUST FIX (2 issues)
1. **SQL Injection** - `src/api/users.ts:42`
   Raw string interpolation in query.
   Use parameterized queries instead.
2. **Missing auth check** - `src/api/admin.ts:15`
   Admin endpoint has no authentication middleware.

## SHOULD CONSIDER (1 issue)
1. **N+1 query** - `src/api/posts.ts:28`
   Fetching author inside a loop. Use JOIN.

## MINOR (1 issue)
1. **Naming** - `src/utils/helpers.ts:5`
   `processData()` too generic → `transformUserResponse()`
```

The human reviewer still makes the final call. AI review is a first pass, not a replacement.

---

## 24. The Future of AI Engineering

### Emerging Trends

**Computer Use Agents** — AI that uses a browser, clicks buttons, fills forms. Testing: "Verify the signup flow works end-to-end."

**Multi-Modal Agents** — Screenshots + code + logs + docs in one context. "Here's the Figma design, here's the current page, make them match."

**Agent Marketplaces** — Pre-built agents for specific tasks (security audit, migration, i18n). Plug into your CI/CD pipeline.

**AI as Infrastructure** — AI becomes a standard pipeline stage, not a tool you invoke manually.

### Career Implications

| Old World | New World |
|---|---|
| Write code from scratch | Direct AI to write code, review output |
| Memorize syntax | Understand architecture and systems |
| Individual productivity | Orchestrate AI agents and human teams |
| Debug by reading code | Debug by asking the right questions |

The differentiator: understanding both engineering fundamentals AND AI tooling. That combination is rare and valuable.

### The Learning Arc

```
Weeks 1-3:   Understanding AI       — "What are LLMs? How do prompts work?"
Weeks 4-5:   Using AI (Claude Web)  — "I can build prototypes with AI!"
Weeks 6-8:   Coding with AI (IDE)   — "AI is my pair programmer"
Weeks 10-12: Engineering with AI    — "AI is part of my development infrastructure"
Weeks 13-14: Architecting with AI   — "I can design AI-powered systems"
```

---

## 25. Quick Reference Card

```bash
# Session control
claude                    # Start new session
claude --continue         # Resume last session
claude --resume           # Pick a session
claude --worktree         # Start in an isolated worktree

# In-session commands
/init                     # Generate CLAUDE.md from project scan
/clear                    # Reset context (keep CLAUDE.md)
/compact                  # Summarize + compress context
/rewind                   # Roll back to a checkpoint
/context                  # Show token usage
/model sonnet|opus|haiku  # Switch model

# Planning
(plan) your task here     # Enter plan mode
Shift+Tab                 # Toggle plan mode

# Sandbox
claude --sandbox          # Run in sandbox mode

# Non-interactive
claude -p "prompt"                              # One-shot
claude -p "prompt" --output-format json        # Structured output
claude -p "prompt" --allowedTools "Read,Grep,Glob"  # Read-only
claude -p "prompt" --timeout 120000            # With timeout
claude -p "prompt" --max-budget-usd 5.00       # With budget cap

# MCP
claude mcp add <name> -- <command>             # Add an MCP server

# Performance & cost
npx lighthouse https://myapp.vercel.app \
  --output=json --output-path=./report.json    # Generate perf report
cat report.json | claude -p "Top 3 fixes..."  # AI analysis

# Deployment
vercel                    # Deploy to preview
vercel --prod             # Deploy to production

# Security pipeline
gitleaks protect --staged                # Gate 1: secrets
npm audit                                # Gate 2: dependencies
semgrep --config auto src/              # Gate 3: SAST
npx @cyclonedx/cyclonedx-npm \
  --output-file sbom.json               # Gate 8: SBOM
```

---

## 26. Resources

### Weeks 10–11: Claude Code Foundations & Context

**Required**
| Resource | URL |
|---|---|
| Claude Code Overview | code.claude.com/docs/en/overview |
| CLAUDE.md — Project Instructions | code.claude.com/docs/en/claude-md |
| Context Management | code.claude.com/docs/en/context-management |
| Anthropic Skilljar Course Modules 1–3 | anthropic.skilljar.com/claude-code-in-action |

**Recommended**
| Resource | URL |
|---|---|
| Claude Code Best Practices | code.claude.com/docs/en/best-practices |

---

### Week 11: TDD & CI/CD

**Required**
| Resource | URL |
|---|---|
| Jest Documentation | jestjs.io/docs/getting-started |
| Vitest Documentation | vitest.dev/guide |
| GitHub Actions Documentation | docs.github.com/en/actions |
| Claude Code in GitHub Actions | code.claude.com/docs/en/github-actions |
| Anthropic Skilljar Course Modules 4 & 7 | anthropic.skilljar.com/claude-code-in-action |

**Recommended**
| Resource | URL |
|---|---|
| Claude Code CLI Reference | code.claude.com/docs/en/cli-reference |

---

### Week 12: Extensibility — Skills, Hooks & MCP

**Required**
| Resource | URL |
|---|---|
| Skills | code.claude.com/docs/en/skills |
| Hooks | code.claude.com/docs/en/hooks |
| MCP Servers | code.claude.com/docs/en/mcp |
| MCP Specification | modelcontextprotocol.io |
| Anthropic Skilljar Course Modules 5 & 6 | anthropic.skilljar.com/claude-code-in-action |

**Recommended**
| Resource | URL |
|---|---|
| MCP GitHub Repository | github.com/modelcontextprotocol |

---

### Weeks 13–14: Agent Architectures, Security & Production

**Required**
| Resource | URL |
|---|---|
| Building Effective Agents | anthropic.com/engineering/building-effective-agents |
| Claude Agent SDK | platform.claude.com/docs/en/agent-sdk/overview |
| Prompt Caching | platform.claude.com/docs/en/build-with-claude/prompt-caching |
| OWASP Top 10 | owasp.org/www-project-top-ten |

**Recommended**
| Resource | URL |
|---|---|
| OpenSSF AI Code Security Guide | best.openssf.org/Security-Focused-Guide-AI-Code-Assistant-Instructions |
| GitHub Actions Documentation | docs.github.com/en/actions |

---

*Last updated: Week 14 — Production Readiness & Emerging AI Engineering (CS 7180, Spring 2026)*
