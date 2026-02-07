"use client";

import { useState } from "react";
import type { HiringReport } from "@/lib/types/report";

// ═══════════════════════════════════════════════════════════════════════════
// Analyze Page — username form → pipeline → report
// ═══════════════════════════════════════════════════════════════════════════

export default function AnalyzePage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<HiringReport | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = username.trim();
    if (!name) return;

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      setReport(data.report);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── Header / Form ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0a0a]/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center gap-4">
          <a
            href="/"
            className="text-white/50 hover:text-white text-sm mr-auto"
          >
            &larr; Back
          </a>
          <h1 className="text-lg font-semibold tracking-tight text-teal-400">
            GitHub Profile Analyzer
          </h1>
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 ml-auto"
          >
            <input
              type="text"
              placeholder="GitHub username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-sm w-52"
            />
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {loading ? "Analyzing…" : "Analyze"}
            </button>
          </form>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Loading */}
        {loading && <LoadingState />}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && !report && <EmptyState />}

        {/* Report */}
        {report && <ReportView report={report} />}
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="text-5xl mb-4 opacity-30">&#128269;</div>
      <p className="text-white/40 text-lg">
        Enter a GitHub username to generate a hiring-grade analysis.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-10 h-10 border-[3px] border-teal-500/30 border-t-teal-400 rounded-full animate-spin" />
      <p className="text-white/50 text-sm animate-pulse">
        Fetching repos &amp; analyzing code — this may take 30-60 seconds…
      </p>
    </div>
  );
}

// ── Report View ─────────────────────────────────────────────────────────────

function ReportView({ report }: { report: HiringReport }) {
  return (
    <div className="space-y-8 pb-20">
      {/* Profile card */}
      <ProfileCard report={report} />

      {/* Scores grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <ScoreRing label="Overall" value={report.overallScore} size="lg" />
        <ScoreRing label="Code Quality" value={report.scores.codeQuality} />
        <ScoreRing label="Consistency" value={report.scores.consistency} />
        <ScoreRing label="Impact" value={report.scores.impact} />
        <ScoreRing label="Documentation" value={report.scores.documentation} />
        <ScoreRing label="Testing" value={report.scores.testing} />
      </div>

      {/* Executive summary */}
      <GlassCard title="Executive Summary">
        <p className="text-white/70 leading-relaxed">
          {report.executiveSummary}
        </p>
      </GlassCard>

      {/* Strengths / Weaknesses */}
      <div className="grid md:grid-cols-2 gap-4">
        <GlassCard title="Strengths">
          <ul className="space-y-2">
            {report.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-teal-400 mt-0.5">{s.icon ?? "✓"}</span>
                <span className="text-white/80">{s.label}</span>
              </li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard title="Weaknesses">
          <ul className="space-y-2">
            {report.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-orange-400 mt-0.5">{w.icon ?? "!"}</span>
                <span className="text-white/80">{w.label}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>

      {/* Skills */}
      <GlassCard title="Skills">
        <div className="space-y-3">
          {report.skills.map((s, i) => (
            <SkillBar key={i} skill={s.skill} value={s.value} />
          ))}
        </div>
      </GlassCard>

      {/* Activity */}
      <GlassCard title="Commit Activity (est.)">
        <div className="flex items-end gap-1 h-32">
          {report.activity.map((a, i) => {
            const max = Math.max(...report.activity.map((x) => x.commits), 1);
            const pct = (a.commits / max) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm bg-teal-500/60 transition-all"
                  style={{ height: `${Math.max(pct, 4)}%` }}
                />
                <span className="text-[10px] text-white/30 truncate w-full text-center">
                  {a.month.slice(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Highlights */}
      <GlassCard title="Technical Highlights">
        <ul className="list-disc list-inside space-y-1.5 text-sm text-white/70">
          {report.highlights.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
}

// ── Profile Card ────────────────────────────────────────────────────────────

function ProfileCard({ report }: { report: HiringReport }) {
  const verdictColor: Record<string, string> = {
    "Strong Yes": "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    Yes: "bg-green-500/20 text-green-300 border-green-500/40",
    "Lean Yes": "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    No: "bg-red-500/20 text-red-300 border-red-500/40",
  };

  return (
    <div className="rounded-2xl bg-white/3 border border-white/10 p-6 flex flex-col sm:flex-row gap-6 items-start">
      {/* Avatar */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={report.avatarUrl}
        alt={report.username}
        className="w-20 h-20 rounded-full ring-2 ring-teal-500/40"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-semibold">{report.name}</h2>
        <p className="text-white/40 text-sm">@{report.username}</p>
        {report.bio && (
          <p className="mt-1 text-white/60 text-sm">{report.bio}</p>
        )}
        <div className="flex gap-4 mt-2 text-xs text-white/40">
          <span>{report.publicRepos} repos</span>
          <span>{report.followers} followers</span>
        </div>
      </div>

      {/* Verdict */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span
          className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${
            verdictColor[report.verdict] ?? verdictColor["No"]
          }`}
        >
          {report.verdict}
        </span>
        <p className="text-xs text-white/40 text-right max-w-[220px]">
          {report.verdictReasoning}
        </p>
      </div>
    </div>
  );
}

// ── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({
  label,
  value,
  size = "sm",
}: {
  label: string;
  value: number;
  size?: "sm" | "lg";
}) {
  const r = size === "lg" ? 44 : 36;
  const stroke = size === "lg" ? 6 : 5;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value / 100);
  const dim = (r + stroke) * 2;

  const color =
    value >= 70
      ? "stroke-teal-400"
      : value >= 50
        ? "stroke-yellow-400"
        : "stroke-red-400";

  return (
    <div className="rounded-xl bg-white/3 border border-white/10 p-4 flex flex-col items-center gap-2">
      <svg width={dim} height={dim} className="transform -rotate-90">
        <circle
          cx={r + stroke}
          cy={r + stroke}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <circle
          cx={r + stroke}
          cy={r + stroke}
          r={r}
          fill="none"
          className={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-xl font-bold">{value}</span>
      <span className="text-[11px] text-white/40 text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

// ── Skill Bar ───────────────────────────────────────────────────────────────

function SkillBar({ skill, value }: { skill: string; value: number }) {
  const color =
    value >= 70 ? "bg-teal-500" : value >= 50 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-white/60 w-32 shrink-0 truncate">
        {skill}
      </span>
      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-white/40 w-8 text-right">{value}</span>
    </div>
  );
}

// ── Glass Card ──────────────────────────────────────────────────────────────

function GlassCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/3 border border-white/10 p-6">
      <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}
