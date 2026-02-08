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

// GET /api/preferences — get current user's preferences
export async function GET(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await auth.supabase
    .from("user_preferences")
    .select("role_level, focus, updated_at")
    .eq("user_id", auth.user.id)
    .single();

  return NextResponse.json({
    preferences: data || { role_level: null, focus: null },
  });
}

// POST /api/preferences — upsert preferences
export async function POST(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { role_level?: string | null; focus?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validLevels = ["junior", "mid", "senior", "staff", null];
  const validFocus = [
    "frontend",
    "backend",
    "fullstack",
    "devops",
    "ai-ml",
    null,
  ];

  const roleLevel = validLevels.includes(body.role_level ?? null)
    ? (body.role_level ?? null)
    : null;
  const focus = validFocus.includes(body.focus ?? null)
    ? (body.focus ?? null)
    : null;

  const { error } = await auth.supabase.from("user_preferences").upsert(
    {
      user_id: auth.user.id,
      role_level: roleLevel,
      focus: focus,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    preferences: { role_level: roleLevel, focus },
  });
}
