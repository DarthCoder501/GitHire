/**
 * Supabase Database types — manually defined to match our schema.
 * Run `supabase gen types typescript` for auto-generated types if using Supabase CLI.
 */

export interface Database {
  public: {
    Tables: {
      reports: {
        Row: {
          id: string;
          user_id: string;
          candidate_username: string;
          payload: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          candidate_username: string;
          payload: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          candidate_username?: string;
          payload?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
      };
      chats: {
        Row: {
          id: string;
          user_id: string;
          candidate_username: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          candidate_username: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          candidate_username?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          sequence: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          sequence?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          role?: "user" | "assistant" | "system";
          content?: string;
          sequence?: number;
          created_at?: string;
        };
      };
      comparisons: {
        Row: {
          id: string;
          user_id: string;
          candidate_a: string;
          candidate_b: string;
          result: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          candidate_a: string;
          candidate_b: string;
          result: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          candidate_a?: string;
          candidate_b?: string;
          result?: Record<string, unknown>;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
