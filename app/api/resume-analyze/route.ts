// ---------------------------------------------------------------------------
// POST /api/resume-analyze — analyze resume text and return resume report
// Body: { resumeText: string }
// Auth optional. Returns ResumeReport.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import type { ResumeReport } from "@/lib/types/resumeReport";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const SYSTEM_PROMPT = `You are a Principal Engineer and Hiring Manager. You analyze resume text and produce a resume-focused evaluation.

You MUST respond with ONLY a valid JSON object — no markdown fences, no explanation. The JSON must exactly conform to this schema:

{
  "experienceScore": <number 0-100>,
  "skillsScore": <number 0-100>,
  "consistencyScore": <number 0-100>,
  "clarityScore": <number 0-100>,
  "overallScore": <number 0-100>,
  "strengths": ["<string>", …],
  "growthAreas": ["<string>", …],
  "recommendation": "<string, 2-4 sentence hiring-oriented recommendation>",
  "executiveSummary": "<string, 2-3 sentence high-level summary>"
}

Evaluation rules:
- experienceScore: depth and relevance of experience (roles, tenure, impact).
- skillsScore: breadth and specificity of technical skills.
- consistencyScore: coherence, formatting, no contradictions.
- clarityScore: readability, structure, clear achievements.
- overallScore: weighted combination; be fair and evidence-based.
- strengths: 3-5 concrete positives from the resume.
- growthAreas: 2-4 constructive gaps or improvements.
- recommendation: hiring-oriented (e.g. "Strong fit for mid-level frontend" or "Consider for backend with more systems experience").
- executiveSummary: brief high-level summary.

Return ONLY the JSON object. No other text.`;

export async function POST(request: NextRequest) {
  if (!GROQ_API_KEY) {
    return NextResponse.json(
      { error: "GROQ_API_KEY not configured" },
      { status: 500 },
    );
  }

  let body: { resumeText?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const resumeText =
    typeof body.resumeText === "string" ? body.resumeText.trim() : "";
  if (!resumeText || resumeText.length < 100) {
    return NextResponse.json(
      { error: "resumeText is required and should be at least 100 characters" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Analyze the following resume text and return the JSON evaluation:\n\n${resumeText.slice(0, 12000)}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1024,
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

    let jsonStr = raw.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    const report: ResumeReport = {
      experienceScore: Number(parsed.experienceScore) || 0,
      skillsScore: Number(parsed.skillsScore) || 0,
      consistencyScore: Number(parsed.consistencyScore) || 0,
      clarityScore: Number(parsed.clarityScore) || 0,
      overallScore: Number(parsed.overallScore) || 0,
      strengths: Array.isArray(parsed.strengths)
        ? parsed.strengths.map(String)
        : [],
      growthAreas: Array.isArray(parsed.growthAreas)
        ? parsed.growthAreas.map(String)
        : [],
      recommendation: String(parsed.recommendation || ""),
      executiveSummary:
        parsed.executiveSummary != null
          ? String(parsed.executiveSummary)
          : undefined,
    };

    return NextResponse.json({ report });
  } catch (err) {
    console.error("[resume-analyze]", err);
    const msg = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
