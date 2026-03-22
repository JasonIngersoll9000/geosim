import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const category = searchParams.get("category");
  const visibility = searchParams.get("visibility");
  const sort = searchParams.get("sort") ?? "recent";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const offset = (page - 1) * limit;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("scenarios")
    .select("*")
    .or(
      user
        ? `visibility.eq.public,created_by.eq.${user.id}`
        : "visibility.eq.public"
    );

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

  return Response.json({ data, error: null });
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
