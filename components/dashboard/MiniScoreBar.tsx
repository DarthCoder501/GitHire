"use client";

import { motion } from "framer-motion";

interface MiniScoreBarProps {
  label: string;
  score: number;
  maxScore?: number;
  delay?: number;
}

export function MiniScoreBar({
  label,
  score,
  maxScore = 100,
  delay = 0,
}: MiniScoreBarProps) {
  const pct = Math.min(100, (score / maxScore) * 100);
  const color =
    pct >= 80 ? "var(--teal)" : pct >= 60 ? "var(--amber)" : "var(--red)";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className="text-xs font-mono font-semibold" style={{ color }}>
          {score}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{
            delay: 0.8 + delay,
            duration: 1,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      </div>
    </div>
  );
}
