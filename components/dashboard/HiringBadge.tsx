"use client";

import { motion } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

type Verdict = "Strong Yes" | "Yes" | "Lean Yes" | "No";

const verdictConfig: Record<
  Verdict,
  {
    color: string;
    bg: string;
    border: string;
    icon: LucideIcon;
    glow: string;
  }
> = {
  "Strong Yes": {
    color: "var(--green)",
    bg: "rgba(0, 255, 65, 0.06)",
    border: "rgba(0, 255, 65, 0.2)",
    icon: Sparkles,
    glow: "0 0 40px rgba(0, 255, 65, 0.15)",
  },
  Yes: {
    color: "var(--teal)",
    bg: "rgba(0, 229, 176, 0.06)",
    border: "rgba(0, 229, 176, 0.2)",
    icon: CheckCircle,
    glow: "0 0 40px rgba(0, 229, 176, 0.12)",
  },
  "Lean Yes": {
    color: "var(--amber)",
    bg: "rgba(255, 190, 11, 0.06)",
    border: "rgba(255, 190, 11, 0.2)",
    icon: AlertTriangle,
    glow: "0 0 40px rgba(255, 190, 11, 0.1)",
  },
  No: {
    color: "var(--red)",
    bg: "rgba(255, 77, 106, 0.06)",
    border: "rgba(255, 77, 106, 0.2)",
    icon: XCircle,
    glow: "0 0 40px rgba(255, 77, 106, 0.1)",
  },
};

interface HiringBadgeProps {
  verdict: Verdict;
  reasoning?: string;
}

export function HiringBadge({ verdict, reasoning }: HiringBadgeProps) {
  const config = verdictConfig[verdict];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <motion.div
        className="rounded-2xl px-6 py-3 flex items-center gap-3"
        style={{
          background: config.bg,
          border: `1px solid ${config.border}`,
          boxShadow: config.glow,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 200, damping: 15 }}
      >
        <Icon size={22} style={{ color: config.color }} />
        <span
          className="text-2xl font-bold tracking-tight"
          style={{ color: config.color }}
        >
          {verdict}
        </span>
      </motion.div>

      <motion.p
        className="text-xs text-center leading-relaxed max-w-[220px] text-text-secondary"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
      >
        {reasoning}
      </motion.p>
    </div>
  );
}
