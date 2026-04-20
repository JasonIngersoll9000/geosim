/**
 * Unified research pipeline endpoint.
 *
 * POST /api/scenarios/[id]/research
 *
 * Runs all 7 pipeline stages in a single request without requiring user
 * confirmation between Stage 0 and Stages 1-6.  This is the "scripted"
 * path used for automated scenario creation (e.g. seeding the Iran
 * scenario).  Interactive flows should still use the split endpoints:
 *   POST /research/frame          — Stage 0 + clarifying questions
 *   POST /research/frame/confirm  — Stage 0 confirmed frame
 *   POST /research/populate       — Stages 1-6 (async, poll /research/status)
 *
 * Request body:
 *   userDescription  string  — freeform scenario description (required)
 *   verifiedContext? string  — pre-researched context that skips Stages 1-4
 *
 * Response:
 *   { data: { jobId, status: "started" }, error: null }
 *
 * The job runs asynchronously.  Poll GET /research/status?jobId=<id> for
 * progress.
 */

import { createClient } from "@/lib/supabase/server";
import {
  runStage0,
  createJob,
  runPopulatePipeline,
} from "@/lib/ai/research-pipeline";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ data: null, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { userDescription, verifiedContext } = body as {
    userDescription?: string;
    verifiedContext?: string;
  };

  if (!userDescription || typeof userDescription !== "string") {
    return Response.json(
      { data: null, error: "userDescription is required" },
      { status: 400 }
    );
  }

  try {
    // Stage 0 — extract scenario frame (no interactive clarification round-trip)
    const { frame: confirmedFrame } = await runStage0(userDescription);

    // Persist the initial frame so the scenario row is populated even if the
    // async populate job fails partway through.
    await supabase
      .from("scenarios")
      .update({ scenario_frame: confirmedFrame })
      .eq("id", id);

    // Create a job and kick off Stages 1-6 without awaiting
    const jobId = createJob(id);
    void runPopulatePipeline(
      jobId,
      id,
      userDescription,
      confirmedFrame,
      verifiedContext
    );

    return Response.json({
      data: { jobId, status: "started" },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pipeline error";
    return Response.json({ data: null, error: message }, { status: 500 });
  }
}
