import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

async function getAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { user, supabase } : null;
}

// POST /api/reports — save a report
export async function POST(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { candidateUsername?: string; payload?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { candidateUsername, payload } = body;
  if (!candidateUsername || !payload) {
    return NextResponse.json(
      { error: "candidateUsername and payload required" },
      { status: 400 },
    );
  }

  const normalizedUsername = candidateUsername.toLowerCase();

  // Upsert (insert or update)
  const { error } = await auth.supabase.from("reports").upsert(
    {
      user_id: auth.user.id,
      candidate_username: normalizedUsername,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,candidate_username" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// GET /api/reports?username=xxx — get a specific report
export async function GET(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const username = url.searchParams.get("username");

  if (!username) {
    // List all reports for user
    const { data, error } = await auth.supabase
      .from("reports")
      .select("id, candidate_username, created_at, updated_at")
      .eq("user_id", auth.user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reports: data || [] });
  }

  const { data, error } = await auth.supabase
    .from("reports")
    .select("payload, created_at, updated_at")
    .eq("user_id", auth.user.id)
    .eq("candidate_username", username.toLowerCase())
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const responseData = data as Record<string, unknown>;
  return NextResponse.json({
    report: responseData.payload,
    created_at: responseData.created_at,
    updated_at: responseData.updated_at,
  });
}
