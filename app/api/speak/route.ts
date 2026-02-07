import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

export async function POST(request: NextRequest) {
  if (!DEEPGRAM_API_KEY) {
    return NextResponse.json(
      { error: "DEEPGRAM_API_KEY not configured" },
      { status: 500 },
    );
  }

  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // Fetch TTS from Deepgram Aura — Asteria voice (natural, tech-forward)
    const ttsResponse = await fetch(
      "https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=mp3",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      },
    );

    if (!ttsResponse.ok) {
      const err = await ttsResponse.text();
      console.error("Deepgram TTS error:", ttsResponse.status, err);
      return NextResponse.json(
        { error: `Deepgram error: ${ttsResponse.status}` },
        { status: 502 },
      );
    }

    const audioBuffer = await ttsResponse.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Content-Length": String(audioBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error("TTS route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
