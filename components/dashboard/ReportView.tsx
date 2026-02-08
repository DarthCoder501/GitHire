"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { GlassCard } from "@/components/dashboard/GlassCard";
import { ScoreRing } from "@/components/dashboard/ScoreRing";
import { HiringBadge } from "@/components/dashboard/HiringBadge";
import { StrengthsList } from "@/components/dashboard/StrengthsList";
import { SkillRadar } from "@/components/dashboard/SkillRadar";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { MiniScoreBar } from "@/components/dashboard/MiniScoreBar";
import { ExportControls } from "@/components/dashboard/ExportControls";
import type { HiringReport } from "@/lib/types/report";

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

interface ReportViewProps {
  report: HiringReport;
  /** Show export controls above the grid (default true) */
  showExport?: boolean;
}

/**
 * Shared bento-grid report layout used on the home page and Past Searches detail.
 * Renders the full hiring report: score, verdict, strengths, radar, breakdown,
 * activity chart, highlights, growth areas, and optional export bar.
 */
export function ReportView({ report, showExport = true }: ReportViewProps) {
  return (
    <>
      {/* Export controls — above the bento grid */}
      {showExport && (
        <motion.div
          className="flex items-center justify-between mb-4"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary">
            Report Results
          </span>
          <ExportControls report={report} />
        </motion.div>
      )}

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Panel 1 — Overall Score */}
        <GlassCard
          className="flex flex-col items-center justify-center py-8"
          variants={fadeUp}
        >
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-4">
            Overall Hiring Score
          </span>
          <ScoreRing score={report.overallScore} size={170} />
        </GlassCard>

        {/* Panel 2 — Hiring Recommendation */}
        <GlassCard className="py-8" variants={fadeUp}>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-2 block text-center">
            Hiring Decision
          </span>
          <HiringBadge
            verdict={report.verdict}
            reasoning={report.verdictReasoning}
          />
        </GlassCard>

        {/* Panel 3 — Top Strengths */}
        <GlassCard variants={fadeUp}>
          <StrengthsList
            items={report.strengths}
            title="Top Strengths"
            accentColor="var(--teal)"
          />
        </GlassCard>

        {/* Panel 4 — Code Quality Radar */}
        <GlassCard className="min-h-[260px]" variants={fadeUp}>
          <SkillRadar data={report.skills} />
        </GlassCard>

        {/* Panel 5 — Score Breakdown (full width) */}
        <GlassCard className="md:col-span-2" variants={fadeUp}>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-4 block">
            Score Breakdown
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
            <MiniScoreBar
              label="Code Quality"
              score={report.scores.codeQuality}
              delay={0}
            />
            <MiniScoreBar
              label="Consistency"
              score={report.scores.consistency}
              delay={0.1}
            />
            <MiniScoreBar
              label="Impact"
              score={report.scores.impact}
              delay={0.2}
            />
            <MiniScoreBar
              label="Documentation"
              score={report.scores.documentation}
              delay={0.3}
            />
            <MiniScoreBar
              label="Testing"
              score={report.scores.testing}
              delay={0.4}
            />
          </div>
        </GlassCard>

        {/* Panel 6 — Activity Chart (full width) */}
        <GlassCard className="md:col-span-2 min-h-[240px]" variants={fadeUp}>
          <ActivityChart data={report.activity} />
        </GlassCard>

        {/* Panel 7 — Technical Highlights */}
        <GlassCard variants={fadeUp}>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-4 block">
            Technical Highlights
          </span>
          <ul className="space-y-3">
            {report.highlights.map((h, i) => (
              <motion.li
                key={h}
                className="flex items-start gap-2.5 text-sm text-text-secondary leading-relaxed"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 + i * 0.12 }}
              >
                <TrendingUp size={14} className="text-teal mt-0.5 shrink-0" />
                {h}
              </motion.li>
            ))}
          </ul>
        </GlassCard>

        {/* Panel 8 — Growth Areas */}
        <GlassCard variants={fadeUp}>
          <StrengthsList
            items={report.weaknesses}
            title="Growth Areas"
            accentColor="var(--amber)"
          />
        </GlassCard>
      </motion.div>
    </>
  );
}
