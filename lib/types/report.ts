/**
 * Shared report type — single source of truth for the dashboard,
 * Markdown exporter, and PDF exporter.
 */

export interface StrengthItem {
  label: string;
  icon?: string;
}

export interface SkillEntry {
  skill: string;
  value: number;
}

export interface ActivityEntry {
  month: string;
  commits: number;
}

export interface ScoreBreakdown {
  codeQuality: number;
  consistency: number;
  impact: number;
  documentation: number;
  testing: number;
}

export type Verdict = "Strong Yes" | "Yes" | "Lean Yes" | "No";

export interface HiringReport {
  username: string;
  avatarUrl: string;
  name: string;
  bio: string;
  publicRepos: number;
  followers: number;
  overallScore: number;
  verdict: Verdict;
  verdictReasoning: string;
  /** Recommended role(s) this candidate is best suited for (e.g. Frontend Engineer, Full-stack). */
  recommendedRoles?: string[];
  scores: ScoreBreakdown;
  strengths: StrengthItem[];
  weaknesses: StrengthItem[];
  skills: SkillEntry[];
  activity: ActivityEntry[];
  highlights: string[];
  executiveSummary: string;
}
