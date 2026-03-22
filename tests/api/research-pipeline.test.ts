// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock @anthropic-ai/sdk before importing callClaude
// ---------------------------------------------------------------------------
const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

import { callClaude } from "@/lib/ai/anthropic";
import {
  createJob,
  getJob,
  runPopulatePipeline,
  runStage0,
  runStage0Confirm,
} from "@/lib/ai/research-pipeline";
import type { ScenarioFrame } from "@/lib/types/simulation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const mockFrame: ScenarioFrame = {
  conflictName: "Test Conflict",
  coreQuestion: "What happens if X does Y?",
  timeframeStart: "2025-01-01",
  timeframeCurrent: "2026-03-22",
  geographicScope: "Middle East",
  userAnalysis: "test description",
  suggestedActors: [],
  relevanceCriteria: "directly involved",
  keyDynamics: ["attrition", "nuclear risk"],
  actorFramings: [],
};

function makeTextResponse(json: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(json) }],
    usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 80 },
  };
}

// ---------------------------------------------------------------------------
// callClaude — prompt caching
// ---------------------------------------------------------------------------
describe("callClaude", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("should attach cache_control to the system prompt block", async () => {
    mockCreate.mockResolvedValueOnce(makeTextResponse({ result: "ok" }));

    await callClaude("System prompt text", "User prompt text");

    const call = mockCreate.mock.calls[0][0];
    expect(Array.isArray(call.system)).toBe(true);
    expect(call.system[0]).toMatchObject({
      type: "text",
      text: "System prompt text",
      cache_control: { type: "ephemeral" },
    });
  });

  it("should use the claude-sonnet-4-6 model", async () => {
    mockCreate.mockResolvedValueOnce(makeTextResponse({ ok: true }));
    await callClaude("sys", "usr");
    expect(mockCreate.mock.calls[0][0].model).toBe("claude-sonnet-4-6");
  });

  it("should parse JSON from response text", async () => {
    mockCreate.mockResolvedValueOnce(makeTextResponse({ value: 42 }));
    const result = await callClaude("sys", "usr");
    expect(result).toEqual({ value: 42 });
  });

  it("should parse JSON wrapped in a code block", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "```json\n{\"x\": 1}\n```" }],
      usage: {},
    });
    const result = await callClaude("sys", "usr");
    expect(result).toEqual({ x: 1 });
  });

  it("should extract the last text block (after tool_use blocks)", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        { type: "tool_use", id: "t1", name: "web_search", input: {} },
        { type: "tool_result", tool_use_id: "t1", content: "results" },
        { type: "text", text: JSON.stringify({ final: true }) },
      ],
      usage: {},
    });
    const result = await callClaude("sys", "usr");
    expect(result).toEqual({ final: true });
  });

  it("should throw if no text block in response", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "tool_use", id: "t1", name: "web_search", input: {} }],
      usage: {},
    });
    await expect(callClaude("sys", "usr")).rejects.toThrow("No text response");
  });

  it("should pass tools to the SDK when provided", async () => {
    mockCreate.mockResolvedValueOnce(makeTextResponse({}));
    const tools = [{ type: "web_search_20250305", name: "web_search" }];
    await callClaude("sys", "usr", { tools: tools as unknown[] });
    expect(mockCreate.mock.calls[0][0].tools).toEqual(tools);
  });

  it("should NOT include tools key when tools array is empty", async () => {
    mockCreate.mockResolvedValueOnce(makeTextResponse({}));
    await callClaude("sys", "usr", { tools: [] });
    expect(mockCreate.mock.calls[0][0].tools).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Job store
// ---------------------------------------------------------------------------
describe("createJob / getJob", () => {
  it("should create a job and retrieve it by id", () => {
    const jobId = createJob("scenario-abc");
    const job = getJob(jobId);
    expect(job).toBeDefined();
    expect(job?.scenarioId).toBe("scenario-abc");
    expect(job?.status).toBe("pending");
    expect(job?.stage).toBe(0);
  });

  it("should return undefined for unknown job id", () => {
    expect(getJob("nonexistent-id")).toBeUndefined();
  });

  it("should return different ids for different jobs", () => {
    const id1 = createJob("s1");
    const id2 = createJob("s2");
    expect(id1).not.toBe(id2);
  });
});

// ---------------------------------------------------------------------------
// runStage0
// ---------------------------------------------------------------------------
describe("runStage0", () => {
  beforeEach(() => mockCreate.mockReset());

  it("should return frame and clarifyingQuestions", async () => {
    mockCreate.mockResolvedValueOnce(
      makeTextResponse({
        frame: mockFrame,
        clarifyingQuestions: ["Q1?", "Q2?"],
      })
    );
    const result = await runStage0("describe a conflict");
    expect(result.frame).toMatchObject({ conflictName: "Test Conflict" });
    expect(result.clarifyingQuestions).toHaveLength(2);
  });

  it("should call callClaude with a non-empty system prompt", async () => {
    mockCreate.mockResolvedValueOnce(
      makeTextResponse({ frame: mockFrame, clarifyingQuestions: [] })
    );
    await runStage0("test");
    const call = mockCreate.mock.calls[0][0];
    expect(typeof call.system[0].text).toBe("string");
    expect(call.system[0].text.length).toBeGreaterThan(50);
  });
});

// ---------------------------------------------------------------------------
// runStage0Confirm
// ---------------------------------------------------------------------------
describe("runStage0Confirm", () => {
  beforeEach(() => mockCreate.mockReset());

  it("should return confirmedFrame", async () => {
    mockCreate.mockResolvedValueOnce(makeTextResponse(mockFrame));
    const result = await runStage0Confirm("describe a conflict", {
      "Q1?": "Answer 1",
    });
    expect(result.confirmedFrame).toMatchObject({ conflictName: "Test Conflict" });
  });
});

// ---------------------------------------------------------------------------
// runPopulatePipeline — parallel execution of stages 3 & 4
// ---------------------------------------------------------------------------
describe("runPopulatePipeline", () => {
  beforeEach(() => mockCreate.mockReset());

  it("should run stages 1-6 and mark job as complete", async () => {
    // Stage 1: actors
    mockCreate.mockResolvedValueOnce(makeTextResponse([{ id: "us", name: "United States" }]));
    // Stage 2: state assessments
    mockCreate.mockResolvedValueOnce(makeTextResponse([{ actorId: "us" }]));
    // Stage 3: relationships (parallel)
    mockCreate.mockResolvedValueOnce(makeTextResponse([{ actorA: "us", actorB: "iran" }]));
    // Stage 4: events (parallel with stage 3)
    mockCreate.mockResolvedValueOnce(makeTextResponse([{ id: "evt1" }]));
    // Stage 5: escalation ladders
    mockCreate.mockResolvedValueOnce(
      makeTextResponse({ escalationLadders: [], constraintCascades: [] })
    );
    // Stage 6: fog of war
    mockCreate.mockResolvedValueOnce(makeTextResponse([]));

    const jobId = createJob("scenario-xyz");
    await runPopulatePipeline(jobId, "scenario-xyz", "test description", mockFrame);

    const job = getJob(jobId);
    expect(job?.status).toBe("complete");
    expect(job?.stage).toBe(6);
  });

  it("should call the SDK exactly 6 times (stages 1-6)", async () => {
    for (let i = 0; i < 6; i++) {
      mockCreate.mockResolvedValueOnce(
        makeTextResponse(i < 2 ? [] : i === 4 ? { escalationLadders: [], constraintCascades: [] } : [])
      );
    }
    const jobId = createJob("scenario-parallel");
    await runPopulatePipeline(jobId, "scenario-parallel", "desc", mockFrame);
    // 6 stage calls
    expect(mockCreate).toHaveBeenCalledTimes(6);
  });

  it("should mark job as error if a stage fails", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API error"));
    const jobId = createJob("scenario-fail");
    await runPopulatePipeline(jobId, "scenario-fail", "desc", mockFrame);
    const job = getJob(jobId);
    expect(job?.status).toBe("error");
    expect(job?.error).toContain("API error");
  });
});
