"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitCompareArrows,
  Github,
  ArrowRight,
  AlertCircle,
  Trophy,
  Minus,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { GlassCard } from "@/components/dashboard/GlassCard";
import { NavHeader } from "@/components/NavHeader";
import { createClient } from "@/lib/supabase/client";

interface CategoryScore {
  category: string;
  candidateA: { score: number; note: string };
  candidateB: { score: number; note: string };
}

interface ComparisonResult {
  summary: string;
  winner: string;
  winnerReason: string;
  categories: CategoryScore[];
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

export default function ComparePage() {
  const [candidateA, setCandidateA] = useState("");
  const [candidateB, setCandidateB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [cached, setCached] = useState(false);

  const handleCompare = useCallback(async () => {
    if (!candidateA.trim() || !candidateB.trim()) return;

    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Please sign in to use the compare feature");
        setLoading(false);
        return;
      }

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      };

      let res = await fetch("/api/compare", {
        method: "POST",
        headers,
        body: JSON.stringify({
          candidateA: candidateA.trim(),
          candidateB: candidateB.trim(),
        }),
      });

      let data = await res.json();

      // If reports are missing, run analysis for each missing candidate, then compare again
      if (res.status === 404 && Array.isArray(data.missingReports)) {
        for (const username of data.missingReports) {
          const analyzeRes = await fetch("/api/analyze", {
            method: "POST",
            headers,
            body: JSON.stringify({ username }),
          });
          if (!analyzeRes.ok) {
            const errData = await analyzeRes.json().catch(() => ({}));
            setError(
              errData.error ||
                `Failed to analyze @${username}. Please try again.`,
            );
            setLoading(false);
            return;
          }
        }
        // Retry compare — both reports now exist; comparison will be saved
        res = await fetch("/api/compare", {
          method: "POST",
          headers,
          body: JSON.stringify({
            candidateA: candidateA.trim(),
            candidateB: candidateB.trim(),
          }),
        });
        data = await res.json();
      }

      if (!res.ok) {
        setError(data.error || "Comparison failed");
        setLoading(false);
        return;
      }

      setResult(data.comparison as ComparisonResult);
      setCached(data.cached || false);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [candidateA, candidateB]);

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
          <GitCompareArrows size={20} className="text-teal" />
          <h1 className="text-xl font-semibold text-text-primary">
            Compare Candidates
          </h1>
        </div>

        <p className="text-sm text-text-secondary mb-8 max-w-2xl">
          Enter two GitHub usernames to generate a side-by-side hiring
          comparison. If either candidate doesn&apos;t have a report yet,
          we&apos;ll run the analysis for them first, then compare and save both
          reports.
        </p>

        {/* Input section */}
        <div className="w-full">
          <GlassCard className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
              {/* Candidate A */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-2 block">
                  Candidate A
                </label>
                <div className="relative">
                  <Github
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
                  />
                  <input
                    type="text"
                    value={candidateA}
                    onChange={(e) => setCandidateA(e.target.value)}
                    placeholder="e.g. torvalds"
                    className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-text-primary placeholder:text-text-tertiary glow-ring transition-all duration-300 focus:border-teal/30 font-mono"
                  />
                </div>
              </div>

              {/* VS divider */}
              <div className="hidden md:flex items-center justify-center">
                <div className="w-10 h-10 rounded-xl bg-teal/10 border border-teal/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-teal">VS</span>
                </div>
              </div>

              {/* Candidate B */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-2 block">
                  Candidate B
                </label>
                <div className="relative">
                  <Github
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
                  />
                  <input
                    type="text"
                    value={candidateB}
                    onChange={(e) => setCandidateB(e.target.value)}
                    placeholder="e.g. gaearon"
                    className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-text-primary placeholder:text-text-tertiary glow-ring transition-all duration-300 focus:border-teal/30 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Compare button */}
            <motion.button
              onClick={handleCompare}
              disabled={loading || !candidateA.trim() || !candidateB.trim()}
              className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden group mt-5"
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
                  Comparing...
                </>
              ) : (
                <>
                  <GitCompareArrows size={16} />
                  Compare Candidates
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </>
              )}
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
            </motion.button>
          </GlassCard>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="flex items-center gap-2 p-4 mb-6 rounded-2xl bg-red/10 border border-red/20"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <AlertCircle size={16} className="text-red shrink-0" />
                <p className="text-sm text-red">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
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
                    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
                  },
                }}
              >
                {/* Cached badge */}
                {cached && (
                  <motion.div
                    className="flex items-center gap-1.5 text-xs text-text-tertiary font-mono"
                    variants={fadeUp}
                  >
                    <CheckCircle size={12} className="text-teal" />
                    Using cached comparison
                  </motion.div>
                )}

                {/* Summary + Winner row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Summary */}
                  <GlassCard variants={fadeUp}>
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-3 block">
                      Executive Summary
                    </span>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {result.summary || "—"}
                    </p>
                  </GlassCard>

                  {/* Winner */}
                  <GlassCard
                    variants={fadeUp}
                    className="text-center py-8 flex flex-col items-center justify-center"
                  >
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-4 block">
                      Winner
                    </span>
                    <div className="flex items-center justify-center gap-3 mb-3">
                      {result.winner === "tie" ? (
                        <Minus size={24} className="text-amber" />
                      ) : (
                        <Trophy size={24} className="text-teal" />
                      )}
                      <span className="text-2xl font-bold text-text-primary">
                        {result.winner === "tie" ? "Tie" : `@${result.winner}`}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary max-w-md mx-auto">
                      {result.winnerReason || "—"}
                    </p>
                  </GlassCard>
                </div>

                {/* Category Breakdown */}
                {result.categories && result.categories.length > 0 && (
                  <GlassCard variants={fadeUp}>
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-4 block">
                      Category Breakdown
                    </span>
                    <div className="space-y-4">
                      {result.categories.map((cat) => (
                        <div key={cat.category}>
                          <p className="text-xs font-medium text-text-primary mb-2">
                            {cat.category}
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            {/* A */}
                            <div
                              className={`rounded-xl p-3 border ${
                                cat.candidateA.score > cat.candidateB.score
                                  ? "bg-teal/5 border-teal/20"
                                  : "bg-white/[0.02] border-white/[0.06]"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-mono text-text-tertiary">
                                  @{candidateA || "A"}
                                </span>
                                <span
                                  className={`text-sm font-bold ${
                                    cat.candidateA.score > cat.candidateB.score
                                      ? "text-teal"
                                      : "text-text-secondary"
                                  }`}
                                >
                                  {cat.candidateA.score}
                                </span>
                              </div>
                              <p className="text-[11px] text-text-tertiary leading-snug">
                                {cat.candidateA.note}
                              </p>
                            </div>

                            {/* B */}
                            <div
                              className={`rounded-xl p-3 border ${
                                cat.candidateB.score > cat.candidateA.score
                                  ? "bg-teal/5 border-teal/20"
                                  : "bg-white/[0.02] border-white/[0.06]"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-mono text-text-tertiary">
                                  @{candidateB || "B"}
                                </span>
                                <span
                                  className={`text-sm font-bold ${
                                    cat.candidateB.score > cat.candidateA.score
                                      ? "text-teal"
                                      : "text-text-secondary"
                                  }`}
                                >
                                  {cat.candidateB.score}
                                </span>
                              </div>
                              <p className="text-[11px] text-text-tertiary leading-snug">
                                {cat.candidateB.note}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {/* Recommendation */}
                <GlassCard variants={fadeUp}>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-3 block">
                    Final Recommendation
                  </span>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {result.recommendation || "—"}
                  </p>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
