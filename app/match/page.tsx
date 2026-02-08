"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  Github,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
  Target,
} from "lucide-react";
import { GlassCard } from "@/components/dashboard/GlassCard";
import { NavHeader } from "@/components/NavHeader";
import { createClient } from "@/lib/supabase/client";

interface MatchResult {
  matchScore: number;
  matchVerdict: string;
  summary: string;
  strengths: string[];
  gaps: string[];
  recommendation: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-teal";
  if (score >= 60) return "text-green";
  if (score >= 40) return "text-amber";
  return "text-red";
}

function verdictBg(verdict: string): string {
  if (verdict.includes("Strong")) return "bg-teal/10 border-teal/20 text-teal";
  if (verdict.includes("Good")) return "bg-green/10 border-green/20 text-green";
  if (verdict.includes("Partial"))
    return "bg-amber/10 border-amber/20 text-amber";
  return "bg-red/10 border-red/20 text-red";
}

export default function MatchPage() {
  const [username, setUsername] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);

  const handleMatch = useCallback(async () => {
    if (!username.trim() || !jobDescription.trim()) return;

    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Please sign in to use the job match feature");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/match-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          candidateUsername: username.trim(),
          jobDescription: jobDescription.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Match failed");
        setLoading(false);
        return;
      }

      setResult(data.match as MatchResult);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [username, jobDescription]);

  return (
    <main className="min-h-screen relative">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(ellipse,rgba(0,229,176,0.06)_0%,transparent_70%)]" />
        <div className="absolute -bottom-[30%] -right-[15%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(ellipse,rgba(0,229,176,0.04)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-10 py-8 md:py-12">
        <NavHeader />

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Briefcase size={20} className="text-teal" />
          <h1 className="text-xl font-semibold text-text-primary">
            Job Description Match
          </h1>
        </div>

        <p className="text-sm text-text-secondary mb-8 max-w-2xl">
          See how well a candidate&apos;s GitHub profile matches a specific job
          description. The candidate must have an existing report in your
          account.
        </p>

        {/* Input section */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Inputs */}
          <GlassCard>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-4 block">
              Match Inputs
            </span>

            {/* Candidate username */}
            <div className="mb-4">
              <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-2 block">
                GitHub Username
              </label>
              <div className="relative">
                <Github
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. torvalds"
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-text-primary placeholder:text-text-tertiary glow-ring transition-all duration-300 focus:border-teal/30 font-mono"
                />
              </div>
            </div>

            {/* Job description */}
            <div className="mb-5">
              <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-2 block">
                Job Description
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here..."
                rows={8}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-text-primary placeholder:text-text-tertiary glow-ring transition-all duration-300 focus:border-teal/30 font-mono resize-none leading-relaxed"
              />
            </div>

            {/* Match button */}
            <motion.button
              onClick={handleMatch}
              disabled={loading || !username.trim() || !jobDescription.trim()}
              className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden group"
              style={{
                background: "linear-gradient(135deg, #00E5B0 0%, #00C49A 100%)",
                color: "#07080D",
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Matching...
                </>
              ) : (
                <>
                  <Target size={16} />
                  Match to Job
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </>
              )}
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
            </motion.button>
          </GlassCard>

          {/* Right: Results */}
          <div className="space-y-4">
            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className="flex items-center gap-2 p-4 rounded-2xl bg-red/10 border border-red/20"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <AlertCircle size={16} className="text-red shrink-0" />
                  <p className="text-sm text-red">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {result && (
                <motion.div
                  className="space-y-4"
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0 }}
                  variants={{
                    hidden: {},
                    visible: {
                      transition: {
                        staggerChildren: 0.08,
                        delayChildren: 0.1,
                      },
                    },
                  }}
                >
                  {/* Score + Verdict */}
                  <GlassCard variants={fadeUp} className="text-center py-8">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-4 block">
                      Match Score
                    </span>
                    <p
                      className={`text-5xl font-bold mb-3 ${scoreColor(result.matchScore)}`}
                    >
                      {result.matchScore}
                      <span className="text-lg text-text-tertiary font-normal">
                        /100
                      </span>
                    </p>
                    <span
                      className={`inline-block px-4 py-1.5 rounded-xl text-xs font-bold border ${verdictBg(result.matchVerdict)}`}
                    >
                      {result.matchVerdict}
                    </span>
                  </GlassCard>

                  {/* Summary */}
                  <GlassCard variants={fadeUp}>
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-3 block">
                      Match Summary
                    </span>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {result.summary || "—"}
                    </p>
                  </GlassCard>

                  {/* Strengths + Gaps side by side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <GlassCard variants={fadeUp}>
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-teal/60 mb-3 block">
                        Matching Strengths
                      </span>
                      <ul className="space-y-2.5">
                        {(result.strengths || []).map((s, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-text-secondary"
                          >
                            <CheckCircle
                              size={14}
                              className="text-teal mt-0.5 shrink-0"
                            />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </GlassCard>

                    <GlassCard variants={fadeUp}>
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber/60 mb-3 block">
                        Gaps
                      </span>
                      <ul className="space-y-2.5">
                        {(result.gaps || []).map((g, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-text-secondary"
                          >
                            <XCircle
                              size={14}
                              className="text-amber mt-0.5 shrink-0"
                            />
                            {g}
                          </li>
                        ))}
                      </ul>
                    </GlassCard>
                  </div>

                  {/* Recommendation */}
                  <GlassCard variants={fadeUp}>
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-3 block">
                      Recommendation
                    </span>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {result.recommendation || "—"}
                    </p>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state */}
            {!result && !error && !loading && (
              <GlassCard className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4">
                  <Briefcase size={28} className="text-text-tertiary" />
                </div>
                <p className="text-sm text-text-tertiary max-w-[280px] mx-auto leading-relaxed">
                  Enter a GitHub username and paste a job description to see how
                  well the candidate matches.
                </p>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
