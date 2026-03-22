// Stub — implementation in next commit
import type { ScenarioFrame } from "@/lib/types/simulation";

export type PipelineStatus = "pending" | "running" | "complete" | "error";

export interface PipelineJob {
  jobId: string;
  scenarioId: string;
  stage: number;
  status: PipelineStatus;
  progress: string;
  error?: string;
}

export function createJob(_scenarioId: string): string {
  throw new Error("Not implemented");
}

export function getJob(_jobId: string): PipelineJob | undefined {
  throw new Error("Not implemented");
}

export async function runPopulatePipeline(
  _jobId: string,
  _scenarioId: string,
  _userDescription: string,
  _confirmedFrame: ScenarioFrame
): Promise<void> {
  throw new Error("Not implemented");
}

export async function runStage0(
  _userDescription: string
): Promise<{ frame: ScenarioFrame; clarifyingQuestions: string[] }> {
  throw new Error("Not implemented");
}

export async function runStage0Confirm(
  _userDescription: string,
  _clarifications: Record<string, string>
): Promise<{ confirmedFrame: ScenarioFrame }> {
  throw new Error("Not implemented");
}
