// ---------------------------------------------------------------------------
// Groq LLM — verify resume project bullets against repo evidence.
// Returns per-bullet status (supported / partially_supported / not_found / contradicted) and evidence.
// ---------------------------------------------------------------------------

import type { RepoSummary } from "@/lib/github/summarize";
import type {
  BulletAssessment,
  BulletAssessmentStatus,
} from "@/lib/types/truthfulness";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

function serializeRepoSummaries(summaries: RepoSummary[]): string {
  const lines: string[] = [];
  for (const repo of summaries) {
    lines.push(`## Repo: ${repo.name}`);
    lines.push(`Description: ${repo.description ?? "None"}`);
    lines.push(`Language: ${repo.language ?? "Unknown"}`);
    lines.push(`Top-level: ${repo.topLevelStructure.join(", ")}`);
    for (const f of repo.files) {
      lines.push(`### ${f.path} (${f.language}, ${f.lineCount} lines)`);
      lines.push("```");
      lines.push(f.snippet);
      lines.push("```");
    }
    lines.push("");
  }
  return lines.join("\n");
}

const STATUS_VALUES: BulletAssessmentStatus[] = [
  "supported",
  "partially_supported",
  "not_found",
  "contradicted",
];

function parseBulletAssessments(
  raw: unknown,
  bullets: string[],
): BulletAssessment[] {
  const arr = Array.isArray(raw)
    ? raw
    : (raw as { bulletAssessments?: unknown[] })?.bulletAssessments;
  if (!Array.isArray(arr)) return [];

  const byBullet = new Map<string, BulletAssessment>();
  for (const item of arr) {
    const o = item as Record<string, unknown>;
    const bullet = String(o.bullet ?? "").trim();
    if (!bullet) continue;
    const status = STATUS_VALUES.includes(o.status as BulletAssessmentStatus)
      ? (o.status as BulletAssessmentStatus)
      : "not_found";
    const evidence = String(o.evidence ?? "").trim();
    const extractedClaims = Array.isArray(o.extractedClaims)
      ? (o.extractedClaims as string[]).map(String)
      : undefined;
    byBullet.set(bullet, { bullet, status, evidence, extractedClaims });
  }

  return bullets.map(
    (b) =>
      byBullet.get(b) ?? {
        bullet: b,
        status: "not_found" as const,
        evidence: "No assessment returned.",
      },
  );
}

/**
 * Call Groq to assess each resume bullet against repo evidence.
 */
export async function verifyBulletsAgainstRepos(
  bullets: string[],
  repoSummaries: RepoSummary[],
): Promise<BulletAssessment[]> {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");
  if (bullets.length === 0) return [];

  const repoContext = serializeRepoSummaries(repoSummaries);
  const bulletsJson = JSON.stringify(bullets);

  const systemPrompt = `You are a technical hiring analyst. You verify whether resume project bullets are supported by the candidate's GitHub repository evidence.

You MUST respond with ONLY a valid JSON object — no markdown fences, no explanation. The JSON must have exactly this shape:

{
  "bulletAssessments": [
    {
      "bullet": "<exact resume bullet text>",
      "status": "<one of: supported | partially_supported | not_found | contradicted>",
      "evidence": "<short 1-3 sentence evidence: file names, features, or why not found>",
      "extractedClaims": ["<technology or number claimed>", "<e.g. 4 React components>", "…"]
    }
  ]
}

Rules:
- supported: The repo clearly shows the claimed technologies, numbers, or features (e.g. React components, TTS, scroll-triggered logic).
- partially_supported: Some claims are in the repo but not all (e.g. project name matches but specific tech not found).
- not_found: No relevant evidence in repo structure, README, or code snippets.
- contradicted: Repo evidence contradicts the claim (e.g. claims "4 components" but repo has 1; claims "ElevenLabs" but no TTS code).
- evidence: Reference specific files or features when possible (e.g. "package.json has elevenlabs; Avatar.tsx has scroll logic").
- extractedClaims: List technologies, numbers, or features the candidate claimed (e.g. "4 React components", "ElevenLabs TTS", "scroll-triggered").
- You must return exactly one assessment per bullet in the input list. Use the exact bullet text for the "bullet" field.

Return ONLY the JSON object. No other text.`;

  const userPrompt = `Resume project bullets (one per item):\n${bulletsJson}\n\nGitHub repo evidence (structure, files, code snippets):\n${repoContext.slice(0, 28000)}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Empty response from Groq");

  let jsonStr = String(raw).trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  return parseBulletAssessments(parsed, bullets);
}
