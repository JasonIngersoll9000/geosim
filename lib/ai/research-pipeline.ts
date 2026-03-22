import { callClaude } from "@/lib/ai/anthropic";
import { createServiceClient } from "@/lib/supabase/service";
import type { ScenarioFrame } from "@/lib/types/simulation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PipelineStatus = "pending" | "running" | "complete" | "error";

export interface PipelineJob {
  jobId: string;
  scenarioId: string;
  stage: number;
  status: PipelineStatus;
  progress: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// In-memory job store
// ---------------------------------------------------------------------------

const jobs = new Map<string, PipelineJob>();

export function createJob(scenarioId: string): string {
  const jobId = crypto.randomUUID();
  jobs.set(jobId, {
    jobId,
    scenarioId,
    stage: 0,
    status: "pending",
    progress: "Job created",
  });
  return jobId;
}

export function getJob(jobId: string): PipelineJob | undefined {
  return jobs.get(jobId);
}

// ---------------------------------------------------------------------------
// Web search tool definition
// ---------------------------------------------------------------------------

const WEB_SEARCH_TOOL = { type: "web_search_20250305", name: "web_search" };

// ---------------------------------------------------------------------------
// Stage 0 — Scenario Framing
// ---------------------------------------------------------------------------

const STAGE_0_SYSTEM = `You are a geopolitical scenario designer. The user will describe a
conflict they want to simulate. Your job is to extract a structured
scenario frame and ask targeted clarifying questions to fill gaps.

Parse the user's freeform description and extract:
- conflictName: a concise name for this scenario
- coreQuestion: the central strategic question the simulation explores
- timeframeStart: when the relevant history begins
- timeframeCurrent: the present moment the simulation branches from
- geographicScope: where the conflict plays out
- userAnalysis: the raw freeform description
- suggestedActors: array of actors with name, type, whyRelevant, suggestedByUser, confirmed
- relevanceCriteria: what makes an actor relevant to this scenario
- keyDynamics: array of analytical themes
- actorFramings: array of { actorName, stakesLevel, winCondition, loseCondition, strategicPosture }

Also generate 3-6 clarifying questions to fill gaps.

OUTPUT FORMAT: Return ONLY a JSON object with two keys:
- "frame": the ScenarioFrame object
- "clarifyingQuestions": array of strings`;

export async function runStage0(
  userDescription: string
): Promise<{ frame: ScenarioFrame; clarifyingQuestions: string[] }> {
  const result = (await callClaude(STAGE_0_SYSTEM, userDescription, {
    tools: [WEB_SEARCH_TOOL],
  })) as { frame: ScenarioFrame; clarifyingQuestions: string[] };

  return {
    frame: result.frame,
    clarifyingQuestions: result.clarifyingQuestions,
  };
}

// ---------------------------------------------------------------------------
// Stage 0 Confirm — Re-run with clarifications to produce confirmed frame
// ---------------------------------------------------------------------------

const STAGE_0_CONFIRM_SYSTEM = `You are a geopolitical scenario designer. You have received a user's
scenario description and their answers to clarifying questions.
Produce the FINAL confirmed ScenarioFrame incorporating all clarifications.

OUTPUT FORMAT: Return ONLY a JSON object matching the ScenarioFrame type:
{
  conflictName, coreQuestion, timeframeStart, timeframeCurrent, geographicScope,
  userAnalysis, suggestedActors, relevanceCriteria, keyDynamics, actorFramings
}`;

export async function runStage0Confirm(
  userDescription: string,
  clarifications: Record<string, string>
): Promise<{ confirmedFrame: ScenarioFrame }> {
  const userPrompt = `Original description:\n${userDescription}\n\nClarifications:\n${JSON.stringify(clarifications, null, 2)}\n\nProduce the FINAL confirmed ScenarioFrame.`;

  const confirmedFrame = (await callClaude(
    STAGE_0_CONFIRM_SYSTEM,
    userPrompt,
    { tools: [WEB_SEARCH_TOOL] }
  )) as ScenarioFrame;

  return { confirmedFrame };
}

// ---------------------------------------------------------------------------
// Stage prompts (Stages 1–6)
// ---------------------------------------------------------------------------

const STAGE_1_SYSTEM = `You are a geopolitical research analyst building structured actor profiles for a simulation.
For each actor listed in the scenario frame, produce a JSON array of actor profile objects with:
id, name, type, description, governmentType, keyFigures (id, name, role, status, disposition, influence, description, successionImpact).
Use web search to verify current leadership and recent changes.
OUTPUT FORMAT: Return ONLY a JSON array of actor objects. No preamble.`;

const STAGE_2_SYSTEM = `You are a geopolitical analyst producing a multi-dimensional state assessment for each actor.
For each actor produce a JSON object: { actorId, military, economic, political, diplomatic, intelligence }.
Include scores (0-100), assets, vulnerabilities, leverages, and nuclear posture.
Use web search to ground every assessment in real data.
OUTPUT FORMAT: Return ONLY a JSON array of state assessment objects. No preamble.`;

const STAGE_3_SYSTEM = `You are a geopolitical analyst mapping the relationship network between actors.
For every significant pair, produce: { actorA, actorB, type, strength, mutualInterests, frictions, volatility, shiftTriggers, description, warImpact }.
Include relationships like Russia-Iran, China-Iran, US-Gulf States, patron-proxy, etc.
OUTPUT FORMAT: Return ONLY a JSON array of relationship objects. No preamble.`;

const STAGE_4_SYSTEM = `You are a geopolitical analyst constructing a structured event timeline.
For each event produce: { id, timestamp, title, description, initiatedBy, targetedActors, dimension, impacts, triggeredBy, enabledEvents, escalationChanges, intelConsequences }.
Use web search to verify dates and details. Capture all causal chains and cascading effects.
OUTPUT FORMAT: Return ONLY a JSON array of event objects, ordered chronologically. No preamble.`;

const STAGE_5_SYSTEM = `You are a strategic analyst building escalation models for each actor.
Produce a JSON object with two keys:
- "escalationLadders": array of { actorId, escalation: { currentRung, rungs, escalationTriggers, deescalationConditions } }
- "constraintCascades": array of { id, description, steps, ultimateRisk, likelihoodOfFullCascade, perceivedBy }
Use web search to verify military doctrine and known red lines.
OUTPUT FORMAT: Return ONLY the JSON object. No preamble.`;

const STAGE_6_SYSTEM = `You are an intelligence analyst building the information picture each actor has about every other actor.
For each actor produce: { actorId, assessments: [{ aboutActorId, believedMilitaryReadiness, believedMilitaryReadinessConfidence, believedNuclearStatus, believedNuclearConfidence, believedPoliticalStability, believedPoliticalStabilityConfidence, believedEscalationRung, believedEscalationConfidence, knownUnknowns, unknownUnknowns, primaryIntSources, intelProviders }] }.
OUTPUT FORMAT: Return ONLY a JSON array of intelligence picture objects. No preamble.`;

// ---------------------------------------------------------------------------
// Helper to build user prompts for stages 1-6
// ---------------------------------------------------------------------------

function buildStageUserPrompt(
  scenarioDescription: string,
  confirmedFrame: ScenarioFrame,
  priorOutputs: Record<string, unknown>
): string {
  const parts: string[] = [
    `<scenario>\n${scenarioDescription}\n</scenario>`,
    `<scenario_frame>\n${JSON.stringify(confirmedFrame, null, 2)}\n</scenario_frame>`,
  ];
  for (const [key, value] of Object.entries(priorOutputs)) {
    parts.push(`<${key}>\n${JSON.stringify(value, null, 2)}\n</${key}>`);
  }
  return parts.join("\n\n");
}

// ---------------------------------------------------------------------------
// Full pipeline: Stages 1–6
// ---------------------------------------------------------------------------

export async function runPopulatePipeline(
  jobId: string,
  scenarioId: string,
  userDescription: string,
  confirmedFrame: ScenarioFrame
): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = "running";
  job.progress = "Starting pipeline";

  try {
    // Stage 1: Actor profiles
    job.stage = 1;
    job.progress = "Stage 1: Researching actors";
    const actors = await callClaude(
      STAGE_1_SYSTEM,
      buildStageUserPrompt(userDescription, confirmedFrame, {}),
      { tools: [WEB_SEARCH_TOOL] }
    );

    // Stage 2: State assessments
    job.stage = 2;
    job.progress = "Stage 2: Assessing actor states";
    const states = await callClaude(
      STAGE_2_SYSTEM,
      buildStageUserPrompt(userDescription, confirmedFrame, { actors }),
      { tools: [WEB_SEARCH_TOOL] }
    );

    // Stages 3 & 4 in parallel
    job.stage = 3;
    job.progress = "Stages 3 & 4: Mapping relationships and events (parallel)";
    const [relationships, events] = await Promise.all([
      callClaude(
        STAGE_3_SYSTEM,
        buildStageUserPrompt(userDescription, confirmedFrame, { actors, states }),
        { tools: [WEB_SEARCH_TOOL] }
      ),
      callClaude(
        STAGE_4_SYSTEM,
        buildStageUserPrompt(userDescription, confirmedFrame, { actors, states }),
        { tools: [WEB_SEARCH_TOOL] }
      ),
    ]);

    // Stage 5: Escalation ladders
    job.stage = 5;
    job.progress = "Stage 5: Building escalation ladders";
    const escalation = await callClaude(
      STAGE_5_SYSTEM,
      buildStageUserPrompt(userDescription, confirmedFrame, {
        actors,
        states,
        relationships,
        events,
      }),
      { tools: [WEB_SEARCH_TOOL] }
    );

    // Stage 6: Fog of war
    job.stage = 6;
    job.progress = "Stage 6: Building intelligence pictures";
    const fogOfWar = await callClaude(
      STAGE_6_SYSTEM,
      buildStageUserPrompt(userDescription, confirmedFrame, {
        actors,
        states,
        relationships,
        events,
        escalation,
      }),
      { tools: [WEB_SEARCH_TOOL] }
    );

    // Persist results to Supabase
    await persistPipelineResults(scenarioId, confirmedFrame, {
      actors,
      states,
      relationships,
      events,
      escalation,
      fogOfWar,
    });

    job.status = "complete";
    job.progress = "Pipeline complete";
  } catch (err) {
    job.status = "error";
    job.error = err instanceof Error ? err.message : String(err);
    job.progress = "Pipeline failed";
  }
}

// ---------------------------------------------------------------------------
// Persist pipeline results to Supabase
// ---------------------------------------------------------------------------

async function persistPipelineResults(
  scenarioId: string,
  confirmedFrame: ScenarioFrame,
  results: {
    actors: unknown;
    states: unknown;
    relationships: unknown;
    events: unknown;
    escalation: unknown;
    fogOfWar: unknown;
  }
): Promise<void> {
  const supabase = createServiceClient();

  // Update scenario frame
  await supabase
    .from("scenarios")
    .update({ scenario_frame: confirmedFrame })
    .eq("id", scenarioId);

  // Upsert actors
  const actorsArray = Array.isArray(results.actors) ? results.actors : [];
  for (const actor of actorsArray as Record<string, unknown>[]) {
    await supabase.from("actors").upsert({
      scenario_id: scenarioId,
      actor_id: (actor.id as string) ?? (actor.actor_id as string),
      name: actor.name as string,
      actor_type: (actor.type as string) ?? (actor.actor_type as string) ?? "nation_state",
      description: actor.description as string,
      profile: actor,
    });
  }

  // Upsert relationships
  const relsArray = Array.isArray(results.relationships) ? results.relationships : [];
  for (const rel of relsArray as Record<string, unknown>[]) {
    await supabase.from("relationships").upsert({
      scenario_id: scenarioId,
      actor_a: rel.actorA as string,
      actor_b: rel.actorB as string,
      baseline: rel,
    });
  }

  // Upsert events
  const eventsArray = Array.isArray(results.events) ? results.events : [];
  for (let i = 0; i < eventsArray.length; i++) {
    const evt = eventsArray[i] as Record<string, unknown>;
    await supabase.from("events").upsert({
      scenario_id: scenarioId,
      event_id: (evt.id as string) ?? `evt_${i}`,
      event_data: evt,
      event_timestamp: (evt.timestamp as string) ?? new Date().toISOString(),
      sequence_number: i,
    });
  }
}
