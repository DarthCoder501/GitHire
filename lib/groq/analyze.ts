// ---------------------------------------------------------------------------
// Groq LLM integration — sends aggregated GitHub data and returns a
// HiringReport JSON object.
// ---------------------------------------------------------------------------

import { HiringReport } from "@/lib/types/report";
import { GitHubProfile } from "@/lib/github/api";
import { RepoSummary } from "@/lib/github/summarize";

// ── Prompt ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a Principal Software Engineer and Technical Hiring Manager. You analyze GitHub profiles and their repository code to produce hiring-grade evaluations.

You MUST respond with ONLY a valid JSON object — no markdown fences, no explanation, no text before or after the JSON. The JSON must exactly conform to this schema:

{
  "overallScore": <number 0-100>,
  "verdict": "<one of: Strong Yes | Yes | Lean Yes | No>",
  "verdictReasoning": "<string, 1-2 sentence justification>",
  "recommendedRoles": ["<e.g. Frontend Engineer>", "<e.g. Full-stack>", …],
  "scores": {
    "codeQuality": <number 0-100>,
    "consistency": <number 0-100>,
    "impact": <number 0-100>,
    "documentation": <number 0-100>,
    "testing": <number 0-100>
  },
  "strengths": [{ "label": "<string>", "icon": "<optional emoji>" }, …],
  "weaknesses": [{ "label": "<string>", "icon": "<optional emoji>" }, …],
  "skills": [{ "skill": "<string>", "value": <number 0-100> }, …],
  "activity": [{ "month": "<e.g. Jan 2025>", "commits": <number> }, …],
  "highlights": ["<string>", …],
  "executiveSummary": "<string, 3-5 sentence narrative>"
}

Evaluation rules:
- Evaluate code QUALITY, architecture, design patterns, error handling — not just quantity.
- Be critical but fair; identify genuine strengths AND weaknesses.
- "recommendedRoles": 1-3 specific roles this candidate is best suited for (e.g. "Frontend Engineer", "Backend Engineer", "Full-stack", "DevOps Engineer"). Base on evidence in repos and skills.
- "strengths" and "weaknesses": 3-6 items each.
- "skills": 4-8 entries with proficiency scores (0-100).
- "activity": exactly 12 entries for the last 12 months. Estimate commit volume from repo activity / update dates. Use recent calendar months.
- "highlights": 3-5 notable technical achievements.
- "executiveSummary": a professional, 3-5 sentence hiring narrative.
- Scores must reflect evidence in the code — do not inflate.

IMPORTANT: Return ONLY the JSON object. No other text.`;

// ── Payload builder ─────────────────────────────────────────────────────────

function buildUserPayload(
  profile: GitHubProfile,
  summaries: RepoSummary[],
): string {
  const lines: string[] = [];

  lines.push("## GitHub Profile");
  lines.push(`- Username: ${profile.login}`);
  lines.push(`- Name: ${profile.name ?? "N/A"}`);
  lines.push(`- Bio: ${profile.bio ?? "N/A"}`);
  lines.push(`- Public Repos: ${profile.public_repos}`);
  lines.push(`- Followers: ${profile.followers}`);
  lines.push("");
  lines.push(`## Repositories Analyzed (${summaries.length})`);
  lines.push("");

  for (const repo of summaries) {
    lines.push(`### ${repo.name}`);
    lines.push(`- Description: ${repo.description ?? "None"}`);
    lines.push(`- Primary Language: ${repo.language ?? "Unknown"}`);
    lines.push(`- Stars: ${repo.stars} | Forks: ${repo.forks}`);
    lines.push(`- Top-level: ${repo.topLevelStructure.join(", ")}`);
    lines.push("");

    for (const f of repo.files) {
      lines.push(`#### ${f.path} (${f.language}, ${f.lineCount} lines)`);
      lines.push("```");
      lines.push(f.snippet);
      lines.push("```");
      lines.push("");
    }
  }

  let payload = lines.join("\n");

  // Hard cap — Groq free tier allows ~12 K TPM for the 70b model.
  // System prompt ≈ 500 tok, response budget ≈ 2 048 tok → ~9 000 tok for user ≈ 30 K chars.
  // Be conservative to avoid 413 errors.
  const MAX_CHARS = 24_000;
  if (payload.length > MAX_CHARS) {
    payload =
      payload.slice(0, MAX_CHARS) + "\n\n[Content truncated due to length]";
  }

  return payload;
}

// ── Groq call (with retry for 429 rate-limit) ──────────────────────────────

const MAX_RETRIES = 3;

async function callGroqWithRetry(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      return res.json();
    }

    // On 429, parse retry-after and wait
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const errBody = await res.text();
      // Try to extract wait time from the error message
      const waitMatch = errBody.match(/try again in ([\d.]+)s/i);
      const waitSec = waitMatch ? parseFloat(waitMatch[1]) : 3;
      console.log(
        `[groq] Rate limited, waiting ${waitSec.toFixed(1)}s (attempt ${attempt + 1}/${MAX_RETRIES})…`,
      );
      await new Promise((r) => setTimeout(r, Math.ceil(waitSec * 1000) + 500));
      continue;
    }

    const errText = await res.text();
    throw new Error(`Groq API error ${res.status}: ${errText}`);
  }

  throw new Error("Groq API: max retries exceeded");
}

export interface HiringPreferences {
  role_level?: string | null;
  focus?: string | null;
}

export async function analyzeWithGroq(
  profile: GitHubProfile,
  summaries: RepoSummary[],
  preferences?: HiringPreferences,
): Promise<HiringReport> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is not set");
  }

  const userContent = buildUserPayload(profile, summaries);

  // Build system prompt, optionally appending role/level targeting context
  let systemPrompt = SYSTEM_PROMPT;
  if (preferences?.role_level || preferences?.focus) {
    const parts: string[] = [];
    if (preferences.role_level) {
      const label =
        preferences.role_level === "ai-ml"
          ? "AI/ML"
          : preferences.role_level.charAt(0).toUpperCase() +
            preferences.role_level.slice(1);
      parts.push(`target role level is **${label}**`);
    }
    if (preferences.focus) {
      const focusLabels: Record<string, string> = {
        frontend: "Frontend",
        backend: "Backend",
        fullstack: "Full-stack",
        devops: "DevOps",
        "ai-ml": "AI/ML",
      };
      parts.push(
        `target focus area is **${focusLabels[preferences.focus] || preferences.focus}**`,
      );
    }
    systemPrompt += `\n\nIMPORTANT: The hiring manager's ${parts.join(" and ")}. Tailor your evaluation, scoring, and hiring recommendation to these requirements. A candidate who is a great Junior hire may not be a great Senior hire, and vice versa. Similarly, weight skills relevant to the specified focus area more heavily.`;
  }

  const body = {
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Analyze the following GitHub profile and repositories:\n\n${userContent}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 2048,
    response_format: { type: "json_object" },
  };

  const data = await callGroqWithRetry(apiKey, body);
  const raw: string | undefined = (
    data as { choices?: { message?: { content?: string } }[] }
  ).choices?.[0]?.message?.content;

  if (!raw) {
    throw new Error("Empty response from Groq");
  }

  // Strip markdown fences just in case the model wraps anyway
  let jsonStr = raw.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(
      `Failed to parse Groq response as JSON: ${err}\nRaw response:\n${jsonStr.slice(0, 500)}`,
    );
  }

  // Overlay authoritative profile fields from GitHub (don't trust LLM for these)
  const report: HiringReport = {
    ...(parsed as unknown as HiringReport),
    username: profile.login,
    avatarUrl: profile.avatar_url,
    name: profile.name ?? profile.login,
    bio: profile.bio ?? "",
    publicRepos: profile.public_repos,
    followers: profile.followers,
  };

  return report;
}
