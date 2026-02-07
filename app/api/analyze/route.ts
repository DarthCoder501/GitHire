// ---------------------------------------------------------------------------
// POST /api/analyze  — full GitHub → Groq analysis pipeline
// Body: { "username": string }
// Returns: { "report": HiringReport }
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { fetchProfile, fetchRepos } from "@/lib/github/api";
import { selectTopRepos, buildRepoSummary } from "@/lib/github/summarize";
import { analyzeWithGroq } from "@/lib/groq/analyze";

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

    // ── 1. GitHub profile ──────────────────────────────────────────────────
    console.log(`[analyze] Fetching profile for "${username}" …`);
    let profile;
    try {
      profile = await fetchProfile(username);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("not found")) {
        return NextResponse.json({ error: msg }, { status: 404 });
      }
      throw err;
    }

    // ── 2. List repos (paginated) ──────────────────────────────────────────
    console.log("[analyze] Fetching repos …");
    const allRepos = await fetchRepos(username);

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
        const summary = await buildRepoSummary(username, repo);
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

    // ── 5. Groq analysis ───────────────────────────────────────────────────
    console.log("[analyze] Sending to Groq …");
    const report = await analyzeWithGroq(profile, summaries);

    console.log(
      `[analyze] Done — overall score ${report.overallScore}, verdict "${report.verdict}"`,
    );

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
