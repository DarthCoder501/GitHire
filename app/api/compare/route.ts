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

/** Normalize pair so candidate_a < candidate_b. */
function normalizePair(a: string, b: string): [string, string] {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  return la < lb ? [la, lb] : [lb, la];
}

// POST /api/compare — compare two candidates
export async function POST(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { candidateA?: string; candidateB?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { candidateA, candidateB } = body;
  if (!candidateA || !candidateB) {
    return NextResponse.json(
      { error: "Both candidateA and candidateB are required" },
      { status: 400 },
    );
  }

  if (candidateA.toLowerCase() === candidateB.toLowerCase()) {
    return NextResponse.json(
      { error: "Cannot compare a candidate with themselves" },
      { status: 400 },
    );
  }

  const [normA, normB] = normalizePair(candidateA, candidateB);

  // Check for existing comparison
  const { data: existing } = await auth.supabase
    .from("comparisons")
    .select("result")
    .eq("user_id", auth.user.id)
    .eq("candidate_a", normA)
    .eq("candidate_b", normB)
    .single();

  if (existing) {
    return NextResponse.json({
      comparison: existing.result,
      cached: true,
    });
  }

  // Look up stored reports for both candidates
  const { data: reportA } = await auth.supabase
    .from("reports")
    .select("payload")
    .eq("user_id", auth.user.id)
    .eq("candidate_username", normA)
    .single();

  const { data: reportB } = await auth.supabase
    .from("reports")
    .select("payload")
    .eq("user_id", auth.user.id)
    .eq("candidate_username", normB)
    .single();

  const missingReports: string[] = [];
  if (!reportA) missingReports.push(normA);
  if (!reportB) missingReports.push(normB);

  if (missingReports.length > 0) {
    return NextResponse.json(
      {
        error: `Reports not found for: ${missingReports.join(", ")}. Please run analysis for each candidate first.`,
        missingReports,
      },
      { status: 404 },
    );
  }

  // Generate comparison using LLM
  try {
    const prompt = `You are a Senior Technical Hiring Manager. Compare these two GitHub developer profiles and provide a structured hiring comparison.

Candidate A (@${normA}):
${JSON.stringify(reportA!.payload, null, 2)}

Candidate B (@${normB}):
${JSON.stringify(reportB!.payload, null, 2)}

Provide your comparison as a JSON object with these exact fields:
{
  "summary": "2-3 sentence executive summary comparing both candidates",
  "winner": "${normA}" or "${normB}" or "tie",
  "winnerReason": "1 sentence explaining the winner choice",
  "categories": [
    {
      "category": "Category Name",
      "candidateA": { "score": number 0-100, "note": "short note" },
      "candidateB": { "score": number 0-100, "note": "short note" }
    }
  ],
  "recommendation": "Final hiring recommendation comparing both"
}

Categories to compare: Code Quality, Consistency, Impact, Documentation, Testing, Overall Hiring Score.
Return ONLY valid JSON, no markdown.`;

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
                "You are a precise technical hiring evaluator. Output ONLY valid JSON.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API error: ${response.status} ${errText}`);
    }

    const llmData = await response.json();
    const comparisonText = llmData.choices?.[0]?.message?.content || "{}";

    let comparison: Record<string, unknown>;
    try {
      comparison = JSON.parse(comparisonText);
    } catch {
      comparison = {
        summary: comparisonText,
        winner: "tie",
        winnerReason: "Could not parse structured comparison",
        categories: [],
        recommendation: comparisonText,
      };
    }

    // Store comparison
    const { error: insertErr } = await auth.supabase
      .from("comparisons")
      .insert({
        user_id: auth.user.id,
        candidate_a: normA,
        candidate_b: normB,
        result: comparison,
      });

    if (insertErr) {
      console.error("Failed to store comparison:", insertErr.message);
    }

    return NextResponse.json({ comparison, cached: false });
  } catch (error) {
    console.error("Comparison error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate comparison",
      },
      { status: 500 },
    );
  }
}

// GET /api/compare?candidateA=xxx&candidateB=yyy — read-only lookup
export async function GET(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const candidateA = url.searchParams.get("candidateA");
  const candidateB = url.searchParams.get("candidateB");

  if (!candidateA || !candidateB) {
    return NextResponse.json(
      { error: "Both candidateA and candidateB query params are required" },
      { status: 400 },
    );
  }

  const [normA, normB] = normalizePair(candidateA, candidateB);

  const { data } = await auth.supabase
    .from("comparisons")
    .select("result, created_at")
    .eq("user_id", auth.user.id)
    .eq("candidate_a", normA)
    .eq("candidate_b", normB)
    .single();

  if (!data) {
    return NextResponse.json(
      { error: "No comparison found for this pair" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    comparison: data.result,
    created_at: data.created_at,
  });
}
