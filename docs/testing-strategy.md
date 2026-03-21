# GeoSim Testing Strategy & TDD Plan

This document covers the testing approach for the project AND serves
as the plan for HW4 (TDD through Claude Code) and HW5 (custom skills).

---

## Testing Stack

| Tool | Purpose |
|---|---|
| Vitest | Unit and integration tests (fast, Vite-native) |
| React Testing Library | Component tests |
| Playwright | E2E tests (also serves as HW5 MCP integration) |
| MSW (Mock Service Worker) | API mocking for frontend tests |
| Supabase local | Database testing with real Postgres |

---

## What to Test (prioritized)

### Tier 1: Must test (core logic, high risk)

These are the functions where bugs would break the simulation.
TDD these — write tests FIRST, then implement.

**1. Fog of war filtering**
The function that takes omniscient state and filters it to what
a specific actor can see. If this is wrong, actors make decisions
on wrong information (in the wrong way — not the intentional way).

```typescript
// tests/game/fog-of-war.test.ts

describe("buildFogOfWarContext", () => {
  it("should include events the actor initiated", () => {});
  it("should include events that targeted the actor", () => {});
  it("should include major public events", () => {});
  it("should include events shared by intel partners", () => {});
  it("should EXCLUDE covert events by adversaries", () => {});
  it("should use BELIEVED state, not true state", () => {});
  it("should not leak unknown unknowns to actor", () => {});
  it("should include intel from sharing partners", () => {});
});
```

**2. Branch/commit operations**
The git-like branching system. If forking or rewinding loses data
or corrupts state, the entire game history is broken.

```typescript
// tests/game/branching.test.ts

describe("branch operations", () => {
  describe("fork", () => {
    it("should create a new branch at the specified commit", () => {});
    it("should inherit all parent history by reference", () => {});
    it("should not duplicate parent commits in DB", () => {});
    it("should set head to fork point", () => {});
  });

  describe("rewind", () => {
    it("should move head to target commit", () => {});
    it("should not delete forward commits", () => {});
    it("should allow branching from rewound position", () => {});
  });

  describe("commit creation", () => {
    it("should be immutable once created", () => {});
    it("should link to parent commit", () => {});
    it("should contain full scenario snapshot", () => {});
    it("should increment turn number", () => {});
  });
});
```

**3. Escalation ladder logic**
The rules for when actors can escalate, what triggers movement,
and whether constraints allow it.

```typescript
// tests/game/escalation.test.ts

describe("escalation logic", () => {
  it("should not allow escalation past hard constraints", () => {});
  it("should allow escalation past soft constraints with cost", () => {});
  it("should allow escalation skip when trigger conditions met", () => {});
  it("should identify when constraint cascade enables new rung", () => {});
  it("should track constraint status changes from events", () => {});
  it("should calculate de-escalation options", () => {});
});
```

**3b. TurnPlan validation**
Multi-action plans must be validated for compatibility, resource
budgets, and logical consistency.

```typescript
// tests/game/turn-plan.test.ts

describe("validateTurnPlan", () => {
  describe("concurrency rules", () => {
    it("should allow compatible light + light actions", () => {});
    it("should allow compatible heavy + light actions", () => {});
    it("should reject two heavy actions simultaneously", () => {});
    it("should reject total + any other action", () => {});
    it("should reject explicitly incompatible actions", () => {});
    it("should accept explicitly compatible actions", () => {});
  });

  describe("resource allocation", () => {
    it("should require allocation summing to 100%", () => {});
    it("should reject allocation over 100%", () => {});
    it("should reject 0% allocation to any selected action", () => {});
    it("should warn when primary action gets less than 50%", () => {});
  });

  describe("synergy and tension detection", () => {
    it("should identify synergies between paired actions", () => {});
    it("should identify tensions between conflicting actions", () => {});
    it("should flag diplomatic + escalation tension", () => {});
    it("should recognize air campaign + ground op synergy", () => {});
  });

  describe("parameter validation", () => {
    it("should accept valid parameter profile selections", () => {});
    it("should accept custom parameter combinations", () => {});
    it("should reject invalid parameter option IDs", () => {});
    it("should apply cost modifiers from selected parameters", () => {});
    it("should adjust escalation rung based on parameter choices", () => {});
  });
});
```

**4. Turn resolution orchestration**
The game loop controller that manages the phase sequence.

```typescript
// tests/game/turn-loop.test.ts

describe("turn loop", () => {
  it("should run all actor agents in parallel", () => {});
  it("should pass fog-of-war context to each actor agent", () => {});
  it("should collect all decisions before resolving", () => {});
  it("should pass all decisions to resolution engine", () => {});
  it("should identify immediate reaction triggers", () => {});
  it("should run reaction phase only for triggered actors", () => {});
  it("should run judge after all resolution complete", () => {});
  it("should run narrator after judge", () => {});
  it("should create immutable commit with all results", () => {});
  it("should update branch head to new commit", () => {});
});
```

**5. State update application**
Applying event impacts to actor states correctly.

```typescript
// tests/game/state-updates.test.ts

describe("applyStateUpdates", () => {
  it("should update military readiness from event impacts", () => {});
  it("should deplete assets based on operations", () => {});
  it("should update oil price from energy events", () => {});
  it("should update domestic support from political events", () => {});
  it("should update relationship strength from diplomatic events", () => {});
  it("should track asset depletion trends", () => {});
  it("should update intelligence pictures from intel events", () => {});
  it("should mark constraints as weakened/removed from events", () => {});
  it("should not mutate the original scenario object", () => {});
});
```

### Tier 2: Should test (important but lower risk)

**6. API route validation**
Input validation on all API routes — malformed requests should
return clear errors, not crash.

```typescript
// tests/api/scenarios.test.ts

describe("POST /api/scenarios", () => {
  it("should require authentication", () => {});
  it("should validate required fields", () => {});
  it("should reject invalid category", () => {});
  it("should create scenario and return id", () => {});
  it("should set created_by to authenticated user", () => {});
});

// tests/api/game-loop.test.ts

describe("POST /api/branches/[id]/turns/decide", () => {
  it("should reject decision for actor user doesn't control", () => {});
  it("should reject decision when not in planning phase", () => {});
  it("should accept valid decision", () => {});
  it("should validate custom decision structure", () => {});
});
```

**7. AI prompt construction**
Verify that prompts are correctly assembled with the right context.

```typescript
// tests/ai/prompt-construction.test.ts

describe("buildActorAgentPrompt", () => {
  it("should include neutrality preamble", () => {});
  it("should inject actor-specific parameters", () => {});
  it("should include win/lose conditions", () => {});
  it("should include cultural context", () => {});
});

describe("fog of war context for AI", () => {
  it("should send believed state, not true state", () => {});
  it("should not include unknown unknowns in actor prompt", () => {});
  it("should include intel from sharing partners", () => {});
});
```

**8. Component rendering**
Key UI components render correctly with different data states.

```typescript
// tests/components/actor-state.test.tsx

describe("ActorDetailPanel", () => {
  it("should render all state dimensions", () => {});
  it("should show influence channels with bar charts", () => {});
  it("should hide unknown unknowns when not in omniscient mode", () => {});
  it("should show escalation ladder with current rung highlighted", () => {});
});

// tests/components/decision-analysis.test.tsx

describe("DecisionAnalysis", () => {
  it("should show constraint warnings for violating decisions", () => {});
  it("should show intel gap warnings", () => {});
  it("should render all projected outcomes", () => {});
  it("should show anticipated responses from all actors", () => {});
});
```

### Tier 3: Nice to test (E2E, integration)

**9. E2E game flow** (Playwright — also serves as HW5 MCP)

```typescript
// tests/e2e/game-flow.spec.ts

test("complete game turn", async ({ page }) => {
  // login
  // navigate to scenario
  // create branch
  // start turn
  // view available decisions
  // select a decision
  // advance to resolution
  // verify chronicle entry appears
  // verify state changed
});

test("branch and rewind", async ({ page }) => {
  // play 3 turns
  // rewind to turn 1
  // create branch
  // make different decision
  // verify branch diverges
});
```

---

## TDD Workflow (for HW4)

### The red-green-refactor cycle through Claude Code

Each feature follows this commit pattern:

```
1. RED commit:    "test: add failing tests for fog-of-war filtering"
   - Write comprehensive test cases
   - Run tests — all fail
   - Commit the failing tests

2. GREEN commit:  "feat: implement fog-of-war filtering (passes tests)"
   - Have Claude Code implement minimum code to pass
   - Run tests — all pass
   - Commit the implementation

3. REFACTOR commit: "refactor: clean up fog-of-war implementation"
   - Improve code quality without changing behavior
   - Run tests — still all pass
   - Commit the refactoring
```

### Recommended TDD features (in order)

These are the features to TDD for HW4, chosen because they have
clear acceptance criteria and testable boundaries:

1. **Fog of war filtering** — pure function, highly testable
2. **Branch/commit CRUD** — database operations, clear inputs/outputs
3. **Escalation ladder logic** — rule-based, deterministic
4. **State update application** — pure function, complex but testable
5. **Turn loop orchestration** — integration test with mocked AI calls

### Git history should look like:

```
abc1234 test: add failing tests for fog-of-war filtering
def5678 feat: implement buildFogOfWarContext
ghi9012 refactor: extract actorWouldKnowAbout helper

jkl3456 test: add failing tests for branch operations
mno7890 feat: implement fork, rewind, commit creation
pqr1234 refactor: add transaction safety to fork operation

stu5678 test: add failing tests for escalation logic
vwx9012 feat: implement escalation validation and constraint cascades
yza3456 refactor: simplify constraint status tracking
```

---

## Mocking Strategy

### AI API calls (most critical to mock)

All AI calls go through `/api/ai/*` routes. In tests, mock
these with predetermined responses:

```typescript
// tests/mocks/ai-responses.ts

export const mockActorAgentResponse = {
  situationAssessment: "The current situation...",
  availableDecisions: [/* mock decisions */],
  selectedDecision: {/* mock decision */},
  rationale: "Given our objectives...",
  anticipatedResponses: [],
  customDecision: null
};

export const mockResolutionResponse = {
  resolvedEvents: [/* mock events */],
  stateUpdates: [/* mock deltas */],
  escalationChanges: [],
  reactionTriggers: [],
  globalStateUpdate: {},
  turnNarrative: "In the third week of the conflict..."
};
```

### Supabase (for unit tests)

Use Supabase local instance for integration tests.
For pure unit tests, mock the Supabase client:

```typescript
// tests/mocks/supabase.ts

export const mockSupabase = {
  from: (table: string) => ({
    select: () => ({ data: [], error: null }),
    insert: (data: any) => ({ data, error: null }),
    update: (data: any) => ({ data, error: null }),
    delete: () => ({ data: null, error: null }),
  }),
};
```

---

## CI Integration

### Vitest in CI (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run test          # vitest
      - run: npm run test:coverage # coverage report

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install
      - run: npm run build
      - run: npm run test:e2e      # playwright
```

### Performance gates (for rubric)

```yaml
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci && npm run build
      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: ${{ env.PREVIEW_URL }}
          budgetPath: ./lighthouse-budget.json
```

---

## Test File Organization

```
tests/
├── game/                    ← core simulation logic (Tier 1)
│   ├── fog-of-war.test.ts
│   ├── branching.test.ts
│   ├── escalation.test.ts
│   ├── turn-loop.test.ts
│   └── state-updates.test.ts
│
├── api/                     ← API route tests (Tier 2)
│   ├── scenarios.test.ts
│   ├── branches.test.ts
│   └── game-loop.test.ts
│
├── ai/                      ← prompt construction tests (Tier 2)
│   └── prompt-construction.test.ts
│
├── components/              ← component tests (Tier 2)
│   ├── actor-state.test.tsx
│   ├── decision-analysis.test.tsx
│   └── chronicle.test.tsx
│
├── e2e/                     ← end-to-end tests (Tier 3)
│   ├── game-flow.spec.ts
│   └── scenario-creation.spec.ts
│
└── mocks/                   ← shared mocks
    ├── ai-responses.ts
    ├── scenario-data.ts     ← mock Iran scenario for tests
    └── supabase.ts
```
