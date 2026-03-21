# GeoSim API Route Map

All routes are Next.js App Router API routes under `/app/api/`.
Auth is handled via Supabase middleware — all routes except public
reads require authentication.

---

## Scenarios

```
GET    /api/scenarios                   List scenarios (public + user's private)
  ?category=geopolitical_conflict       Filter by category
  ?visibility=public                    Filter by visibility
  ?sort=rating|recent|popular           Sort order
  ?page=1&limit=20                      Pagination

POST   /api/scenarios                   Create new scenario
  Body: { name, description, category, dimensions, tags }
  Returns: scenario object with id

GET    /api/scenarios/[id]              Get scenario details + actors + trunk info
PATCH  /api/scenarios/[id]              Update scenario metadata
DELETE /api/scenarios/[id]              Delete scenario (and all branches/commits)

POST   /api/scenarios/[id]/publish      Publish scenario to public library
POST   /api/scenarios/[id]/rate         Rate a public scenario
  Body: { rating: 1-5, review?: string }
```

## Research Pipeline

```
POST   /api/scenarios/[id]/research/frame
  Run Stage 0: scenario framing
  Body: { userDescription: string }
  Returns: { frame: ScenarioFrame, clarifyingQuestions: Question[] }

POST   /api/scenarios/[id]/research/frame/confirm
  Confirm Stage 0 with user's clarification answers
  Body: { clarifications: Record<string, string> }
  Returns: { confirmedFrame: ScenarioFrame }

POST   /api/scenarios/[id]/research/populate
  Run Stages 1-6 (full pipeline)
  This is a long-running operation — returns immediately with a job id.
  Client polls for status or uses Supabase realtime subscription.
  Body: { confirmedFrame: ScenarioFrame, userDescription: string }
  Returns: { jobId: string, status: "started" }

GET    /api/scenarios/[id]/research/status
  Check research pipeline progress
  Returns: { stage: 0-6, status: "running"|"complete"|"error", progress: string }

POST   /api/scenarios/[id]/research/update-trunk
  Run a focused research update on the ground truth trunk
  Body: { focusAreas?: string[] }  // e.g. ["military developments", "diplomatic"]
  Returns: { newEvents: Event[], stateUpdates: any[] }
```

## Branches

```
GET    /api/scenarios/[id]/branches     List all branches for a scenario
  ?visibility=public                    Filter
  ?status=active                        Filter

POST   /api/scenarios/[id]/branches     Create new branch (fork)
  Body: {
    name: string,
    description?: string,
    forkFromCommitId: string,           // which commit to branch from
    gameMode: "observer"|"single_actor"|"free_roam",
    userControlledActors?: string[],    // actor ids
    visibility?: "private"|"public"
  }
  Returns: branch object with inherited history

GET    /api/branches/[id]               Get branch details + head commit
PATCH  /api/branches/[id]               Update branch metadata
DELETE /api/branches/[id]               Delete branch (keeps parent commits)
```

## Turn Commits (Game History)

```
GET    /api/branches/[id]/commits       List all commits on a branch
  ?limit=20&offset=0                    Pagination
  Returns: ordered list of turn summaries (not full snapshots)

GET    /api/commits/[id]                Get full commit (includes scenario_snapshot)
GET    /api/commits/[id]/snapshot       Get just the scenario snapshot
GET    /api/commits/[id]/narrative      Get just the narrative entry
GET    /api/commits/[id]/decisions      Get planning phase decisions
GET    /api/commits/[id]/resolution     Get resolution phase results
GET    /api/commits/[id]/eval           Get judging phase scores
```

## Game Loop

```
POST   /api/branches/[id]/turns/start
  Start a new turn on this branch
  Creates a new commit in "planning" phase
  Returns: {
    turnNumber: number,
    commitId: string,
    currentState: Scenario,
    // comprehensive decision catalog per actor, each with parameters and profiles
    availableDecisions: {
      actorId: string,
      decisions: Decision[],        // 8-12+ decisions per actor across all dimensions
      ongoingOperations: ActiveOperation[]  // carries over from previous turns
    }[]
  }

POST   /api/branches/[id]/turns/plan
  Submit the user's TurnPlan for the current turn
  Body: {
    actorId: string,
    primaryAction: {
      decisionId: string,
      selectedProfile: string | null,     // named profile or null for default
      customParameters?: { parameterName: string, selectedOptionId: string }[]
    },
    concurrentActions: {
      decisionId: string,
      selectedProfile: string | null,
      customParameters?: { parameterName: string, selectedOptionId: string }[]
    }[],
    resourceAllocation: { decisionId: string, percent: number }[]
  }
  Returns: {
    accepted: boolean,
    validationErrors?: string[],    // e.g. "incompatible actions", "over resource budget"
    synergiesDetected: string[],
    tensionsDetected: string[],
    phase: "planning" | "ready_to_resolve"
  }

POST   /api/branches/[id]/turns/resolve
  Trigger resolution (runs after all plans are in)
  Long-running — streams progress via Supabase realtime
  Returns: { jobId: string }

GET    /api/branches/[id]/turns/status
  Check current turn progress
  Returns: { phase, progress, partialResults? }

POST   /api/branches/[id]/turns/react
  Submit a reaction-phase TurnPlan (lighter — 1-2 actions typical)
  Body: {
    actorId: string,
    reactingTo: string,
    actions: {
      decisionId: string,
      selectedProfile: string | null,
      customParameters?: { parameterName: string, selectedOptionId: string }[]
    }[]
  }
  Returns: { accepted: boolean }

POST   /api/branches/[id]/turns/advance
  Finalize the turn and advance
  Returns: { commitId: string, turnNumber: number }

POST   /api/branches/[id]/rewind
  Rewind branch HEAD to a previous commit
  Body: { targetCommitId: string }
  Returns: { newHead: string }
```

## Decision Support Endpoints

```
POST   /api/ai/analyze-decision
  Deep analysis of a specific decision with all parameter profiles
  Body: {
    decisionId: string,
    actorState: ActorState,
    scenarioSnapshot: Scenario
  }
  Returns: DecisionAnalysis (costs/outcomes per profile, concurrency analysis)

POST   /api/ai/evaluate-custom-decision
  Evaluate a user-proposed custom decision — generates full parameters,
  profiles, concurrency rules, costs, and outcomes
  Body: {
    description: string,
    actorId: string,
    scenarioSnapshot: Scenario
  }
  Returns: Decision (fully structured with parameters and profiles)

POST   /api/ai/validate-turn-plan
  Check a proposed TurnPlan for compatibility issues before submission
  Body: {
    actorId: string,
    primaryDecisionId: string,
    concurrentDecisionIds: string[],
    resourceAllocation: { decisionId: string, percent: number }[]
  }
  Returns: {
    valid: boolean,
    errors: string[],
    warnings: string[],
    synergies: { actions: string[], bonus: string }[],
    tensions: { actions: string[], penalty: string }[],
    resourceUtilization: number     // % of capacity used
  }

POST   /api/ai/compare-profiles
  Compare parameter profiles for a specific decision side by side
  Body: {
    decisionId: string,
    profileNames: string[],         // e.g. ["Surgical raid", "Overwhelming force"]
    actorState: ActorState,
    scenarioSnapshot: Scenario
  }
  Returns: {
    comparison: {
      dimension: string,
      profiles: { name: string, value: string }[]
    }[],
    recommendation: { profile: string, rationale: string }
  }
```

## AI Agent Endpoints (internal, called by game loop)

```
POST   /api/ai/actor-agent
  Run an actor agent to generate comprehensive decisions and TurnPlan
  Body: {
    actorId: string,
    fogOfWarContext: ActorAgentContext,
    scenarioFrame: ActorFraming
  }
  Returns: {
    situationAssessment: string,
    availableDecisions: Decision[],   // 8-12+ with full parameters and profiles
    turnPlan: TurnPlan,               // primary + concurrent actions
    customDecision: Decision | null
  }

POST   /api/ai/resolution-engine
  Run the resolution engine on all TurnPlans
  Body: {
    fullScenario: Scenario,
    turnPlans: TurnPlan[],
    isReactionPhase?: boolean,
    previousAttempt?: ResolutionResult,
    judgeFeedback?: any[]
  }
  Returns: ResolutionResult (with per-action outcomes, synergy/tension effects)

POST   /api/ai/judge
  Run the judge evaluator on a resolved turn
  Body: {
    previousState: Scenario,
    currentState: Scenario,
    resolvedEvents: Event[],
    turnPlans: TurnPlan[]
  }
  Returns: JudgingResult

POST   /api/ai/narrator
  Generate a chronicle narrative entry
  Body: {
    turnNumber: number,
    resolutionResult: ResolutionResult,
    previousNarratives?: string[]
  }
  Returns: { narrative: string, title: string, severity: string, keyTags: string[] }
```

## Actors (scenario-level, static data)

```
GET    /api/scenarios/[id]/actors       List all actors in a scenario
GET    /api/scenarios/[id]/actors/[actorId]  Get actor profile
PATCH  /api/scenarios/[id]/actors/[actorId]  Update actor profile/config
```

## Actor State (from a specific commit, dynamic data)

```
GET    /api/commits/[id]/actors/[actorId]/state
  Get an actor's full state at a specific commit
  Returns: ActorState (from the commit's scenario_snapshot)

GET    /api/commits/[id]/actors/[actorId]/intel
  Get an actor's intelligence picture at a specific commit
  ?omniscient=true  // include unknown unknowns (observer mode only)
  Returns: IntelligencePicture[]

GET    /api/commits/[id]/actors/[actorId]/escalation
  Get actor's escalation ladder position at a specific commit
  Returns: EscalationLadder with current rung highlighted
```

## Eval Metrics

```
GET    /api/scenarios/[id]/evals        Aggregate eval metrics for a scenario
  Returns: { averageScores, biasAnalysis, historicalTrend }

GET    /api/branches/[id]/evals         Eval metrics for a specific branch
  Returns: per-turn scores and trend

GET    /api/evals/bias-report/[scenarioId]
  Bias analysis across all branches of a scenario
  Returns: { outcomeFavoredActors, sourceDistribution, rationalityByActor }
```

## Realtime Subscriptions (Supabase Realtime)

```
Channel: scenario:[id]
  Events: scenario_updated, actor_added, trunk_updated

Channel: branch:[id]
  Events: turn_started, decision_submitted, resolution_progress,
          turn_completed, branch_rewound

Channel: commit:[id]
  Events: phase_changed, narrative_ready, eval_ready
```
