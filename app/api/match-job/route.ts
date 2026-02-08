import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

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

// POST /api/match-job — match a candidate report to a job description
export async function POST(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { candidateUsername?: string; jobDescription?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { candidateUsername, jobDescription } = body;
  if (!candidateUsername || !jobDescription?.trim()) {
    return NextResponse.json(
      { error: "Both candidateUsername and jobDescription are required" },
      { status: 400 },
    );
  }

  // Look up stored report for this candidate
  const { data: reportRow } = await auth.supabase
    .from("reports")
    .select("payload")
    .eq("user_id", auth.user.id)
    .eq("candidate_username", candidateUsername.toLowerCase())
    .single();

  if (!reportRow) {
    return NextResponse.json(
      {
        error: `No saved report found for @${candidateUsername}. Run an analysis first from the home page.`,
      },
      { status: 404 },
    );
  }

  // Generate match using LLM
  try {
    const reportPayload = reportRow.payload as Record<string, unknown>;

    const prompt = `You are a Senior Technical Recruiter AI. Compare a candidate's GitHub hiring report against a job description and produce a structured match assessment.

## Candidate Report (@${candidateUsername})
${JSON.stringify(reportPayload, null, 2)}

## Job Description
${jobDescription.trim()}

Respond with ONLY a valid JSON object matching this exact schema:
{
  "matchScore": <number 0-100>,
  "matchVerdict": "<Strong Match | Good Match | Partial Match | Weak Match>",
  "summary": "<2-3 sentence overall match assessment>",
  "strengths": ["<string: what the candidate brings that matches the JD>", …],
  "gaps": ["<string: where the candidate falls short vs the JD>", …],
  "recommendation": "<1-2 sentence hiring recommendation given this specific JD>"
}

Rules:
- matchScore: 0-100 reflecting how well the candidate fits this specific role
- strengths: 3-5 bullet points on matching qualifications
- gaps: 2-4 bullet points on missing or weak areas vs the JD
- Be specific and reference both the report data and the job description
- Return ONLY the JSON object, no other text`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content:
                "You are a precise technical recruiter. Output ONLY valid JSON.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 1024,
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API error: ${response.status} ${errText}`);
    }

    const llmData = await response.json();
    const matchText =
      (llmData as { choices?: { message?: { content?: string } }[] })
        .choices?.[0]?.message?.content || "{}";

    let matchResult: Record<string, unknown>;
    try {
      matchResult = JSON.parse(matchText);
    } catch {
      matchResult = {
        matchScore: 50,
        matchVerdict: "Partial Match",
        summary: matchText,
        strengths: [],
        gaps: [],
        recommendation: "Could not generate structured match result.",
      };
    }

    return NextResponse.json({ match: matchResult });
  } catch (error) {
    console.error("Match-job error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate match",
      },
      { status: 500 },
    );
  }
}
