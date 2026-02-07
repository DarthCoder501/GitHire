"use client";

import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";

interface SkillData {
  skill: string;
  value: number;
}

interface SkillRadarProps {
  data: SkillData[];
}

export function SkillRadar({ data }: SkillRadarProps) {
  return (
    <div className="flex flex-col h-full">
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary mb-2">
        Code Quality Analysis
      </span>
      <motion.div
        className="flex-1 min-h-0"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
            <PolarGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="skill"
              tick={{
                fill: "rgba(240,242,245,0.45)",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
              }}
            />
            <Radar
              dataKey="value"
              stroke="#00E5B0"
              fill="url(#radarGradient)"
              strokeWidth={2}
              dot={{ r: 3, fill: "#00E5B0", strokeWidth: 0 }}
            />
            <defs>
              <radialGradient id="radarGradient">
                <stop offset="0%" stopColor="#00E5B0" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#00E5B0" stopOpacity={0.05} />
              </radialGradient>
            </defs>
          </RadarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
