"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Github, ArrowRight, AlertCircle } from "lucide-react";

import { SkeletonLoader } from "@/components/dashboard/SkeletonLoader";
import { SpeechBubble } from "@/components/dashboard/SpeechBubble";
import { ReportView } from "@/components/dashboard/ReportView";
import { NavHeader } from "@/components/NavHeader";
import { getSpeechAudioManager } from "@/lib/audio/SpeechAudioManager";
import { createClient } from "@/lib/supabase/client";
import type { HiringReport } from "@/lib/types/report";

/* ─── Page ─── */
export default function Home() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [report, setReport] = useState<HiringReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Audio manager ref — primed during the user-gesture click
  const audioMgrRef = useRef<ReturnType<typeof getSpeechAudioManager> | null>(
    null,
  );

  const handleAnalyze = useCallback(async () => {
    if (!username.trim()) return;

    // Prime AudioContext during user gesture (autoplay policy)
    const mgr = getSpeechAudioManager();
    mgr.ensureContext();
    audioMgrRef.current = mgr;

    // Cancel any in-flight speech
    mgr.cancel();

    setIsLoading(true);
    setShowResults(false);
    setReport(null);
    setError(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const {
        data: { session },
      } = await createClient().auth.getSession();
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers,
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      setReport(data.report);
      setShowResults(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setShowResults(false);
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  return (
    <main className="min-h-screen relative">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(ellipse,rgba(0,229,176,0.06)_0%,transparent_70%)]" />
        <div className="absolute -bottom-[30%] -right-[15%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(ellipse,rgba(0,229,176,0.04)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-10 py-8 md:py-12">
        {/* ─── Header (Nav) ─── */}
        <NavHeader />

        {/* ─── Main Split Layout ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-10 xl:gap-16 items-start">
          {/* ── LEFT: Robot + Input ── */}
          <div className="flex flex-col items-center lg:items-start lg:sticky lg:top-12">
            {/* ── Row: Robot + Speech Bubble side-by-side ── */}
            <div className="flex items-start gap-5 mb-6 w-full">
              {/* Floating Robot (anchor) */}
              <motion.div
                className="relative w-[200px] h-[200px] md:w-[240px] md:h-[240px] shrink-0"
                animate={{ y: [0, -14, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {/* Glow behind robot */}
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(0,229,176,0.1)_0%,transparent_65%)] blur-2xl" />
                <Image
                  src="/robot.png"
                  alt="GitHire Robot"
                  fill
                  className="object-contain drop-shadow-2xl relative z-10"
                  priority
                />
              </motion.div>

              {/* Speech Bubble — positioned to the right of the robot */}
              <div className="flex-1 min-w-0 pt-4">
                <SpeechBubble
                  text={report?.executiveSummary ?? ""}
                  active={showResults && !!report}
                  audioManagerRef={audioMgrRef}
                />
              </div>
            </div>

            {/* Input area (below the robot row) */}
            <motion.div
              className="w-full max-w-[400px]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              {/* Bubble tail */}
              <div className="relative">
                <div className="absolute -top-3 left-12 w-6 h-6 rotate-45 glass border-r-0 border-b-0" />
              </div>

              <div className="glass rounded-2xl p-6 relative">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal/20 to-transparent" />

                <p className="text-sm text-text-secondary mb-4 leading-relaxed">
                  Enter a{" "}
                  <span className="text-teal font-medium">GitHub username</span>{" "}
                  and I&apos;ll produce a comprehensive, hiring-grade
                  evaluation.
                </p>

                {/* Input */}
                <div className="relative mb-4">
                  <Github
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
                  />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                    placeholder="e.g. torvalds"
                    className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-text-primary placeholder:text-text-tertiary glow-ring transition-all duration-300 focus:border-teal/30 font-mono"
                  />
                </div>

                {/* Analyze button */}
                <motion.button
                  onClick={handleAnalyze}
                  disabled={isLoading || !username.trim()}
                  className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden group"
                  style={{
                    background:
                      "linear-gradient(135deg, #00E5B0 0%, #00C49A 100%)",
                    color: "#07080D",
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#07080D]/30 border-t-[#07080D] rounded-full animate-spin" />
                      Analyzing repos…
                    </>
                  ) : (
                    <>
                      <Search size={16} />
                      Analyze Profile
                      <ArrowRight
                        size={16}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </>
                  )}
                  {/* Hover glow */}
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
                </motion.button>
              </div>

              {/* Error display */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="mt-4 glass rounded-xl p-4"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle
                        size={16}
                        className="text-red-400 mt-0.5 shrink-0"
                      />
                      <p className="text-sm text-red-300">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick stats beneath input (shown after results) */}
              <AnimatePresence>
                {showResults && report && (
                  <motion.div
                    className="mt-6 glass rounded-2xl p-5"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ delay: 0.2 }}
                  >
                    {/* Profile card */}
                    <div className="flex items-center gap-3 mb-4">
                      <Image
                        src={report!.avatarUrl}
                        alt={report!.name}
                        width={44}
                        height={44}
                        className="rounded-full ring-2 ring-teal/20"
                      />
                      <div>
                        <p className="text-sm font-semibold">{report!.name}</p>
                        <p className="text-xs text-text-secondary font-mono">
                          @{report!.username}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed mb-4">
                      {report!.bio}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-2 rounded-lg bg-white/[0.02]">
                        <p className="text-lg font-bold text-teal">
                          {report!.publicRepos}
                        </p>
                        <p className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider">
                          Repos
                        </p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-white/[0.02]">
                        <p className="text-lg font-bold text-teal">
                          {(report!.followers / 1000).toFixed(0)}k
                        </p>
                        <p className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider">
                          Followers
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* ── RIGHT: Bento Grid Dashboard ── */}
          <div className="w-full">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loader"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.3 }}
                >
                  <SkeletonLoader />
                </motion.div>
              ) : showResults ? null : (
                <motion.div
                  key="empty"
                  className="flex flex-col items-center justify-center min-h-[500px] text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center mb-6">
                    <Github size={32} className="text-text-tertiary" />
                  </div>
                  <p className="text-text-tertiary text-sm max-w-[280px] leading-relaxed">
                    Enter a GitHub username to generate a hiring-grade
                    evaluation with scores, strengths, and recommendations.
                  </p>
                </motion.div>
              )}

              {showResults && report && <ReportView report={report} />}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
}
