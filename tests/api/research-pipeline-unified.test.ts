// @vitest-environment node
/**
 * Tests for the unified POST /api/scenarios/[id]/research endpoint.
 *
 * This endpoint runs all 7 research pipeline stages in one request:
 *   Stage 0 (frame) → Stages 1-6 (populate, async)
 *
 * Acceptance criteria (issue #31):
 *   - POST /api/scenarios/[id]/research triggers all 7 stages
 *   - Each stage output stored in Supabase
 *   - Prompt caching applied to stable stage prompts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock @anthropic-ai/sdk — must be before any imports that use it.
// NOTE: vi.mock factories are hoisted — do NOT reference external variables.
// ---------------------------------------------------------------------------
const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

// ---------------------------------------------------------------------------
// Supabase server mock — inline factory only (no external variable refs)
// ---------------------------------------------------------------------------
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user" } } }),
    },
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({}) }),
      upsert: vi.fn().mockReturnValue({}),
    }),
  }),
}));

// ---------------------------------------------------------------------------
// Supabase service mock — inline factory only
// ---------------------------------------------------------------------------
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({}) }),
      upsert: vi.fn().mockReturnValue({}),
    }),
  }),
}));

import { POST } from "@/app/api/scenarios/[id]/research/route";
import * as pipelineModule from "@/lib/ai/research-pipeline";
import { createServiceClient } from "@/lib/supabase/service";
import type { ScenarioFrame } from "@/lib/types/simulation";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const mockFrame: ScenarioFrame = {
  conflictName: "Iran-US Conflict",
  coreQuestion: "Can the US achieve strategic objectives without ground invasion?",
  timeframeStart: "2023-01-01",
  timeframeCurrent: "2026-04-18",
  geographicScope: "Middle East",
  userAnalysis: "Comprehensive Iran-US scenario",
  suggestedActors: [],
  relevanceCriteria: "directly involved in conflict",
  keyDynamics: ["nuclear escalation", "proxy warfare"],
  actorFramings: [],
};

function makeTextResponse(json: unknown) {
  // Wrap in json code fence so callClaude's first regex match handles both
  // arrays and objects correctly (bare array regex \{...\} can misparse arrays).
  return {
    content: [{ type: "text", text: `\`\`\`json\n${JSON.stringify(json)}\n\`\`\`` }],
    usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 80 },
  };
}

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/scenarios/test-id/research", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Auth + validation
// ---------------------------------------------------------------------------
describe("POST /api/scenarios/[id]/research — validation", () => {
  beforeEach(() => mockCreate.mockReset());

  it("returns 400 if userDescription is missing", async () => {
    // Stub runStage0 so this test doesn't hit the SDK
    const spy = vi
      .spyOn(pipelineModule, "runStage0")
      .mockResolvedValue({ frame: mockFrame, clarifyingQuestions: [] });

    const req = makeRequest({});
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("userDescription");

    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Happy path: Stage 0 → Stages 1-6
// ---------------------------------------------------------------------------
describe("POST /api/scenarios/[id]/research — full pipeline", () => {
  beforeEach(() => mockCreate.mockReset());

  it("calls runStage0 then runPopulatePipeline with the confirmed frame", async () => {
    const stage0Spy = vi
      .spyOn(pipelineModule, "runStage0")
      .mockResolvedValue({ frame: mockFrame, clarifyingQuestions: ["Q1?"] });

    const populateSpy = vi
      .spyOn(pipelineModule, "runPopulatePipeline")
      .mockResolvedValue(undefined);

    const req = makeRequest({ userDescription: "Iran-US conflict scenario" });
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.error).toBeNull();
    expect(json.data.status).toBe("started");
    expect(typeof json.data.jobId).toBe("string");

    expect(stage0Spy).toHaveBeenCalledWith("Iran-US conflict scenario");
    expect(populateSpy).toHaveBeenCalledWith(
      expect.any(String),
      "test-id",
      "Iran-US conflict scenario",
      mockFrame,
      undefined
    );

    stage0Spy.mockRestore();
    populateSpy.mockRestore();
  });

  it("passes verifiedContext to runPopulatePipeline when provided", async () => {
    const stage0Spy = vi
      .spyOn(pipelineModule, "runStage0")
      .mockResolvedValue({ frame: mockFrame, clarifyingQuestions: [] });

    const populateSpy = vi
      .spyOn(pipelineModule, "runPopulatePipeline")
      .mockResolvedValue(undefined);

    const req = makeRequest({
      userDescription: "Iran-US conflict",
      verifiedContext: "pre-researched-context-data",
    });
    await POST(req, { params: Promise.resolve({ id: "test-id" }) });

    expect(populateSpy).toHaveBeenCalledWith(
      expect.any(String),
      "test-id",
      "Iran-US conflict",
      mockFrame,
      "pre-researched-context-data"
    );

    stage0Spy.mockRestore();
    populateSpy.mockRestore();
  });

  it("returns 500 if Stage 0 throws", async () => {
    const stage0Spy = vi
      .spyOn(pipelineModule, "runStage0")
      .mockRejectedValue(new Error("Claude API error"));

    const req = makeRequest({ userDescription: "Iran-US conflict" });
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("Claude API error");

    stage0Spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Prompt caching — every callClaude call should have cache_control on system
// ---------------------------------------------------------------------------
describe("Prompt caching in research pipeline", () => {
  beforeEach(() => mockCreate.mockReset());

  it("attaches cache_control: ephemeral to system prompt in every stage call", async () => {
    // Stage 0
    mockCreate.mockResolvedValueOnce(
      makeTextResponse({ frame: mockFrame, clarifyingQuestions: [] })
    );
    // Stages 1-6
    for (let i = 0; i < 6; i++) {
      mockCreate.mockResolvedValueOnce(
        makeTextResponse(
          i < 2
            ? [{ id: "us", name: "United States" }]
            : i === 4
            ? { escalationLadders: [], constraintCascades: [] }
            : []
        )
      );
    }

    const jobId = pipelineModule.createJob("scenario-cache-test");
    await pipelineModule.runStage0("test description");
    await pipelineModule.runPopulatePipeline(
      jobId,
      "scenario-cache-test",
      "test description",
      mockFrame
    );

    // All 7 calls (Stage 0 + Stages 1-6) must use cache_control
    expect(mockCreate.mock.calls.length).toBe(7);
    for (const call of mockCreate.mock.calls) {
      const systemBlocks = call[0].system;
      expect(Array.isArray(systemBlocks)).toBe(true);
      expect(systemBlocks[0]).toMatchObject({
        type: "text",
        cache_control: { type: "ephemeral" },
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Stage 5 escalation ladder storage in actors table
// ---------------------------------------------------------------------------
describe("runPopulatePipeline — Stage 5 escalation ladder persisted to actors", () => {
  beforeEach(() => mockCreate.mockReset());

  it("updates actors table with escalation_ladder after Stage 5 completes", async () => {
    // Build a controllable Supabase mock.
    // .update().eq().eq() — chain returns itself at each .eq() step.
    const eqChain: Record<string, unknown> = {};
    const eqFn = vi.fn().mockReturnValue(eqChain);
    eqChain.eq = eqFn;
    const updateMock = vi.fn().mockReturnValue(eqChain);
    const upsertMock = vi.fn().mockReturnValue({});
    const fromMock = vi.fn().mockReturnValue({
      update: updateMock,
      upsert: upsertMock,
    });

    vi.mocked(createServiceClient).mockReturnValue(
      // Cast through unknown to satisfy the full SupabaseClient type — this
      // is a test double that only implements the methods under test.
      { from: fromMock } as unknown as ReturnType<typeof createServiceClient>
    );

    // Stage 1: 2 actors
    mockCreate.mockResolvedValueOnce(
      makeTextResponse([
        { id: "us", name: "United States", type: "nation_state", description: "desc" },
        { id: "iran", name: "Iran", type: "nation_state", description: "desc" },
      ])
    );
    // Stage 2: states
    mockCreate.mockResolvedValueOnce(
      makeTextResponse([{ actorId: "us" }, { actorId: "iran" }])
    );
    // Stage 3: relationships
    mockCreate.mockResolvedValueOnce(
      makeTextResponse([{ actorA: "us", actorB: "iran", type: "adversary" }])
    );
    // Stage 4: events
    mockCreate.mockResolvedValueOnce(makeTextResponse([{ id: "evt1" }]));
    // Stage 5: escalation ladders for 2 actors
    mockCreate.mockResolvedValueOnce(
      makeTextResponse({
        escalationLadders: [
          { actorId: "us", escalation: { currentRung: 3, rungs: [] } },
          { actorId: "iran", escalation: { currentRung: 4, rungs: [] } },
        ],
        constraintCascades: [{ id: "cascade1" }],
      })
    );
    // Stage 6: fog of war
    mockCreate.mockResolvedValueOnce(makeTextResponse([]));

    const jobId = pipelineModule.createJob("scenario-escalation-persist");
    await pipelineModule.runPopulatePipeline(
      jobId,
      "scenario-escalation-persist",
      "test description",
      mockFrame
    );

    const job = pipelineModule.getJob(jobId);
    if (job?.status !== "complete") {
      console.error("Job failed with error:", job?.error);
    }
    expect(job?.status).toBe("complete");

    // Verify escalation_ladder updates were made (one per actor = 2)
    const escalationUpdates = updateMock.mock.calls.filter((args: unknown[]) => {
      const obj = args[0];
      return typeof obj === "object" && obj !== null && "escalation_ladder" in obj;
    });
    expect(escalationUpdates.length).toBeGreaterThanOrEqual(2);
  });
});
