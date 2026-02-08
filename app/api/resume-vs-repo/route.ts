// ---------------------------------------------------------------------------
// POST /api/resume-vs-repo — check resume project bullets vs candidate's GitHub repos
// Body: { resumeText: string, candidateUsername: string }
// Auth required. Returns { bulletAssessments, aligned, notFound, candidateUsername }
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchRepos } from "@/lib/github/api";
import { decryptToken } from "@/lib/github/tokenEncrypt";
import {
  extractProjectSection,
  parseProjectBullets,
} from "@/lib/resume/projectSection";
import { selectTopRepos, buildRepoSummary } from "@/lib/github/summarize";
import { verifyBulletsAgainstRepos } from "@/lib/groq/verifyBullets";

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

/** Extract project-like phrases from project section text (for name-level alignment). */
function extractProjectPhrases(projectSectionText: string): string[] {
  const normalized = projectSectionText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
  const phrases: string[] = [];
  const seen = new Set<string>();

  const lines = normalized
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const cleaned = line
      .replace(/^[\s•\-*·]\s*/i, "")
      .replace(/^[\d.]+\s*/, "")
      .trim();
    if (cleaned.length < 3 || cleaned.length > 120) continue;
    if (
      /^(experience|education|skills|projects|summary|objective)$/i.test(
        cleaned,
      )
    )
      continue;
    const key = cleaned.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      phrases.push(cleaned);
    }
  }

  return phrases.slice(0, 50);
}

/** Check if repo name or description contains the phrase (case-insensitive). */
function repoMatchesPhrase(
  phrase: string,
  repoName: string,
  repoDescription: string | null,
): boolean {
  const p = phrase.toLowerCase();
  const name = repoName.toLowerCase();
  const desc = (repoDescription || "").toLowerCase();
  // Phrase contained in name or description, or name contained in phrase (e.g. "my-app" in "My App")
  const words = p.split(/\s+/).filter((w) => w.length > 1);
  const nameWords = name.replace(/[-_]/g, " ").split(/\s+/);
  if (name.includes(p) || desc.includes(p)) return true;
  if (
    words.some(
      (w) => name.includes(w) || nameWords.some((nw) => nw.includes(w)),
    )
  )
    return true;
  if (nameWords.every((nw) => p.includes(nw))) return true;
  return false;
}

export async function POST(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { resumeText?: string; candidateUsername?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const resumeText =
    typeof body.resumeText === "string" ? body.resumeText.trim() : "";
  const candidateUsername =
    typeof body.candidateUsername === "string"
      ? body.candidateUsername.trim()
      : "";

  if (!resumeText || !candidateUsername) {
    return NextResponse.json(
      { error: "resumeText and candidateUsername are required" },
      { status: 400 },
    );
  }

  let githubToken: string | null = null;
  try {
    const { data: prefs } = await auth.supabase
      .from("user_preferences")
      .select("github_token_encrypted")
      .eq("user_id", auth.user.id)
      .single();
    if (prefs?.github_token_encrypted) {
      githubToken = await decryptToken(prefs.github_token_encrypted);
    }
  } catch {
    // Use env token or unauthenticated
  }
  if (!githubToken) {
    githubToken =
      process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN || null;
  }

  let repos: Awaited<ReturnType<typeof fetchRepos>>;
  try {
    repos = await fetchRepos(candidateUsername, githubToken);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("not found")) {
      return NextResponse.json(
        { error: `GitHub user "${candidateUsername}" not found` },
        { status: 404 },
      );
    }
    if (msg.includes("rate limit")) {
      return NextResponse.json({ error: msg }, { status: 429 });
    }
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const projectSection = extractProjectSection(resumeText);
  const sectionForPhrases = projectSection || resumeText;
  const phrases = extractProjectPhrases(sectionForPhrases);
  const aligned: {
    resumeMention: string;
    repoName: string;
    repoDescription: string | null;
  }[] = [];
  const notFound: string[] = [];

  for (const phrase of phrases) {
    const match = repos.find(
      (r) =>
        repoMatchesPhrase(phrase, r.name, r.description) ||
        repoMatchesPhrase(phrase, r.full_name, r.description),
    );
    if (match) {
      aligned.push({
        resumeMention: phrase,
        repoName: match.name,
        repoDescription: match.description,
      });
    } else {
      notFound.push(phrase);
    }
  }

  const bullets = parseProjectBullets(projectSection);
  let bulletAssessments: Awaited<ReturnType<typeof verifyBulletsAgainstRepos>> =
    [];

  if (bullets.length > 0 && process.env.GROQ_API_KEY) {
    try {
      const topRepos = selectTopRepos(repos);
      const summaries = await Promise.all(
        topRepos.map((repo) =>
          buildRepoSummary(candidateUsername, repo, githubToken),
        ),
      );
      bulletAssessments = await verifyBulletsAgainstRepos(bullets, summaries);
    } catch (err) {
      console.error("[resume-vs-repo] bullet verification failed:", err);
      bulletAssessments = bullets.map((bullet) => ({
        bullet,
        status: "not_found" as const,
        evidence: "Verification failed (Groq or repo fetch error).",
      }));
    }
  } else if (bullets.length > 0 && !process.env.GROQ_API_KEY) {
    bulletAssessments = bullets.map((bullet) => ({
      bullet,
      status: "not_found" as const,
      evidence: "Bullet verification requires GROQ_API_KEY.",
    }));
  }

  return NextResponse.json({
    bulletAssessments,
    aligned,
    notFound,
    candidateUsername: candidateUsername.toLowerCase(),
    projectSection: projectSection || undefined,
  });
}
