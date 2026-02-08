import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { encryptToken } from "@/lib/github/tokenEncrypt";

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

// GET /api/preferences — get current user's preferences (never returns raw token)
export async function GET(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await auth.supabase
    .from("user_preferences")
    .select("role_level, focus, github_token_encrypted, updated_at")
    .eq("user_id", auth.user.id)
    .single();

  const prefs = data || {
    role_level: null,
    focus: null,
    github_token_encrypted: null,
  };
  return NextResponse.json({
    preferences: {
      role_level: prefs.role_level ?? null,
      focus: prefs.focus ?? null,
      hasGithubToken: !!prefs.github_token_encrypted,
    },
  });
}

// POST /api/preferences — upsert preferences (role_level, focus, optional github_token)
export async function POST(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    role_level?: string | null;
    focus?: string | null;
    github_token?: string | null;
  };
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

  let githubTokenEncrypted: string | null = null;
  if (body.github_token !== undefined) {
    const raw =
      typeof body.github_token === "string" ? body.github_token.trim() : "";
    if (raw === "" || raw.toLowerCase() === "clear") {
      githubTokenEncrypted = null;
    } else {
      const encrypted = await encryptToken(raw);
      if (!encrypted && raw.length > 0) {
        return NextResponse.json(
          {
            error:
              "GitHub token could not be saved. Server encryption key (GITHUB_TOKEN_ENCRYPTION_KEY) is not set. Add a 64-character hex key to enable per-user token storage.",
          },
          { status: 503 },
        );
      }
      githubTokenEncrypted = encrypted ?? null;
    }
  }

  // Fetch current row to preserve github_token_encrypted when not updating it
  const { data: existing } = await auth.supabase
    .from("user_preferences")
    .select("github_token_encrypted")
    .eq("user_id", auth.user.id)
    .single();

  const payload = {
    user_id: auth.user.id,
    role_level: roleLevel,
    focus: focus,
    updated_at: new Date().toISOString(),
    github_token_encrypted:
      body.github_token !== undefined
        ? githubTokenEncrypted
        : (existing?.github_token_encrypted ?? null),
  };

  const { error } = await auth.supabase
    .from("user_preferences")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    preferences: {
      role_level: roleLevel,
      focus,
      hasGithubToken:
        body.github_token !== undefined
          ? !!githubTokenEncrypted
          : !!existing?.github_token_encrypted,
    },
  });
}
