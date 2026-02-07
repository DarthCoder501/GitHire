import { NextRequest } from "next/server";
import { ACTIVE_PROMPT } from "@/config/prompts";
import { messageHistory } from "@/lib/conversation/message-history";
import {
  getOrCreateChat,
  addChatMessage,
  getFormattedChatHistory,
  touchChat,
} from "@/lib/conversation/supabase-history";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

if (!GROQ_API_KEY || !DEEPGRAM_API_KEY) {
  throw new Error(
    "Missing GROQ_API_KEY or DEEPGRAM_API_KEY environment variables",
  );
}

/* ── Helpers to resolve auth from the Edge request ── */
async function resolveUser(
  request: NextRequest,
): Promise<{ userId: string; accessToken: string } | null> {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.replace("Bearer ", "");
  if (!accessToken) return null;

  try {
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
  } catch {
    return null;
  }
}

/* ── Step 1: Transcribe audio using Groq Whisper ── */
async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", "whisper-large-v3");

  const response = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: formData,
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq Whisper API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.text || "";
}

/* ── Step 2: Get LLM response stream from Groq Llama 3 ── */
async function* streamLLMResponse(
  messages: Array<{ role: string; content: string }>,
): AsyncGenerator<string, void, unknown> {
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
        messages,
        stream: true,
        temperature: 0.7,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq LLM API error: ${response.status} ${error}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body reader available");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/* ── Step 3: Synthesize speech using Deepgram Aura ── */
async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  const response = await fetch(
    `https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=linear16&container=none&sample_rate=24000`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Deepgram TTS API error: ${response.status} ${error}`);
  }

  return await response.arrayBuffer();
}

/* ── Sentence boundary helpers ── */
function extractSentences(buffer: string): {
  sentences: string[];
  remainder: string;
} {
  const sentences: string[] = [];
  let remainder = buffer;

  const sentenceRegex = /([^.!?]+[.!?])\s*/g;
  let match;
  let lastIndex = 0;

  while ((match = sentenceRegex.exec(buffer)) !== null) {
    sentences.push(match[1].trim());
    lastIndex = match.index + match[0].length;
  }

  remainder = buffer.slice(lastIndex).trim();
  return { sentences, remainder };
}

/* ── Main handler ── */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const candidateUsername =
      (formData.get("candidateUsername") as string) || null;

    if (!audioFile) {
      return new Response("No audio file provided", { status: 400 });
    }

    const audioBlob = new Blob([await audioFile.arrayBuffer()], {
      type: audioFile.type,
    });
    const transcript = await transcribeAudio(audioBlob);

    if (!transcript.trim()) {
      return new Response("No speech detected", { status: 400 });
    }

    /* ── Resolve history: authenticated → Supabase; anonymous → singleton ── */
    const auth = await resolveUser(request);
    let chatId: string | null = null;
    let historyMessages: Array<{ role: string; content: string }>;

    if (auth && candidateUsername) {
      // Authenticated + candidate → Supabase per-chat history
      chatId = await getOrCreateChat(
        auth.accessToken,
        auth.userId,
        candidateUsername,
      );
      await addChatMessage(auth.accessToken, chatId, "user", transcript);
      historyMessages = await getFormattedChatHistory(
        auth.accessToken,
        chatId,
        ACTIVE_PROMPT.system,
      );
    } else {
      // Anonymous fallback → singleton in-memory history
      messageHistory.addMessage("user", transcript);
      historyMessages = messageHistory.getFormattedHistory(
        ACTIVE_PROMPT.system,
      );
    }

    /* ── Stream LLM → TTS pipeline ── */
    let llmBuffer = "";
    let assistantText = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const token of streamLLMResponse(historyMessages)) {
            llmBuffer += token;
            assistantText += token;

            const { sentences, remainder } = extractSentences(llmBuffer);

            for (const sentence of sentences) {
              try {
                const audioBuffer = await synthesizeSpeech(sentence);
                controller.enqueue(new Uint8Array(audioBuffer));
              } catch (error) {
                console.error("TTS synthesis error:", error);
              }
            }

            llmBuffer = remainder;
          }

          // Remaining text
          if (llmBuffer.trim()) {
            try {
              const audioBuffer = await synthesizeSpeech(llmBuffer.trim());
              controller.enqueue(new Uint8Array(audioBuffer));
            } catch (error) {
              console.error("Final TTS synthesis error:", error);
            }
          }

          // Persist assistant response
          if (assistantText.trim()) {
            if (auth && chatId) {
              await addChatMessage(
                auth.accessToken,
                chatId,
                "assistant",
                assistantText.trim(),
              );
              await touchChat(auth.accessToken, chatId);
            } else {
              messageHistory.addMessage("assistant", assistantText.trim());
            }
          }

          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "audio/pcm; rate=24000; channels=1",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("API route error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
