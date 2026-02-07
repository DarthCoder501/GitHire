"use client";

import { motion } from "framer-motion";

export function SkeletonLoader() {
  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="glass rounded-2xl overflow-hidden relative"
          style={{ height: i >= 4 ? 200 : 160 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.08 }}
        >
          {/* Scanning line */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="w-full h-12 scanning-line"
              style={{
                background:
                  "linear-gradient(180deg, transparent 0%, rgba(0,229,176,0.06) 50%, transparent 100%)",
              }}
            />
          </div>

          {/* Skeleton content */}
          <div className="p-6 space-y-3">
            <div className="h-3 w-24 rounded-full bg-white/[0.04] animate-pulse" />
            <div className="h-6 w-16 rounded-full bg-white/[0.03] animate-pulse" />
            <div className="h-2 w-full rounded-full bg-white/[0.02] animate-pulse mt-4" />
            <div className="h-2 w-3/4 rounded-full bg-white/[0.02] animate-pulse" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
