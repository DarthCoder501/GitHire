/**
 * Supabase-backed per-chat message history.
 *
 * Authenticated users get a Supabase-persisted chat keyed by (user_id, candidate_username).
 * Falls back to the singleton in-memory history for anonymous/unauthenticated usage
 * so the existing flow never breaks.
 */

import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client for Edge Runtime (no cookies — uses service-like anon key with RLS)
function getEdgeSupabase(accessToken?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const client = createClient(url, anonKey, {
    global: {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
    },
  });

  return client;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Get or create a chat for (user, candidate). Returns chat ID.
 */
export async function getOrCreateChat(
  accessToken: string,
  userId: string,
  candidateUsername: string,
): Promise<string> {
  const supabase = getEdgeSupabase(accessToken);

  // Try to find existing
  const { data: existing } = await supabase
    .from("chats")
    .select("id")
    .eq("user_id", userId)
    .eq("candidate_username", candidateUsername)
    .single();

  if (existing) return existing.id;

  // Create new
  const { data: created, error } = await supabase
    .from("chats")
    .insert({ user_id: userId, candidate_username: candidateUsername })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create chat: ${error.message}`);
  return created!.id;
}

/**
 * Add a message to a Supabase chat.
 */
export async function addChatMessage(
  accessToken: string,
  chatId: string,
  role: "user" | "assistant" | "system",
  content: string,
): Promise<void> {
  const supabase = getEdgeSupabase(accessToken);

  const { error } = await supabase
    .from("messages")
    .insert({ chat_id: chatId, role, content });

  if (error) {
    console.error("Failed to insert message:", error.message);
  }
}

/**
 * Get formatted message history for a chat (for LLM context).
 */
export async function getFormattedChatHistory(
  accessToken: string,
  chatId: string,
  systemPrompt: string,
  maxMessages = 20,
): Promise<ChatMessage[]> {
  const supabase = getEdgeSupabase(accessToken);

  const { data: messages, error } = await supabase
    .from("messages")
    .select("role, content")
    .eq("chat_id", chatId)
    .order("sequence", { ascending: true })
    .limit(maxMessages);

  if (error) {
    console.error("Failed to fetch messages:", error.message);
    return [{ role: "system", content: systemPrompt }];
  }

  return [
    { role: "system", content: systemPrompt },
    ...(messages || [])
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
  ];
}

/**
 * Get all messages for a chat (for display in UI).
 */
export async function getChatMessages(
  accessToken: string,
  chatId: string,
): Promise<ChatMessage[]> {
  const supabase = getEdgeSupabase(accessToken);

  const { data, error } = await supabase
    .from("messages")
    .select("role, content")
    .eq("chat_id", chatId)
    .order("sequence", { ascending: true });

  if (error) {
    console.error("Failed to fetch messages:", error.message);
    return [];
  }

  return (data || []).map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));
}

/**
 * List all chats for a user (for chat list UI).
 */
export async function listUserChats(
  accessToken: string,
  userId: string,
): Promise<
  Array<{
    id: string;
    candidate_username: string;
    updated_at: string;
    created_at: string;
  }>
> {
  const supabase = getEdgeSupabase(accessToken);

  const { data, error } = await supabase
    .from("chats")
    .select("id, candidate_username, updated_at, created_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to list chats:", error.message);
    return [];
  }

  return data || [];
}

/**
 * Touch (update) a chat's updated_at to now.
 */
export async function touchChat(
  accessToken: string,
  chatId: string,
): Promise<void> {
  const supabase = getEdgeSupabase(accessToken);

  await supabase
    .from("chats")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chatId);
}
