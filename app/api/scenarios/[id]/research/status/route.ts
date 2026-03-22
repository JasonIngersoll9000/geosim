import { createClient } from "@/lib/supabase/server";
import { getJob } from "@/lib/ai/research-pipeline";

export async function GET(
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

  await params; // consume params (id not needed for job lookup)
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return Response.json(
      { data: null, error: "jobId query parameter is required" },
      { status: 400 }
    );
  }

  const job = getJob(jobId);
  if (!job) {
    return Response.json(
      { data: null, error: "Job not found" },
      { status: 404 }
    );
  }

  return Response.json({
    data: {
      jobId: job.jobId,
      stage: job.stage,
      status: job.status,
      progress: job.progress,
      error: job.error,
    },
    error: null,
  });
}
