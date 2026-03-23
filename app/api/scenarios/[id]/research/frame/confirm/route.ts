import { createClient } from "@/lib/supabase/server";
import { runStage0Confirm } from "@/lib/ai/research-pipeline";

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
  const { userDescription, clarifications } = body as {
    userDescription?: string;
    clarifications?: Record<string, string>;
  };

  if (!userDescription || typeof userDescription !== "string") {
    return Response.json(
      { data: null, error: "userDescription is required" },
      { status: 400 }
    );
  }

  try {
    const result = await runStage0Confirm(userDescription, clarifications ?? {});

    // Update scenario with confirmed frame
    await supabase
      .from("scenarios")
      .update({ scenario_frame: result.confirmedFrame })
      .eq("id", id);

    return Response.json({ data: result, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pipeline error";
    return Response.json({ data: null, error: message }, { status: 500 });
  }
}
