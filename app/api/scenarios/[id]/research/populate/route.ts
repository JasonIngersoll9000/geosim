import { createClient } from "@/lib/supabase/server";
import {
  createJob,
  runPopulatePipeline,
} from "@/lib/ai/research-pipeline";
import type { ScenarioFrame } from "@/lib/types/simulation";

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
  const { confirmedFrame, userDescription, verifiedContext } = body as {
    confirmedFrame?: ScenarioFrame;
    userDescription?: string;
    verifiedContext?: string;
  };

  if (!confirmedFrame || !userDescription) {
    return Response.json(
      { data: null, error: "confirmedFrame and userDescription are required" },
      { status: 400 }
    );
  }

  const jobId = createJob(id);

  // Kick off pipeline without awaiting — client polls /research/status
  void runPopulatePipeline(jobId, id, userDescription, confirmedFrame, verifiedContext);

  return Response.json({
    data: { jobId, status: "started" },
    error: null,
  });
}
