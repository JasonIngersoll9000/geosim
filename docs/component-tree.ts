// ============================================================
// GEOSIM COMPONENT TREE & STATE MANAGEMENT
// Next.js App Router + React Context + Supabase Realtime
// ============================================================

// ------------------------------------------------------------
// APP ROUTES (Next.js App Router file structure)
// ------------------------------------------------------------

/*
app/
├── layout.tsx                    Root layout (auth provider, theme)
├── page.tsx                      Landing / home
│
├── auth/
│   ├── login/page.tsx
│   └── signup/page.tsx
│
├── scenarios/
│   ├── page.tsx                  Scenario browser (public library)
│   ├── new/page.tsx              Scenario creation wizard
│   └── [id]/
│       ├── page.tsx              Scenario overview (info, branches, tree viz)
│       ├── research/page.tsx     Research pipeline status/management
│       └── play/
│           └── [branchId]/
│               └── page.tsx      ** THE MAIN GAME VIEW **
│
├── chronicle/
│   └── [branchId]/page.tsx       Full-page war chronicle view
│
├── admin/
│   └── page.tsx                  Admin dashboard (eval metrics, bias reports)
│
└── api/                          API routes (see API route map)
*/

// ------------------------------------------------------------
// STATE MANAGEMENT STRATEGY
// ------------------------------------------------------------

/*
Three layers of state:

1. SERVER STATE (Supabase)
   - Scenarios, branches, commits, actors, evals
   - Fetched via React Server Components where possible
   - Mutated via API routes
   - Realtime updates via Supabase subscriptions

2. GAME STATE (React Context)
   - Current turn, selected actor, game mode, fog-of-war toggle
   - The "lens" through which the user views the simulation
   - Changes frequently during gameplay, doesn't need persistence

3. UI STATE (Component-local useState)
   - Panel tabs, expanded sections, map zoom, sidebar open/closed
   - Ephemeral, never persisted
*/

// ------------------------------------------------------------
// GAME STATE CONTEXT
// The primary React context for the game view.
// ------------------------------------------------------------

import { createContext, useContext, useReducer } from "react";

interface GameState {
  // current position in the simulation
  scenarioId: string;
  branchId: string;
  currentCommitId: string | null;
  turnNumber: number;
  turnPhase: "planning" | "resolution" | "reaction" | "judging" | "complete";

  // game mode
  gameMode: "observer" | "single_actor" | "free_roam";
  userControlledActors: string[];

  // what the user is looking at
  selectedActorId: string | null;       // which actor panel is open
  selectedDecisionId: string | null;    // which decision is being analyzed
  viewMode: "map" | "chronicle";        // main view toggle

  // fog of war control (observer mode)
  omniscientView: boolean;              // show true state or fog of war
  perspectiveActorId: string | null;    // whose perspective to view from

  // data loaded from server
  scenarioSnapshot: Scenario | null;    // current turn state
  availableDecisions: Record<string, Decision[]>; // per actor
  pendingDecisions: Record<string, Decision>;     // user's submitted decisions
  resolutionResult: ResolutionResult | null;
  reactionTriggers: ReactionTrigger[];

  // loading states
  isResolutionRunning: boolean;
  isResearchRunning: boolean;
  resolutionProgress: string;
}

type GameAction =
  | { type: "SET_SCENARIO"; payload: { scenarioId: string; branchId: string } }
  | { type: "SET_COMMIT"; payload: { commitId: string; turnNumber: number; snapshot: Scenario } }
  | { type: "SET_TURN_PHASE"; payload: TurnPhase }
  | { type: "SELECT_ACTOR"; payload: string | null }
  | { type: "SELECT_DECISION"; payload: string | null }
  | { type: "SET_VIEW_MODE"; payload: "map" | "chronicle" }
  | { type: "TOGGLE_OMNISCIENT" }
  | { type: "SET_PERSPECTIVE"; payload: string | null }
  | { type: "SET_AVAILABLE_DECISIONS"; payload: Record<string, Decision[]> }
  | { type: "SUBMIT_DECISION"; payload: { actorId: string; decision: Decision } }
  | { type: "SET_RESOLUTION_RESULT"; payload: ResolutionResult }
  | { type: "SET_REACTION_TRIGGERS"; payload: ReactionTrigger[] }
  | { type: "SET_RESOLUTION_RUNNING"; payload: boolean }
  | { type: "SET_RESOLUTION_PROGRESS"; payload: string }
  | { type: "RESET_TURN" };

// GameContext provides state + dispatch to all game components
const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
} | null>(null);

function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}

// ------------------------------------------------------------
// COMPONENT TREE — GAME VIEW
// The main gameplay screen (split screen map + panels)
// Located at: app/scenarios/[id]/play/[branchId]/page.tsx
// ------------------------------------------------------------

/*
<GameProvider>                          ← wraps everything in GameContext
  <GameLayout>                          ← split screen container
    │
    ├── <MapSide>                       ← left 60%
    │   ├── <GameMap>                   ← Mapbox GL canvas
    │   │   ├── <ActorLayer>            ← country fills by actor color
    │   │   ├── <AssetMarkers>          ← military assets, facilities
    │   │   ├── <ChokepointMarkers>     ← Strait of Hormuz, etc.
    │   │   ├── <StrikeAnimations>      ← animated during resolution
    │   │   └── <AirDefenseRanges>      ← dashed circles (Tier 2)
    │   │
    │   ├── <MapLegend>                 ← actor colors, asset types
    │   └── <MapControls>               ← zoom, layer toggles
    │
    ├── <PanelSide>                     ← right 40%
    │   ├── <PanelHeader>               ← scenario name, turn/phase info
    │   │
    │   ├── <PanelTabs>                 ← tab navigation
    │   │   ├── tab: "Actors"
    │   │   ├── tab: "Decisions"
    │   │   ├── tab: "Events"
    │   │   └── tab: "Chronicle"
    │   │
    │   ├── <TabContent>                ← renders active tab
    │   │   │
    │   │   ├── [Actors tab]
    │   │   │   ├── <ActorList>         ← all actors with escalation badges
    │   │   │   │   └── <ActorRow>      ← click to expand/select
    │   │   │   ├── <GlobalIndicators>  ← oil price, stability, etc.
    │   │   │   └── <ActorDetailPanel>  ← expanded actor state (slide-over)
    │   │   │       ├── <KeyFigures>
    │   │   │       ├── <MilitaryState>
    │   │   │       │   └── <AssetTable>
    │   │   │       ├── <EconomicState>
    │   │   │       ├── <PoliticalState>
    │   │   │       │   ├── <InfluenceChannels>
    │   │   │       │   └── <PolicyDisconnect>
    │   │   │       ├── <ObjectivesList>
    │   │   │       ├── <ConstraintsList>
    │   │   │       ├── <EscalationLadderViz>
    │   │   │       └── <IntelligencePicture>
    │   │   │           ├── <BelievedStates>
    │   │   │           ├── <KnownUnknowns>
    │   │   │           └── <UnknownUnknowns>   ← observer mode only
    │   │   │
    │   │   ├── [Decisions tab]
    │   │   │   ├── <DecisionCatalog>    ← full list grouped by dimension
    │   │   │   │   ├── <DimensionGroup>  ← "Military", "Economic", "Diplomatic", etc.
    │   │   │   │   │   └── <DecisionCard> ← title, escalation tag, resource weight, dimension
    │   │   │   │   └── <CustomDecisionInput>
    │   │   │   │
    │   │   │   ├── <TurnPlanBuilder>    ← the multi-action planning area
    │   │   │   │   ├── <PrimaryActionSlot>   ← required, drop target
    │   │   │   │   ├── <ConcurrentActionSlots> ← 0-3 optional slots
    │   │   │   │   ├── <ResourceAllocator>   ← sliders summing to 100%
    │   │   │   │   ├── <PlanValidator>       ← live compatibility checks
    │   │   │   │   │   ├── <IncompatibilityWarnings>
    │   │   │   │   │   ├── <SynergyHighlights>
    │   │   │   │   │   └── <ResourceBudgetMeter>
    │   │   │   │   └── <PlanSubmitButton>
    │   │   │   │
    │   │   │   └── <DecisionDetailPanel>  ← expanded analysis (slide-over)
    │   │   │       ├── <StrategicRationale>
    │   │   │       ├── <ParameterConfigurator>
    │   │   │       │   ├── <ParameterRow>     ← one per parameter
    │   │   │       │   │   └── <ParameterOptionSelector>  ← dropdown/toggle
    │   │   │       │   └── <ProfileQuickPicks> ← named profiles as cards
    │   │   │       │       └── <ProfileCard>   ← "Surgical raid", "Overwhelming force"
    │   │   │       ├── <LiveCostPreview>       ← updates as parameters change
    │   │   │       ├── <OutcomesByProfile>     ← outcomes per profile, not generic
    │   │   │       │   └── <ProfileOutcomeCard>
    │   │   │       │       ├── <CascadingEffects>
    │   │   │       │       └── <PerceptionByActor>
    │   │   │       ├── <ConcurrencyIndicators>
    │   │   │       │   ├── <CompatibleBadges>
    │   │   │       │   ├── <IncompatibleBadges>
    │   │   │       │   └── <SynergyBonuses>
    │   │   │       ├── <ConstraintWarnings>
    │   │   │       ├── <IntelWarnings>
    │   │   │       ├── <AnticipatedResponses>
    │   │   │       ├── <ObjectiveImpact>
    │   │   │       └── <HistoricalComparisons>
    │   │   │
    │   │   ├── [Events tab]
    │   │   │   ├── <LastTurnSummary>   ← narrative + key events
    │   │   │   ├── <ReactionPhaseBlock>
    │   │   │   └── <JudgeScores>       ← plausibility, consistency, etc.
    │   │   │
    │   │   └── [Chronicle tab]         ← inline version (compact)
    │   │       └── <ChronicleTimeline> ← reused from full chronicle page
    │   │           └── <TurnEntry>
    │   │               ├── <TurnNarrative>
    │   │               ├── <TurnTags>
    │   │               └── <TurnDetailExpander>
    │   │
    │   ├── <TurnPhaseIndicator>        ← current phase badge
    │   └── <TurnControls>              ← rewind, advance, branch buttons
    │
    └── <ObserverOverlay>               ← only in observer mode
        ├── <FogOfWarToggle>            ← omniscient vs. actor perspective
        ├── <PerspectiveSelector>       ← which actor's eyes to see through
        ├── <InterventionControls>      ← override AI decisions
        └── <AutoAdvanceControls>       ← play/pause/speed for AI-vs-AI
</GameProvider>
*/

// ------------------------------------------------------------
// COMPONENT TREE — SCENARIO BROWSER
// app/scenarios/page.tsx
// ------------------------------------------------------------

/*
<ScenarioBrowser>
  ├── <BrowserHeader>                   ← search, category filters, sort
  ├── <ScenarioGrid>
  │   └── <ScenarioCard>                ← preview card with name, desc, rating
  │       ├── <CategoryBadge>
  │       ├── <RatingStars>
  │       ├── <PlayCount>
  │       └── <BranchCount>
  └── <Pagination>
*/

// ------------------------------------------------------------
// COMPONENT TREE — SCENARIO CREATION WIZARD
// app/scenarios/new/page.tsx
// ------------------------------------------------------------

/*
<CreationWizard>
  ├── <WizardStepper>                   ← step indicator (describe → research → frame → populate → review)
  │
  ├── [Step 1: Describe]
  │   └── <FreeformInput>               ← large text area for scenario description
  │
  ├── [Step 2: Research]
  │   └── <ResearchStatus>              ← progress through 3 research prompts
  │       ├── <ResearchPromptCard>      ← military, political, economic
  │       └── <ResearchResults>         ← review findings, correct errors
  │
  ├── [Step 3: Frame]
  │   ├── <ScenarioFrameReview>         ← review extracted frame
  │   ├── <ClarifyingQuestions>         ← answer system's questions
  │   └── <ActorConfirmation>           ← confirm/add/remove actors
  │
  ├── [Step 4: Populate]
  │   └── <PipelineProgress>            ← stages 1-6 progress
  │       └── <StageCard>               ← per-stage status and preview
  │
  └── [Step 5: Review]
      ├── <ScenarioPreview>             ← full scenario summary
      ├── <ActorReview>                 ← review each actor's profile/state
      ├── <EventTimeline>               ← review event history
      └── <PublishOptions>              ← private/public, tags, description
*/

// ------------------------------------------------------------
// COMPONENT TREE — CHRONICLE (full page)
// app/chronicle/[branchId]/page.tsx
// ------------------------------------------------------------

/*
<ChroniclePage>
  ├── <ChronicleHeader>                 ← scenario name, branch info, filters
  │   └── <DimensionFilters>            ← military, political, economic, etc.
  ├── <GlobalTicker>                    ← running totals (oil, support, etc.)
  └── <ChronicleTimeline>
      └── <TurnEntry>                   ← repeated for each turn
          ├── <SeverityDot>             ← critical/major/moderate
          ├── <TurnDate>
          ├── <TurnTitle>
          ├── <TurnNarrative>           ← serif prose
          ├── <TurnTags>               ← event summary tags
          └── <TurnDetailExpander>
              ├── <DecisionsMade>
              ├── <EscalationChanges>
              ├── <StateChanges>
              ├── <ReactionPhase>
              ├── <ConstraintCascadeAlerts>
              └── <JudgeScores>
*/

// ------------------------------------------------------------
// SHARED / REUSABLE COMPONENTS
// ------------------------------------------------------------

/*
components/
├── ui/                               ← generic UI primitives
│   ├── Button.tsx
│   ├── Badge.tsx
│   ├── Card.tsx
│   ├── Tabs.tsx
│   ├── ProgressBar.tsx
│   ├── ScoreDisplay.tsx              ← 0-100 score with color coding
│   ├── TagList.tsx
│   ├── ExpandableSection.tsx
│   └── SlideOverPanel.tsx            ← right-side slide-over for detail views
│
├── game/                              ← game-specific shared components
│   ├── EscalationLadder.tsx           ← the bar visualization
│   ├── ActorAvatar.tsx                ← colored dot/initials
│   ├── EscalationBadge.tsx            ← "Rung 5" pill
│   ├── DimensionTag.tsx               ← military/economic/etc tag
│   ├── EscalationDirectionTag.tsx     ← escalation/de-escalation/hold
│   ├── ConfidenceBadge.tsx            ← confirmed/high/moderate/low
│   ├── CostMagnitude.tsx              ← low/moderate/high/extreme
│   └── TurnPhaseIndicator.tsx
│
├── map/                               ← Mapbox components
│   ├── GameMap.tsx                     ← main map wrapper
│   ├── ActorLayer.tsx                  ← country fills
│   ├── AssetMarker.tsx                ← individual asset on map
│   ├── ChokepointMarker.tsx
│   ├── StrikeAnimation.tsx
│   └── MapLegend.tsx
│
└── providers/                         ← context providers
    ├── GameProvider.tsx                ← game state context
    ├── AuthProvider.tsx                ← Supabase auth
    └── RealtimeProvider.tsx            ← Supabase realtime subscriptions
*/

// ------------------------------------------------------------
// KEY HOOKS
// ------------------------------------------------------------

/*
hooks/
├── useGame.ts                         ← access game state + dispatch
├── useScenario.ts                     ← fetch scenario data
├── useBranch.ts                       ← fetch branch + commits
├── useCommit.ts                       ← fetch specific commit data
├── useActorState.ts                   ← get actor state from current commit
│                                        (respects fog of war toggle)
├── useTurnLoop.ts                     ← game loop orchestration
│                                        (start turn, submit decision, resolve, advance)
├── useRealtime.ts                     ← subscribe to Supabase realtime events
├── useDecisionAnalysis.ts             ← fetch deep analysis for a decision
├── useResearchPipeline.ts             ← manage research pipeline execution
└── useFogOfWar.ts                     ← filter state based on actor perspective
                                        (returns believed state, not true state)
*/
