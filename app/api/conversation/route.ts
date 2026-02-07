import { NextRequest } from 'next/server';
import { ACTIVE_PROMPT } from '@/config/prompts';
import { messageHistory } from '@/lib/conversation/message-history';

export const runtime = 'edge';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

if (!GROQ_API_KEY || !DEEPGRAM_API_KEY) {
  throw new Error('Missing GROQ_API_KEY or DEEPGRAM_API_KEY environment variables');
}

// Step 1: Transcribe audio using Groq Whisper
async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-large-v3');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq Whisper API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.text || '';
}

// Step 2: Get LLM response stream from Groq Llama 3
async function* streamLLMResponse(userText: string): AsyncGenerator<string, void, unknown> {
  // Add user message to history
  messageHistory.addMessage('user', userText);

  // Get formatted history with system prompt
  const messages = messageHistory.getFormattedHistory(ACTIVE_PROMPT.system);

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant', // Groq model - adjust if needed: llama-3.1-70b-versatile, llama-3.1-8b-instant, etc.
      messages: messages,
      stream: true,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq LLM API error: ${response.status} ${error}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body reader available');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return;
          }

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// Step 3: Synthesize speech using Deepgram Aura
async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  const response = await fetch(
    `https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=linear16&container=none&sample_rate=24000`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Deepgram TTS API error: ${response.status} ${error}`);
  }

  return await response.arrayBuffer();
}

// Sentence boundary detection
function isSentenceComplete(text: string): boolean {
  const trimmed = text.trim();
  return /[.!?]\s*$/.test(trimmed);
}

// Extract complete sentences from buffer
function extractSentences(buffer: string): { sentences: string[]; remainder: string } {
  const sentences: string[] = [];
  let remainder = buffer;

  // Match sentences ending with . ! or ?
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

// Main handler
export async function POST(request: NextRequest) {
  try {
    // Step 1: Receive and transcribe audio
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return new Response('No audio file provided', { status: 400 });
    }

    const audioBlob = new Blob([await audioFile.arrayBuffer()], { type: audioFile.type });
    const transcript = await transcribeAudio(audioBlob);

    if (!transcript.trim()) {
      return new Response('No speech detected', { status: 400 });
    }

    // Step 2 & 3: Stream LLM response and synthesize TTS
    const encoder = new TextEncoder();
    let llmBuffer = '';
    let assistantText = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream LLM tokens
          for await (const token of streamLLMResponse(transcript)) {
            llmBuffer += token;
            assistantText += token;

            // Check for sentence boundaries
            const { sentences, remainder } = extractSentences(llmBuffer);

            // Synthesize and stream each complete sentence
            for (const sentence of sentences) {
              try {
                const audioBuffer = await synthesizeSpeech(sentence);
                controller.enqueue(new Uint8Array(audioBuffer));
              } catch (error) {
                console.error('TTS synthesis error:', error);
                // Continue with next sentence
              }
            }

            llmBuffer = remainder;
          }

          // Synthesize any remaining text
          if (llmBuffer.trim()) {
            try {
              const audioBuffer = await synthesizeSpeech(llmBuffer.trim());
              controller.enqueue(new Uint8Array(audioBuffer));
            } catch (error) {
              console.error('Final TTS synthesis error:', error);
            }
          }

          // Add assistant message to history
          if (assistantText.trim()) {
            messageHistory.addMessage('assistant', assistantText.trim());
          }

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'audio/pcm; rate=24000; channels=1',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('API route error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

