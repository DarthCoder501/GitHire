"use client";

import { motion } from "framer-motion";
import {
  Zap,
  Code2,
  GitBranch,
  BookOpen,
  Shield,
  Layers,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  architecture: Layers,
  code: Code2,
  git: GitBranch,
  docs: BookOpen,
  security: Shield,
  default: Zap,
};

export interface StrengthItem {
  label: string;
  icon?: string;
}

interface StrengthsListProps {
  items: StrengthItem[];
  title?: string;
  accentColor?: string;
}

export function StrengthsList({
  items,
  title = "Top Strengths",
  accentColor = "var(--teal)",
}: StrengthsListProps) {
  return (
    <div className="flex flex-col h-full">
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-4">
        {title}
      </span>
      <ul className="space-y-3 flex-1">
        {items.map((item, i) => {
          const Icon = iconMap[item.icon || "default"] || iconMap.default;
          return (
            <motion.li
              key={item.label}
              className="flex items-center gap-3 group"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: 0.8 + i * 0.1,
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110"
                style={{
                  background: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${accentColor} 15%, transparent)`,
                }}
              >
                <Icon size={14} style={{ color: accentColor }} />
              </div>
              <span className="text-sm text-text-primary/80 leading-tight">
                {item.label}
              </span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
