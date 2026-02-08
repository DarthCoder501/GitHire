// ---------------------------------------------------------------------------
// POST /api/analyze  — full GitHub → Groq analysis pipeline
// Body: { "username": string }
// Optional header: Authorization: Bearer <session.access_token> (if signed in, creates a chat in Supabase)
// Returns: { "report": HiringReport }
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchProfile, fetchRepos } from "@/lib/github/api";
import { selectTopRepos, buildRepoSummary } from "@/lib/github/summarize";
import { analyzeWithGroq } from "@/lib/groq/analyze";
import { decryptToken } from "@/lib/github/tokenEncrypt";
import {
  getOrCreateChat,
  addChatMessage,
} from "@/lib/conversation/supabase-history";

async function resolveUser(
  request: NextRequest,
): Promise<{ userId: string; accessToken: string } | null> {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.replace("Bearer ", "");
  if (!accessToken) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { userId: user.id, accessToken };
}

export async function POST(request: NextRequest) {
  try {
    // ── Parse input ────────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const username =
      typeof body.username === "string" ? body.username.trim() : "";

    if (!username) {
      return NextResponse.json(
        { error: 'Missing or empty "username" field' },
        { status: 400 },
      );
    }

    // ── 0. Optional user GitHub token (higher rate limits) ───────────────────
    let githubToken: string | null = null;
    const authForToken = await resolveUser(request);
    if (authForToken) {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (url && anonKey) {
          const supabase = createClient(url, anonKey, {
            global: {
              headers: { Authorization: `Bearer ${authForToken.accessToken}` },
            },
          });
          const { data: prefs } = await supabase
            .from("user_preferences")
            .select("github_token_encrypted")
            .eq("user_id", authForToken.userId)
            .single();
          if (prefs?.github_token_encrypted) {
            githubToken = await decryptToken(prefs.github_token_encrypted);
          }
        }
      } catch {
        // Use env token or unauthenticated
      }
    }
    if (!githubToken) {
      githubToken =
        process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN || null;
    }

    // ── 1. GitHub profile ──────────────────────────────────────────────────
    console.log(`[analyze] Fetching profile for "${username}" …`);
    let profile;
    try {
      profile = await fetchProfile(username, githubToken);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("not found")) {
        return NextResponse.json({ error: msg }, { status: 404 });
      }
      throw err;
    }

    // ── 2. List repos (paginated) ──────────────────────────────────────────
    console.log("[analyze] Fetching repos …");
    const allRepos = await fetchRepos(username, githubToken);

    if (allRepos.length === 0) {
      return NextResponse.json(
        { error: `User "${username}" has no public repositories` },
        { status: 404 },
      );
    }

    // ── 3. Select top repos ────────────────────────────────────────────────
    const topRepos = selectTopRepos(allRepos);
    console.log(
      `[analyze] Selected ${topRepos.length} of ${allRepos.length} repos`,
    );

    // ── 4. Build per-repo summaries ────────────────────────────────────────
    const summaries = [];
    for (const repo of topRepos) {
      try {
        console.log(`[analyze]   → summarizing ${repo.name} …`);
        const summary = await buildRepoSummary(username, repo, githubToken);
        summaries.push(summary);
      } catch (err) {
        console.warn(`[analyze]   ⚠ skipping ${repo.name}:`, err);
      }
    }

    if (summaries.length === 0) {
      return NextResponse.json(
        {
          error:
            "Could not read any repositories (they may be empty or rate-limited)",
        },
        { status: 502 },
      );
    }

    // ── 5. Fetch user preferences (optional) ──────────────────────────────
    let preferences:
      | { role_level?: string | null; focus?: string | null }
      | undefined;
    const auth = await resolveUser(request);
    if (auth) {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (url && anonKey) {
          const supabase = createClient(url, anonKey, {
            global: {
              headers: { Authorization: `Bearer ${auth.accessToken}` },
            },
          });
          const { data: prefs } = await supabase
            .from("user_preferences")
            .select("role_level, focus")
            .eq("user_id", auth.userId)
            .single();
          if (prefs) preferences = prefs;
        }
      } catch {
        // Preferences are optional — don't fail the pipeline
      }
    }

    // ── 6. Groq analysis ───────────────────────────────────────────────────
    console.log("[analyze] Sending to Groq …");
    const report = await analyzeWithGroq(profile, summaries, preferences);

    console.log(
      `[analyze] Done — overall score ${report.overallScore}, verdict "${report.verdict}"`,
    );

    // ── If signed in, save report + chat to Supabase (for Compare and Chats) ─
    // (auth was resolved above for preferences; reuse it)
    if (auth) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && anonKey) {
        const supabase = createClient(url, anonKey, {
          global: { headers: { Authorization: `Bearer ${auth.accessToken}` } },
        });
        try {
          // Save report so Compare can use it
          const { error: reportErr } = await supabase.from("reports").upsert(
            {
              user_id: auth.userId,
              candidate_username: username.toLowerCase(),
              payload: report as unknown as Record<string, unknown>,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,candidate_username" },
          );
          if (reportErr) {
            console.warn("[analyze] Could not save report:", reportErr.message);
          }

          // Create chat + first message for Chats page
          if (report.executiveSummary) {
            const chatId = await getOrCreateChat(
              auth.accessToken,
              auth.userId,
              username,
            );
            await addChatMessage(
              auth.accessToken,
              chatId,
              "assistant",
              report.executiveSummary,
            );
            console.log("[analyze] Chat saved to Supabase for", username);
          }
        } catch (err) {
          console.warn("[analyze] Could not save to Supabase:", err);
          // Don't fail the request; report is still returned
        }
      }
    }

    return NextResponse.json({ report });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[analyze] Pipeline error:", msg);

    if (msg.includes("rate limit")) {
      return NextResponse.json(
        {
          error:
            "GitHub API rate limit exceeded. Try again later or set GITHUB_TOKEN env var.",
        },
        { status: 429 },
      );
    }
    if (msg.includes("GROQ_API_KEY")) {
      return NextResponse.json(
        { error: "Server configuration error: GROQ_API_KEY is not set" },
        { status: 500 },
      );
    }

    if (msg.includes("Groq API error")) {
      return NextResponse.json(
        {
          error:
            "AI analysis service is temporarily unavailable. Please try again in a few seconds.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: msg || "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
