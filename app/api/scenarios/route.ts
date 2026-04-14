import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const category = searchParams.get("category");
  const visibility = searchParams.get("visibility");
  const sort = searchParams.get("sort") ?? "recent";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const offset = (page - 1) * limit;

  // Use service client for reads — bypasses RLS so all scenarios are visible
  // in the browser regardless of auth state or visibility column values.
  const supabase = createServiceClient();

  let query = supabase
    .from("scenarios")
    .select("*");

  if (category) query = query.eq("category", category);
  if (visibility) query = query.eq("visibility", visibility);

  if (sort === "rating") query = query.order("rating", { ascending: false });
  else if (sort === "popular") query = query.order("total_plays", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) {
    return Response.json({ data: null, error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return Response.json({ data: [], error: null });
  }

  const scenarioIds = data.map(s => s.id);

  const [actorCountRes, branchRes] = await Promise.all([
    supabase
      .from("scenario_actors")
      .select("scenario_id")
      .in("scenario_id", scenarioIds),
    supabase
      .from("branches")
      .select("id, scenario_id, status")
      .in("scenario_id", scenarioIds)
      .eq("is_trunk", true),
  ]);

  const actorCounts: Record<string, number> = {};
  for (const row of actorCountRes.data ?? []) {
    actorCounts[row.scenario_id] = (actorCounts[row.scenario_id] ?? 0) + 1;
  }

  type TrunkBranch = { id: string; scenario_id: string; status: string };
  const trunkByScenario: Record<string, TrunkBranch> = {};
  for (const row of (branchRes.data ?? []) as TrunkBranch[]) {
    trunkByScenario[row.scenario_id] = row;
  }

  // Fetch latest turn commit per trunk branch via separate query (avoids nested-join RLS issues)
  const trunkIds = Object.values(trunkByScenario).map(b => b.id);
  type TurnCommitRow = { branch_id: string; turn_number: number; simulated_date: string };
  const commitsByBranch: Record<string, TurnCommitRow[]> = {};
  if (trunkIds.length > 0) {
    const { data: commits } = await supabase
      .from("turn_commits")
      .select("branch_id, turn_number, simulated_date")
      .in("branch_id", trunkIds);
    for (const c of (commits ?? []) as TurnCommitRow[]) {
      if (!commitsByBranch[c.branch_id]) commitsByBranch[c.branch_id] = [];
      commitsByBranch[c.branch_id].push(c);
    }
  }

  const enriched = data.map(s => {
    const trunk = trunkByScenario[s.id];
    const commits = trunk ? (commitsByBranch[trunk.id] ?? []) : [];
    const maxTurn = commits.reduce((m, c) => Math.max(m, c.turn_number), 0);
    const latestCommit = commits.reduce<TurnCommitRow | null>(
      (best, c) => (!best || c.turn_number > best.turn_number) ? c : best,
      null
    );
    const isActive = (s.branch_count ?? 0) > 0 && trunk?.status === 'active';
    return {
      ...s,
      actorCount: actorCounts[s.id] ?? 0,
      turnNumber: maxTurn > 0 ? maxTurn : null,
      lastActiveDate: latestCommit?.simulated_date ?? null,
      isActive,
    };
  });

  return Response.json({ data: enriched, error: null });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ data: null, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { name, description, category, dimensions, tags } = body as {
    name?: string;
    description?: string;
    category?: string;
    dimensions?: string[];
    tags?: string[];
  };

  if (!name || typeof name !== "string") {
    return Response.json(
      { data: null, error: "name is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("scenarios")
    .insert({
      name,
      description,
      category: category ?? "custom",
      dimensions: dimensions ?? [
        "military",
        "economic",
        "political",
        "diplomatic",
        "intelligence",
        "cultural",
      ],
      tags: tags ?? [],
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ data: null, error: error.message }, { status: 500 });
  }

  return Response.json({ data, error: null }, { status: 201 });
}
