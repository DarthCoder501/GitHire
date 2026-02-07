"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export function GlassCard({
  children,
  className,
  glowColor,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      className={cn(
        "glass glass-hover rounded-2xl p-6 relative overflow-hidden",
        className,
      )}
      style={
        glowColor
          ? {
              boxShadow: `0 0 0 1px ${glowColor}10 inset, 0 8px 40px rgba(0,0,0,0.45)`,
            }
          : undefined
      }
      {...props}
    >
      {/* Subtle top edge highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      {children}
    </motion.div>
  );
}
