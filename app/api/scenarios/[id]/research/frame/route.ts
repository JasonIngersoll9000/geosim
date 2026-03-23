import { createClient } from "@/lib/supabase/server";
import { runStage0 } from "@/lib/ai/research-pipeline";

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
  const { userDescription } = body as { userDescription?: string };

  if (!userDescription || typeof userDescription !== "string") {
    return Response.json(
      { data: null, error: "userDescription is required" },
      { status: 400 }
    );
  }

  try {
    const result = await runStage0(userDescription);

    // Persist initial frame to scenario
    await supabase
      .from("scenarios")
      .update({ scenario_frame: result.frame })
      .eq("id", id);

    return Response.json({ data: result, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pipeline error";
    return Response.json({ data: null, error: message }, { status: 500 });
  }
}
