"use client";

import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface ActivityData {
  month: string;
  commits: number;
}

interface ActivityChartProps {
  data: ActivityData[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs">
      <p className="text-text-secondary font-mono">{label}</p>
      <p className="text-teal font-bold">{payload[0].value} commits</p>
    </div>
  );
}

export function ActivityChart({ data }: ActivityChartProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-text-tertiary">
          Commit Velocity (12mo)
        </span>
        <span className="text-[10px] font-mono text-teal">
          {data.reduce((s, d) => s + d.commits, 0).toLocaleString()} total
        </span>
      </div>
      <motion.div
        className="flex-1 min-h-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="commitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00E5B0" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#00E5B0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="rgba(255,255,255,0.03)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: "rgba(240,242,245,0.3)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "rgba(240,242,245,0.2)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="commits"
              stroke="#00E5B0"
              strokeWidth={2}
              fill="url(#commitGradient)"
              dot={false}
              activeDot={{
                r: 4,
                fill: "#00E5B0",
                stroke: "var(--void-black)",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
