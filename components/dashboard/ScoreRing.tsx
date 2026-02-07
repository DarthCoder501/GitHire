"use client";

import { motion } from "framer-motion";

interface ScoreRingProps {
  score: number; // 0-100
  size?: number;
  label?: string;
}

export function ScoreRing({ score, size = 160, label }: ScoreRingProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const scoreColor =
    score >= 80 ? "var(--teal)" : score >= 60 ? "var(--amber)" : "var(--red)";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background ring */}
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={strokeWidth}
          />
        </svg>

        {/* Animated progress ring */}
        <svg
          width={size}
          height={size}
          className="absolute inset-0 -rotate-90"
          style={{ animation: "score-pulse 3s ease-in-out infinite" }}
        >
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1], delay: 0.6 }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-4xl font-bold tracking-tight"
            style={{ color: scoreColor }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2, duration: 0.5, ease: "backOut" }}
          >
            {score}
          </motion.span>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-secondary mt-0.5">
            / 100
          </span>
        </div>
      </div>
      {label && (
        <span className="text-xs font-mono uppercase tracking-[0.15em] text-text-secondary">
          {label}
        </span>
      )}
    </div>
  );
}
