"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  Github,
  Clock,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  Search,
} from "lucide-react";
import { GlassCard } from "@/components/dashboard/GlassCard";
import { ReportView } from "@/components/dashboard/ReportView";
import { NavHeader } from "@/components/NavHeader";
import { createClient } from "@/lib/supabase/client";
import type { HiringReport } from "@/lib/types/report";

interface ChatItem {
  id: string;
  candidate_username: string;
  updated_at: string;
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

export default function PastSearchesPage() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [report, setReport] = useState<HiringReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

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
      console.error("Failed to fetch past searches:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const openSearch = useCallback(async (chat: ChatItem) => {
    setSelectedChat(chat);
    setReport(null);
    setReportError(null);
    setReportLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `/api/reports?username=${encodeURIComponent(chat.candidate_username)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );

      if (res.ok) {
        const data = await res.json();
        if (data.report) {
          setReport(data.report as HiringReport);
        } else {
          setReportError(
            "No saved report found for this candidate. Run a new analysis from the home page to generate one.",
          );
        }
      } else if (res.status === 404) {
        setReportError(
          "No saved report found for this candidate. Run a new analysis from the home page to generate one.",
        );
      } else {
        setReportError("Failed to load report.");
      }
    } catch (err) {
      console.error("Failed to fetch report:", err);
      setReportError("Failed to load report.");
    } finally {
      setReportLoading(false);
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
            /* ── Report Detail View ── */
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Back button */}
              <button
                onClick={() => {
                  setSelectedChat(null);
                  setReport(null);
                  setReportError(null);
                }}
                className="flex items-center gap-2 text-sm text-text-secondary hover:text-teal transition-colors mb-6"
              >
                <ArrowLeft size={16} />
                Back to past searches
              </button>

              {/* Candidate header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-teal/10 border border-teal/20 flex items-center justify-center">
                  <Github size={18} className="text-teal" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-text-primary">
                    @{selectedChat.candidate_username}
                  </h2>
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary">
                    Hiring Report
                  </p>
                </div>
              </div>

              {/* Report content */}
              {reportLoading ? (
                <div className="flex items-center gap-2 py-16 justify-center">
                  <div className="w-4 h-4 border-2 border-teal/30 border-t-teal rounded-full animate-spin" />
                  <span className="text-xs text-text-tertiary font-mono">
                    Loading report...
                  </span>
                </div>
              ) : reportError ? (
                <GlassCard className="text-center py-12">
                  <AlertCircle
                    size={32}
                    className="text-text-tertiary mx-auto mb-3"
                  />
                  <p className="text-sm text-text-secondary mb-4 max-w-md mx-auto">
                    {reportError}
                  </p>
                  <a
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-teal hover:text-teal/80 transition-colors"
                  >
                    <Search size={14} />
                    Go to Analyze
                  </a>
                </GlassCard>
              ) : report ? (
                <ReportView report={report} />
              ) : null}
            </motion.div>
          ) : (
            /* ── Past Searches List ── */
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <History size={20} className="text-teal" />
                <h1 className="text-xl font-semibold text-text-primary">
                  Past Searches
                </h1>
              </div>

              <p className="text-sm text-text-secondary mb-8 max-w-lg">
                Your previous GitHub profile analyses. Select one to view the
                full hiring report.
              </p>

              {loading ? (
                <div className="space-y-3 max-w-2xl">
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
                <GlassCard className="text-center py-16 max-w-xl">
                  <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4">
                    <History size={28} className="text-text-tertiary" />
                  </div>
                  <p className="text-sm text-text-tertiary max-w-[280px] mx-auto leading-relaxed">
                    No past searches yet. Analyze a GitHub profile from the home
                    page to see it here.
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
                      onClick={() => openSearch(chat)}
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
