"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Github,
  Clock,
  ChevronRight,
  User,
  Bot,
  ArrowLeft,
} from "lucide-react";
import { GlassCard } from "@/components/dashboard/GlassCard";
import { NavHeader } from "@/components/NavHeader";
import { createClient } from "@/lib/supabase/client";

interface ChatItem {
  id: string;
  candidate_username: string;
  updated_at: string;
  created_at: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ChatsPage() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const fetchChats = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/chats", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setChats(data.chats || []);
      }
    } catch (err) {
      console.error("Failed to fetch chats:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const loadMessages = useCallback(async (chat: ChatItem) => {
    setSelectedChat(chat);
    setMessagesLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/chats/${chat.id}/messages`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  return (
    <main className="min-h-screen relative">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(ellipse,rgba(0,229,176,0.06)_0%,transparent_70%)]" />
        <div className="absolute -bottom-[30%] -right-[15%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(ellipse,rgba(0,229,176,0.04)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-10 py-8 md:py-12">
        <NavHeader />

        <AnimatePresence mode="wait">
          {selectedChat ? (
            /* ── Message View ── */
            <motion.div
              key="messages"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Back button */}
              <button
                onClick={() => {
                  setSelectedChat(null);
                  setMessages([]);
                }}
                className="flex items-center gap-2 text-sm text-text-secondary hover:text-teal transition-colors mb-6"
              >
                <ArrowLeft size={16} />
                Back to chats
              </button>

              {/* Chat header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-teal/10 border border-teal/20 flex items-center justify-center">
                  <Github size={18} className="text-teal" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-text-primary">
                    @{selectedChat.candidate_username}
                  </h2>
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary">
                    Conversation History
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-3 max-w-3xl">
                {messagesLoading ? (
                  <div className="flex items-center gap-2 py-12 justify-center">
                    <div className="w-4 h-4 border-2 border-teal/30 border-t-teal rounded-full animate-spin" />
                    <span className="text-xs text-text-tertiary font-mono">
                      Loading messages...
                    </span>
                  </div>
                ) : messages.length === 0 ? (
                  <GlassCard className="text-center py-12">
                    <MessageSquare
                      size={32}
                      className="text-text-tertiary mx-auto mb-3"
                    />
                    <p className="text-sm text-text-tertiary">
                      No messages in this conversation yet.
                    </p>
                  </GlassCard>
                ) : (
                  messages
                    .filter((m) => m.role !== "system")
                    .map((msg, i) => (
                      <motion.div
                        key={msg.id}
                        className={`flex items-start gap-3 ${
                          msg.role === "user" ? "justify-end" : ""
                        }`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        {msg.role === "assistant" && (
                          <div className="w-7 h-7 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Bot size={13} className="text-teal" />
                          </div>
                        )}
                        <div
                          className={`glass rounded-2xl px-4 py-3 max-w-[80%] ${
                            msg.role === "user"
                              ? "bg-teal/10 border-teal/20"
                              : ""
                          }`}
                        >
                          <p className="text-[13px] leading-relaxed text-text-secondary">
                            {msg.content}
                          </p>
                        </div>
                        {msg.role === "user" && (
                          <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                            <User size={13} className="text-text-tertiary" />
                          </div>
                        )}
                      </motion.div>
                    ))
                )}
              </div>
            </motion.div>
          ) : (
            /* ── Chat List ── */
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <MessageSquare size={20} className="text-teal" />
                <h1 className="text-xl font-semibold text-text-primary">
                  Your Chats
                </h1>
              </div>

              <p className="text-sm text-text-secondary mb-8 max-w-lg">
                Your conversation history with analyzed candidates. Each chat is
                a separate thread per GitHub user you&apos;ve discussed.
              </p>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="glass rounded-2xl p-5 animate-pulse"
                    >
                      <div className="h-4 bg-white/[0.04] rounded w-32 mb-2" />
                      <div className="h-3 bg-white/[0.03] rounded w-20" />
                    </div>
                  ))}
                </div>
              ) : chats.length === 0 ? (
                <GlassCard className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4">
                    <MessageSquare size={28} className="text-text-tertiary" />
                  </div>
                  <p className="text-sm text-text-tertiary max-w-[280px] mx-auto leading-relaxed">
                    No conversations yet. Analyze a GitHub profile and start a
                    conversation to see it here.
                  </p>
                </GlassCard>
              ) : (
                <motion.div
                  className="space-y-3 max-w-2xl"
                  variants={stagger}
                  initial="hidden"
                  animate="visible"
                >
                  {chats.map((chat) => (
                    <GlassCard
                      key={chat.id}
                      className="cursor-pointer group"
                      variants={fadeUp}
                      onClick={() => loadMessages(chat)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal/10 border border-teal/20 flex items-center justify-center">
                            <Github size={16} className="text-teal" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-text-primary group-hover:text-teal transition-colors">
                              @{chat.candidate_username}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Clock size={10} className="text-text-tertiary" />
                              <span className="text-[10px] font-mono text-text-tertiary">
                                {timeAgo(chat.updated_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight
                          size={16}
                          className="text-text-tertiary group-hover:text-teal group-hover:translate-x-1 transition-all duration-300"
                        />
                      </div>
                    </GlassCard>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
